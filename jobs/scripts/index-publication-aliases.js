// One-time, repeatable backfill before enabling publication cleanup. Application writers must be stopped.
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createHash } = require('node:crypto');
const segment = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
const missing = error => error.$metadata?.httpStatusCode === 404 || ['NoSuchKey', 'NotFound'].includes(error.name);

async function indexPublicationAliases({ s3, sourceBucket, privateBucket, root, profile, apply = false }) {
  if (!sourceBucket || !privateBucket || sourceBucket === privateBucket || !segment(root) || !segment(profile)) {
    throw new Error('Distinct buckets and valid root/profile segments are required');
  }
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (missing(error)) return null; throw error; }
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error('Publication metadata exceeds the supported limit');
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error('Publication metadata exceeds the supported limit');
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } finally { response.Body?.destroy?.(); }
  };
  const registries = new Map();
  for (const [published, draft] of [['ptour', 'tour'], ['pdh', 'dh']]) {
    const Prefix = `${root}/${published}/`;
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: sourceBucket, Prefix, ContinuationToken }));
      for (const object of page.Contents || []) {
        const key = object.Key;
        if (!key?.startsWith(Prefix) || !key.endsWith('/0_d_data.json')) continue;
        const alias = key.slice(Prefix.length, -'/0_d_data.json'.length);
        const metadata = JSON.parse((await read(sourceBucket, key))?.toString('utf8') || 'null');
        const hash = metadata?.data?.assetPrefixHash;
        if (!segment(alias) || !segment(hash)) throw new Error(`Invalid published identity: ${key}`);
        const registry = `${profile}/${root}/${draft}/${hash}/publication-aliases.json`;
        if (!registries.has(registry)) registries.set(registry, new Set());
        registries.get(registry).add(alias);
      }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Storage pagination did not advance');
      ContinuationToken = next;
    } while (ContinuationToken);
  }
  const writes = [];
  for (const [Key, aliases] of registries) {
    const previous = await read(privateBucket, Key);
    const saved = previous ? JSON.parse(previous.toString('utf8')) : [];
    if (!Array.isArray(saved) || saved.some(alias => !segment(alias))) throw new Error(`Invalid alias registry: ${Key}`);
    saved.forEach(alias => aliases.add(alias));
    const Body = Buffer.from(JSON.stringify([...aliases].sort()));
    if (!previous || !Body.equals(previous)) writes.push({ Key, Body });
  }
  // Complete discovery and validation before changing any registry.
  if (apply) {
    for (const { Key, Body } of writes) {
      await s3.send(new PutObjectCommand({ Bucket: privateBucket, Key, Body, ContentType: 'application/json', CacheControl: 'no-store' }));
      const actual = await read(privateBucket, Key);
      if (!actual || !createHash('sha256').update(actual).digest().equals(createHash('sha256').update(Body).digest())) {
        throw new Error(`Alias registry verification failed: ${Key}`);
      }
    }
  }
  return { dryRun: !apply, publications: registries.size, changedRegistries: writes.length };
}

module.exports = { indexPublicationAliases };
if (require.main === module) {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--maintenance-confirmed')) throw new Error('Stop application writers and confirm maintenance before applying');
  const s3 = new S3Client({ region: process.env.AWS_S3_REGION || 'ap-south-1',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
    maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  indexPublicationAliases({ s3, sourceBucket: process.env.ASSET_BUCKET_NAME, privateBucket: process.env.PVT_ASSET_BUCKET_NAME,
    root: process.env.FABLE_ASSET_ROOT, profile: process.env.FABLE_PROFILE, apply })
    .then(report => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
    .finally(() => s3.destroy());
}
