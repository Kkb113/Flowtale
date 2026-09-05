// Stop writers before applying. Preserve per-publication derivatives before denying common originals.
const { createHash } = require('node:crypto');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand,
  GetBucketPolicyCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const absent = error => ['NoSuchKey', 'NotFound', 'NoSuchBucketPolicy'].includes(error.name)
  || error.$metadata?.httpStatusCode === 404;
const uuidFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[A-Za-z0-9]+)?$/i;

async function migrateCommonAssets({ s3, publicBucket, privateBucket, root, profile, publicBaseUrl, apply = false, assetKind = 'common' }) {
  if (!['common', 'proxy'].includes(assetKind)) throw new Error('Unknown asset kind');
  const namespace = assetKind === 'common' ? 'cmn' : 'proxy_asset';
  if (!publicBucket || !privateBucket || publicBucket === privateBucket
      || ![root, profile].every(value => /^[A-Za-z0-9_-]+$/.test(value))) throw new Error('Invalid migration scope');
  const base = new URL(`${publicBaseUrl.replace(/\/$/, '')}/`);
  if (!['http:', 'https:'].includes(base.protocol) || base.search || base.hash || base.username || base.password) throw new Error('Invalid public base URL');
  const report = { dryRun: !apply, privateCopies: 0, documents: 0, derivatives: 0, removed: 0,
    cdnInvalidationPaths: [`/${root}/${namespace}/*`, `/${root}/ptour/*`, `/${root}/tour/*`, `/${root}/srn/*`, `/${root}/pdh/*`] };
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (absent(error)) return null; throw error; }
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error(`Object exceeds limit: ${Key}`);
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error(`Object exceeds limit: ${Key}`);
        chunks.push(Buffer.from(chunk));
      }
      return { bytes: Buffer.concat(chunks), type: response.ContentType || 'application/octet-stream' };
    } finally { response.Body?.destroy?.(); }
  };
  async function* list(Prefix) {
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: publicBucket, Prefix, ContinuationToken }));
      for (const object of page.Contents || []) {
        if (!object.Key.startsWith(Prefix)) throw new Error('Unrelated storage object');
        yield object.Key;
      }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Pagination did not advance');
      ContinuationToken = next;
    } while (ContinuationToken);
  }
  const put = async (Bucket, Key, value, cache) => {
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: value.bytes, ContentType: value.type, CacheControl: cache }));
    const stored = await read(Bucket, Key);
    if (!stored || digest(stored.bytes) !== digest(value.bytes) || stored.type !== value.type) throw new Error(`Verification failed: ${Key}`);
  };
  const originals = new Map();
  for await (const key of list(`${root}/${namespace}/`)) {
    const filename = key.slice(`${root}/${namespace}/`.length);
    if (assetKind === 'common' && filename.startsWith('ph/')) continue; // Bundled non-sensitive placeholders are public application assets.
    if (!uuidFile.test(filename)) throw new Error(`Unknown common namespace needs review: ${key}`);
    const backup = await read(privateBucket, `${profile}/${key}`);
    let value;
    try { value = await read(publicBucket, key); }
    catch (error) {
      if (error.name !== 'AccessDenied' && error.$metadata?.httpStatusCode !== 403) throw error;
      value = backup;
    }
    if (!value) throw new Error(`Missing original: ${key}`);
    if (backup && digest(backup.bytes) !== digest(value.bytes)) throw new Error(`Private original conflict: ${key}`);
    originals.set(filename, { key, value, backup });
  }
  const documents = [];
  const derivatives = new Map();
  const obsolete = [];
  const commonBase = new URL(`${root}/${namespace}/`, base).href;
  const urlPattern = new RegExp(commonBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([A-Za-z0-9_.-]+)', 'g');
  const blockedByVersion = new Map();
  if (assetKind === 'proxy') for await (const key of list(`${root}/ptour/assets-`)) {
    const version = new RegExp(`^${root}/ptour/assets-([^/]+)/([0-9]+)/`).exec(key);
    if (!version || !key.endsWith('/index.json')) continue;
    const stored = await read(publicBucket, key);
    const doc = JSON.parse(stored.bytes.toString('utf8'));
    if (doc.redacted && !Array.isArray(doc.redactedAssetKeys) && stored.bytes.toString().includes('/proxy_asset/')) {
      throw new Error(`Historical styled redaction requires review before asset migration: ${key}`);
    }
    const id = `${version[1]}/${version[2]}`;
    const blocked = blockedByVersion.get(id) || new Set();
    for (const filename of doc.redactedAssetKeys || []) if (uuidFile.test(filename) || /^[0-9a-f]{64}$/.test(filename)) blocked.add(filename);
    blockedByVersion.set(id, blocked);
  }
  for await (const key of list(`${root}/`)) {
    if (!key.endsWith('.json') || key.startsWith(`${root}/cmn/`) || key.startsWith(`${root}/proxy_asset/`)) continue;
    if (new RegExp(`^${root}/srn/[^/]+/\\d+_edits\\.json$`).test(key)) {
      const value = await read(publicBucket, key);
      if (value) obsolete.push({ key, value });
      continue;
    }
    if (!new RegExp(`^${root}/(ptour|tour|pdh|dh)/`).test(key)) continue;
    const previous = await read(publicBucket, key);
    if (!previous) throw new Error(`Document disappeared: ${key}`);
    const doc = JSON.parse(previous.bytes.toString('utf8'));
    const tour = new RegExp(`^${root}/tour/([A-Za-z0-9_-]+)/(\\d+)_`).exec(key);
    const snapshot = new RegExp(`^${root}/ptour/assets-([^/]+)/([0-9]+)/`).exec(key);
    const metadataVersion = /^(\d+)_index\.json$/.exec(doc.data?.pubDataFileName || '');
    const identity = snapshot ? `${snapshot[1]}/${snapshot[2]}` : tour ? `${tour[1]}/${tour[2]}`
      : metadataVersion ? `${doc.data.assetPrefixHash}/${metadataVersion[1]}` : '';
    const blocked = blockedByVersion.get(identity) || new Set();
    const stripInline = text => text.replace(/data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+/g,
      image => blocked.has(digest(Buffer.from(image))) ? 'data:,' : image);
    const targetPrefix = tour ? `${root}/ptour/assets-${tour[1]}/${tour[2]}/binary/`
      : `${key.slice(0, key.lastIndexOf('/') + 1)}binary/`;
    const replacement = async filename => {
      if (!uuidFile.test(filename)) return null;
      if (blocked.has(filename)) return 'data:,';
      const original = originals.get(filename)?.value || await read(privateBucket, `${profile}/${root}/${namespace}/${filename}`);
      if (!original) throw new Error(`Referenced thumbnail is missing: ${filename}`);
      const target = `${targetPrefix}${digest(original.bytes)}`;
      if (derivatives.has(target)) return new URL(target, base).href;
      derivatives.set(target, original);
      if (assetKind === 'proxy' && original.type.toLowerCase().startsWith('text/css')) {
        let css = original.bytes.toString('utf8');
        for (const match of [...css.matchAll(urlPattern)]) {
          const nested = await replacement(match[1]);
          if (nested) css = css.split(match[0]).join(nested);
        }
        derivatives.set(target, { bytes: Buffer.from(stripInline(css)), type: original.type });
      }
      return new URL(target, base).href;
    };
    const rewrite = async (value, property = '') => {
      if (typeof value === 'string') {
        if (assetKind === 'common' && property === 'thumbnail' && uuidFile.test(value)) return await replacement(value);
        const matches = [...value.matchAll(urlPattern)];
        let result = value;
        for (const match of matches) {
          const replaced = await replacement(match[1]);
          if (replaced) result = result.split(match[0]).join(replaced);
        }
        return stripInline(result);
      }
      if (Array.isArray(value)) return await Promise.all(value.map(item => rewrite(item)));
      if (value && typeof value === 'object') for (const name of Object.keys(value)) {
        value[name] = assetKind === 'proxy' && name === 'proxyUrlMap' ? {} : await rewrite(value[name], name);
      }
      return value;
    };
    const rewritten = Buffer.from(JSON.stringify(await rewrite(doc)));
    if (JSON.stringify(JSON.parse(previous.bytes.toString())) !== rewritten.toString()) {
      documents.push({ key, previous, value: { bytes: rewritten, type: 'application/json' } });
    }
  }
  report.privateCopies = [...originals.values()].filter(item => !item.backup).length;
  report.documents = documents.length;
  report.derivatives = derivatives.size;
  if (!apply) return report;
  for (const item of originals.values()) if (!item.backup) await put(privateBucket, `${profile}/${item.key}`, item.value, 'no-store');
  for (const item of [...documents.map(doc => ({ key: doc.key, value: doc.previous })), ...obsolete]) {
    await put(privateBucket, `migration/common-assets/${digest(item.value.bytes)}/${item.key}`, item.value, 'no-store');
  }
  for (const [key, value] of derivatives) await put(publicBucket, key, value, 'max-age=2592000');
  for (const item of documents) await put(publicBucket, item.key, item.value, 'max-age=2592000');
  let policy = { Version: '2012-10-17', Statement: [] };
  try { policy = JSON.parse((await s3.send(new GetBucketPolicyCommand({ Bucket: publicBucket }))).Policy); }
  catch (error) { if (!absent(error)) throw error; }
  if (!Array.isArray(policy.Statement)) throw new Error('Invalid existing bucket policy');
  const Sid = `FablePrivate${namespace}${digest(Buffer.from(root)).slice(0, 12)}`;
  policy.Statement = policy.Statement.filter(statement => statement.Sid !== Sid);
  policy.Statement.push({ Sid, Effect: 'Deny', Principal: '*', Action: 's3:GetObject',
    Resource: [`arn:aws:s3:::${publicBucket}/${root}/${namespace}/????????-????-????-????-????????????*`] });
  await s3.send(new PutBucketPolicyCommand({ Bucket: publicBucket, Policy: JSON.stringify(policy) }));
  for (const item of [...originals.values(), ...obsolete]) {
    await s3.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: item.key }));
    const remaining = await s3.send(new ListObjectsV2Command({ Bucket: publicBucket, Prefix: item.key }));
    if (remaining.Contents?.some(object => object.Key === item.key)) throw new Error(`Deletion failed: ${item.key}`);
    report.removed++;
  }
  return report;
}

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=') || true];
  }));
  if (args.apply && !args['maintenance-confirmed']) throw new Error('Stop writers and pass --maintenance-confirmed');
  const s3 = new S3Client({ region: args.region || 'ap-south-1', endpoint: args.endpoint, forcePathStyle: !!args.endpoint,
    maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  migrateCommonAssets({ s3, publicBucket: args['public-bucket'], privateBucket: args['private-bucket'], root: args.root,
    profile: args.profile, publicBaseUrl: args['public-base-url'], apply: !!args.apply, assetKind: args.kind || 'common' })
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => s3.destroy());
}
module.exports = { migrateCommonAssets };
