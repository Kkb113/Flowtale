// Run with application writers stopped. Dry run is the default; see api/draft-storage-migration.md.
const { createHash } = require('node:crypto');
const { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand,
  PutObjectCommand, DeleteObjectCommand, GetBucketPolicyCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const segment = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
const missing = error => error.$metadata?.httpStatusCode === 404 || error.name === 'NoSuchKey' || error.name === 'NotFound';
const draftDocumentDenyStatement = (bucket, root) => ({
  Sid: `FablePrivateDraftDocuments${digest(Buffer.from(root)).slice(0, 12)}`,
  Effect: 'Deny', Principal: '*', Action: 's3:GetObject',
  Resource: ['tour/*/index.json', 'tour/*/edits.json', 'tour/*/loader.json', 'srn/*/index.json',
    'srn/*/edits.json', 'dh/*/index.json'].map(path => `arn:aws:s3:::${bucket}/${root}/${path}`),
});

async function migrateDraftStorage({ s3, sourceBucket, privateBucket, root, profile, apply = false }) {
  if (!sourceBucket || !privateBucket || sourceBucket === privateBucket || !segment(root) || !segment(profile)) {
    throw new Error('Specify distinct source/private buckets and simple root/profile segments');
  }
  const report = { publications: 0, snapshots: 0, privateCopies: 0, deletedPublicDrafts: 0, dryRun: !apply,
    cdnInvalidationPaths: [`/${root}/tour/*`, `/${root}/srn/*`, `/${root}/dh/*`] };
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (missing(error)) return null; throw error; }
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error(`Object exceeds migration limit: ${Key}`);
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error(`Object exceeds migration limit: ${Key}`);
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } finally { response.Body?.destroy?.(); }
  };
  const exists = async (Bucket, Key) => {
    try { await s3.send(new HeadObjectCommand({ Bucket, Key })); return true; }
    catch (error) { if (missing(error)) return false; throw error; }
  };
  async function* keys(Prefix) {
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: sourceBucket, Prefix, ContinuationToken }));
      for (const object of page.Contents || []) yield object.Key;
      ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !ContinuationToken) throw new Error('Storage pagination did not advance');
    } while (ContinuationToken);
  }
  const putVerified = async (Bucket, Key, Body, CacheControl) => {
    if (!apply) return;
    await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType: 'application/json', CacheControl }));
    const stored = await read(Bucket, Key);
    if (!stored || digest(stored) !== digest(Body)) throw new Error(`Copy verification failed: ${Key}`);
  };

  // Preserve each historical alias's exact published edit version before removing sources.
  for await (const key of keys(`${root}/ptour/`)) {
    if (!key.endsWith('/0_d_data.json')) continue;
    const bytes = await read(sourceBucket, key);
    const publication = JSON.parse(bytes?.toString('utf8') || 'null')?.data;
    const version = /^(\d+)_index\.json$/.exec(publication?.pubDataFileName || '')?.[1];
    if (!publication || !segment(publication.assetPrefixHash) || !version || !Array.isArray(publication.screens)) {
      throw new Error(`Publication requires review before migration: ${key}`);
    }
    report.publications++;
    for (const screen of publication.screens) {
      if (!segment(screen.assetPrefixHash)) throw new Error(`Invalid screen reference in ${key}`);
      for (const filename of screen.type === 0 ? ['index.json'] : ['index.json', 'edits.json']) {
        const target = `${root}/ptour/assets-${publication.assetPrefixHash}/${version}/screens/${screen.assetPrefixHash}/${filename}`;
        if (await exists(sourceBucket, target)) continue;
        const source = `${root}/srn/${screen.assetPrefixHash}/${filename === 'edits.json' ? `${version}_edits.json` : filename}`;
        let body = await read(sourceBucket, source);
        if (!body && filename === 'index.json') body = await read(privateBucket, `${profile}/${source}`);
        if (!body) throw new Error(`Published source is missing: ${source}`);
        await putVerified(sourceBucket, target, body, 'max-age=2592000');
        report.snapshots++;
      }
    }
  }

  const deletions = [];
  for (const kind of ['tour', 'srn', 'dh']) {
    for await (const key of keys(`${root}/${kind}/`)) {
      const relative = key.slice(`${root}/${kind}/`.length);
      if (!/^[A-Za-z0-9_-]+\/(index|edits|loader)\.json$/.test(relative)) continue;
      const body = await read(sourceBucket, key);
      if (!body) throw new Error(`Source disappeared during migration: ${key}`);
      const target = `${profile}/${key}`;
      const existing = await read(privateBucket, target);
      if (existing && digest(existing) !== digest(body)) throw new Error(`Private draft conflict: ${target}`);
      if (!existing) await putVerified(privateBucket, target, body, 'no-store');
      deletions.push({ key, hash: digest(body) });
      report.privateCopies++;
    }
  }
  // No public draft is removed until every publication and private copy above has succeeded.
  if (apply) {
    for (const { key, hash } of deletions) {
      const current = await read(sourceBucket, key);
      if (!current || digest(current) !== hash) throw new Error(`Draft changed; stop writers before retrying: ${key}`);
    }
    let policy = { Version: '2012-10-17', Statement: [] };
    try {
      const current = await s3.send(new GetBucketPolicyCommand({ Bucket: sourceBucket }));
      policy = JSON.parse(current.Policy);
    } catch (error) { if (!missing(error) && error.name !== 'NoSuchBucketPolicy') throw error; }
    if (!Array.isArray(policy.Statement)) throw new Error('Review the existing bucket policy before migration');
    const deny = draftDocumentDenyStatement(sourceBucket, root);
    policy.Statement = policy.Statement.filter(statement => statement.Sid !== deny.Sid);
    policy.Statement.push(deny);
    await s3.send(new PutBucketPolicyCommand({ Bucket: sourceBucket, Policy: JSON.stringify(policy) }));
    for (const { key } of deletions) {
      await s3.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key: key }));
      const listed = await s3.send(new ListObjectsV2Command({ Bucket: sourceBucket, Prefix: key, MaxKeys: 1 }));
      if (listed.Contents?.some(object => object.Key === key)) throw new Error(`Public draft deletion failed: ${key}`);
      report.deletedPublicDrafts++;
    }
  }
  return report;
}

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=') || true];
  }));
  if (args.apply && !args['maintenance-confirmed']) throw new Error('Stop all application writers, then pass --maintenance-confirmed');
  const s3 = new S3Client({ region: args.region || 'ap-south-1', endpoint: args.endpoint,
    forcePathStyle: !!args.endpoint, maxAttempts: 2,
    requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  migrateDraftStorage({ s3, sourceBucket: args['source-bucket'], privateBucket: args['private-bucket'],
    root: args.root, profile: args.profile, apply: !!args.apply })
    .then(report => console.log(JSON.stringify(report)))
    .catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => s3.destroy());
}
module.exports = { migrateDraftStorage, draftDocumentDenyStatement };
