// Maintenance-only: preserve historical publication bytes before revoking original image URLs.
const { createHash } = require('node:crypto');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand,
  GetBucketPolicyCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const missing = error => ['NoSuchKey', 'NotFound', 'NoSuchBucketPolicy'].includes(error.name)
  || error.$metadata?.httpStatusCode === 404;

async function migrateSourceImages({ s3, publicBucket, privateBucket, root, profile, publicBaseUrl, apply = false }) {
  if (!publicBucket || !privateBucket || publicBucket === privateBucket
      || ![root, profile].every(value => /^[A-Za-z0-9_-]+$/.test(value))) throw new Error('Invalid migration scope');
  const base = new URL(`${publicBaseUrl.replace(/\/$/, '')}/`);
  if (!['http:', 'https:'].includes(base.protocol) || base.search || base.hash || base.username || base.password) {
    throw new Error('Specify the public bucket/CDN base URL, excluding the root prefix');
  }
  const report = { dryRun: !apply, privateCopies: 0, publications: 0, deleted: 0,
    cdnInvalidationPaths: [`/${root}/srn/*`, `/${root}/ptour/*`] };
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (missing(error)) return null; throw error; }
    let size = 0;
    const chunks = [];
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error(`Image exceeds input limit: ${Key}`);
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error(`Image exceeds input limit: ${Key}`);
        chunks.push(Buffer.from(chunk));
      }
      return { bytes: Buffer.concat(chunks), type: response.ContentType || 'application/octet-stream' };
    } finally { response.Body?.destroy?.(); }
  };
  async function* keys(Prefix) {
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: publicBucket, Prefix, ContinuationToken }));
      for (const item of page.Contents || []) {
        if (!item.Key.startsWith(Prefix)) throw new Error('Storage returned an unrelated key');
        yield item.Key;
      }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Storage pagination did not advance');
      ContinuationToken = next;
    } while (ContinuationToken);
  }
  const put = async (Bucket, Key, value, cache) => {
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: value.bytes, ContentType: value.type, CacheControl: cache }));
    const stored = await read(Bucket, Key);
    if (!stored || hash(stored.bytes) !== hash(value.bytes) || stored.type !== value.type) {
      throw new Error(`Copy verification failed: ${Key}`);
    }
  };
  // Preflight every original and publication without mutating either bucket.
  const originals = [];
  for await (const key of keys(`${root}/srn/`)) {
    if (!new RegExp(`^${root}/srn/[A-Za-z0-9_-]+/index\\.img$`).test(key)) continue;
    let source;
    try { source = await read(publicBucket, key); }
    catch (error) {
      if (error.$metadata?.httpStatusCode !== 403 && error.name !== 'AccessDenied') throw error;
      source = await read(privateBucket, `${profile}/${key}`);
    }
    if (!source) throw new Error(`Original disappeared: ${key}`);
    const existing = await read(privateBucket, `${profile}/${key}`);
    if (existing && hash(existing.bytes) !== hash(source.bytes)) throw new Error(`Private image conflict: ${key}`);
    originals.push({ key, source, existing });
  }
  const publications = [];
  for await (const key of keys(`${root}/ptour/assets-`)) {
    if (!/\/\d+\/screens\/[A-Za-z0-9_-]+\/index\.json$/.test(key)) continue;
    const previous = await read(publicBucket, key);
    const doc = JSON.parse(previous.bytes.toString('utf8'));
    const image = doc.docTree?.chldrn?.[2]?.chldrn?.[1];
    if (image?.name !== 'img' || typeof image.attrs?.src !== 'string') continue;
    const target = key.replace(/index\.json$/, 'index.img');
    const targetUrl = new URL(target, base).href;
    if (image.attrs.src === targetUrl) {
      if (!await read(publicBucket, target)) throw new Error(`Published image is missing: ${target}`);
      continue;
    }
    const sourceUrl = new URL(image.attrs.src);
    if (sourceUrl.origin !== base.origin || !sourceUrl.pathname.startsWith(base.pathname)) continue;
    const sourceKey = sourceUrl.pathname.slice(base.pathname.length);
    if (!new RegExp(`^${root}/srn/[A-Za-z0-9_-]+/index\\.img$`).test(sourceKey)) continue;
    const bytes = await read(publicBucket, sourceKey) || await read(privateBucket, `${profile}/${sourceKey}`);
    if (!bytes) throw new Error(`Historical image is missing: ${sourceKey}`);
    // The historical document's source may belong to its parent; preserve that exact image.
    image.attrs.src = targetUrl;
    delete image.attrs.srcset;
    publications.push({ key, previous, target, image: bytes,
      document: { bytes: Buffer.from(JSON.stringify(doc)), type: 'application/json' } });
  }
  report.privateCopies = originals.filter(item => !item.existing).length;
  report.publications = publications.length;
  if (!apply) return report;
  for (const item of originals) {
    if (!item.existing) await put(privateBucket, `${profile}/${item.key}`, item.source, 'no-store');
  }
  for (const item of publications) {
    await put(privateBucket, `migration/source-images/${hash(item.previous.bytes)}/${item.key}`, item.previous, 'no-store');
    await put(publicBucket, item.target, item.image, 'max-age=2592000');
    await put(publicBucket, item.key, item.document, 'max-age=2592000');
  }
  // All independent public copies and private originals exist before denying/deleting old sources.
  let policy = { Version: '2012-10-17', Statement: [] };
  try { policy = JSON.parse((await s3.send(new GetBucketPolicyCommand({ Bucket: publicBucket }))).Policy); }
  catch (error) { if (!missing(error)) throw error; }
  if (!Array.isArray(policy.Statement)) throw new Error('Existing bucket policy needs review');
  const Sid = `FablePrivateSourceImages${hash(Buffer.from(root)).slice(0, 12)}`;
  policy.Statement = policy.Statement.filter(statement => statement.Sid !== Sid);
  policy.Statement.push({ Sid, Effect: 'Deny', Principal: '*', Action: 's3:GetObject',
    Resource: [`arn:aws:s3:::${publicBucket}/${root}/srn/*/index.img`] });
  await s3.send(new PutBucketPolicyCommand({ Bucket: publicBucket, Policy: JSON.stringify(policy) }));
  for (const item of originals) {
    await s3.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: item.key }));
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: publicBucket, Prefix: item.key }));
    if (listed.Contents?.some(value => value.Key === item.key)) throw new Error(`Original deletion failed: ${item.key}`);
    report.deleted++;
  }
  return report;
}

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=') || true];
  }));
  if (args.apply && !args['maintenance-confirmed']) throw new Error('Stop all writers and pass --maintenance-confirmed');
  const s3 = new S3Client({ region: args.region || 'ap-south-1', endpoint: args.endpoint,
    forcePathStyle: !!args.endpoint, maxAttempts: 2,
    requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  migrateSourceImages({ s3, publicBucket: args['public-bucket'], privateBucket: args['private-bucket'],
    root: args.root, profile: args.profile, publicBaseUrl: args['public-base-url'], apply: !!args.apply })
    .then(report => console.log(JSON.stringify(report)))
    .catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => s3.destroy());
}
module.exports = { migrateSourceImages };
