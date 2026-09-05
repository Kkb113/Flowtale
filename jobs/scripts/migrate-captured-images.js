// Maintenance repair restricted to proven capture originals, never arbitrary user media.
const { createHash } = require('node:crypto');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function migrateCapturedImages({ s3, publicBucket, privateBucket, root, profile, publicBaseUrl, apply = false, now = Date.now() }) {
  if (!publicBucket || !privateBucket || publicBucket === privateBucket || ![root, profile].every(v => /^[\w-]+$/.test(v))) throw new Error('Invalid scope');
  const base = new URL(`${publicBaseUrl.replace(/\/$/, '')}/`);
  if (!/^https?:$/.test(base.protocol) || base.search || base.hash || base.username || base.password) throw new Error('Invalid asset URL');
  const prefix = `migration/captured-images/${profile}/${root}/`;
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null; throw error; }
    const chunks = []; let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error('Object exceeds 64 MiB');
      for await (const chunk of response.Body) { size += chunk.length; if (size > 64 * 1024 * 1024) throw new Error('Object exceeds 64 MiB'); chunks.push(Buffer.from(chunk)); }
      return { bytes: Buffer.concat(chunks), type: response.ContentType || 'application/octet-stream' };
    } finally { response.Body?.destroy?.(); }
  };
  const put = async (Bucket, Key, value) => {
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: value.bytes, ContentType: value.type, CacheControl: 'no-store' }));
    const check = await read(Bucket, Key);
    if (!check || hash(check.bytes) !== hash(value.bytes) || check.type !== value.type) throw new Error('Write verification failed');
  };
  const list = async (Bucket, Prefix) => {
    const result = []; let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }));
      for (const object of page.Contents || []) { if (!object.Key.startsWith(Prefix)) throw new Error('Invalid listing'); result.push(object); }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Pagination stalled');
      ContinuationToken = next;
    } while (ContinuationToken);
    return result;
  };
  const saved = await read(privateBucket, `${prefix}plan.json`);
  let plan = saved && JSON.parse(saved.bytes.toString());
  if (plan && (plan.publicBucket !== publicBucket || plan.privateBucket !== privateBucket || plan.base !== base.href)) throw new Error('Plan scope mismatch');
  if (plan?.complete) return { complete: true, originals: plan.originals.length, documents: plan.documents.length, changed: 0 };
  if (!plan) {
    const documents = [];
    for (const [bucket, path] of [[privateBucket, `${profile}/${root}/`], [publicBucket, `${root}/`]]) {
      for (const object of await list(bucket, path)) {
        if (!object.Key.endsWith('.json') || !/\/(srn|tour|ptour|dh|pdh)\//.test(object.Key)) continue;
        const stored = await read(bucket, object.Key);
        if (stored) documents.push({ bucket, key: object.Key, stored, doc: JSON.parse(stored.bytes.toString()) });
      }
    }
    const references = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.props?.origHref === 'string' && value.props.origHref.startsWith('blob:')) {
        for (const url of Object.values(value.attrs || {})) if (typeof url === 'string' && url.startsWith(new URL(`${root}/usr/org/`, base).href)) references.add(url);
      }
      for (const child of Object.values(value)) visit(child);
    };
    for (const item of documents) if (item.bucket === privateBucket && item.key.endsWith('/index.json') && item.key.includes('/srn/')) visit(item.doc);
    // Old AI screenshot duplicates are byte-identical to the capture thumbnail already in private Common storage.
    const thumbnails = new Set();
    for (const object of await list(privateBucket, `${profile}/${root}/cmn/`)) {
      const stored = await read(privateBucket, object.Key);
      if (stored && /^image\/(png|jpeg)/.test(stored.type)) thumbnails.add(hash(stored.bytes));
    }
    const originals = []; const replacements = new Map();
    for (const object of await list(publicBucket, `${root}/usr/org/`)) {
      if (object.Size > 8 * 1024 * 1024) continue;
      const url = new URL(object.Key, base).href;
      const stored = await read(publicBucket, object.Key);
      if (!stored || (!references.has(url) && !thumbnails.has(hash(stored.bytes)))) continue;
      if (!/^image\/(png|jpeg)(?:;|$)/.test(stored.type)) throw new Error('Captured original has unsupported image type');
      if (!object.LastModified || now - new Date(object.LastModified).getTime() < 11 * 60 * 1000) throw new Error('Wait eleven minutes after the last public upload before repairing captures');
      const data = `data:${stored.type.split(';')[0]};base64,${stored.bytes.toString('base64')}`;
      replacements.set(url, data);
      originals.push({ key: object.Key, digest: hash(stored.bytes), backup: `${prefix}original/${object.Key}`, stored });
    }
    const rewrite = value => {
      if (typeof value === 'string') {
        // Replace complete URLs only; query-bearing unknown variants require review, not a guessed rewrite.
        for (const [url, data] of replacements) value = value.split(url).join(data);
        return value;
      }
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]));
      return value;
    };
    const changed = documents.map(item => ({ ...item, next: Buffer.from(JSON.stringify(rewrite(item.doc))) }))
      .filter(item => JSON.stringify(item.doc) !== item.next.toString());
    if (!apply) return { dryRun: true, originals: originals.length, documents: changed.length };
    // Stage every original and replacement before saving the durable plan or changing any live object.
    for (const item of originals) await put(privateBucket, item.backup, item.stored);
    const entries = [];
    for (const item of changed) {
      const id = hash(Buffer.from(`${item.bucket}/${item.key}`));
      const backup = `${prefix}before/${id}`; const stage = `${prefix}after/${id}`;
      await put(privateBucket, backup, item.stored);
      await put(privateBucket, stage, { bytes: item.next, type: item.stored.type });
      entries.push({ bucket: item.bucket, key: item.key, backup, stage, before: hash(item.stored.bytes), after: hash(item.next) });
    }
    plan = { publicBucket, privateBucket, base: base.href, originals: originals.map(({ stored, ...item }) => item), documents: entries, complete: false };
    await put(privateBucket, `${prefix}plan.json`, { bytes: Buffer.from(JSON.stringify(plan)), type: 'application/json' });
  }
  if (!apply) return { dryRun: true, originals: plan.originals.length, documents: plan.documents.length, resume: true };
  for (const item of plan.documents) {
    const live = await read(item.bucket, item.key);
    if (!live || ![item.before, item.after].includes(hash(live.bytes))) throw new Error('Document changed during maintenance');
    const next = await read(privateBucket, item.stage);
    if (!next || hash(next.bytes) !== item.after) throw new Error('Invalid staged replacement');
    await put(item.bucket, item.key, next);
  }
  for (const item of plan.originals) {
    const backup = await read(privateBucket, item.backup);
    const live = await read(publicBucket, item.key);
    if (!backup || hash(backup.bytes) !== item.digest || (live && hash(live.bytes) !== item.digest)) throw new Error('Original changed or backup missing');
    await s3.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: item.key }));
    if (await read(publicBucket, item.key)) throw new Error('Original deletion failed');
  }
  plan.complete = true;
  await put(privateBucket, `${prefix}plan.json`, { bytes: Buffer.from(JSON.stringify(plan)), type: 'application/json' });
  return { complete: true, originals: plan.originals.length, documents: plan.documents.length, changed: plan.documents.length,
    cdnInvalidationPaths: [`/${root}/usr/org/*`, `/${root}/ptour/*`, `/${root}/tour/*`] };
}
if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=') || true]; }));
  if (args.apply && !args['maintenance-confirmed']) throw new Error('Stop writers and pass --maintenance-confirmed');
  const s3 = new S3Client({ region: args.region || 'ap-south-1', endpoint: args.endpoint, forcePathStyle: !!args.endpoint, maxAttempts: 2 });
  migrateCapturedImages({ s3, publicBucket: args['public-bucket'], privateBucket: args['private-bucket'], root: args.root,
    profile: args.profile, publicBaseUrl: args['public-base-url'], apply: !!args.apply })
    .then(value => console.log(JSON.stringify(value))).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => s3.destroy());
}
module.exports = { migrateCapturedImages };
