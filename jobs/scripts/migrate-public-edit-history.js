// Maintenance-only repair of already published edit files. Never reads or changes drafts.
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createHash } = require('node:crypto');

function publicEdits(document, global) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const rect = value => {
    if (!object(value) || !Number.isFinite(value.width) || !Number.isFinite(value.height) || value.width < 0 || value.height < 0) throw new Error('Invalid redaction dimensions');
    if (value.assetKeys !== undefined && (!Array.isArray(value.assetKeys) || value.assetKeys.length > 512
      || !value.assetKeys.every(key => typeof key === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key)))) {
      throw new Error('Invalid redaction asset list');
    }
    return { width: value.width, height: value.height };
  };
  if (!object(document) || !object(document.edits)) throw new Error('Invalid edit document');
  const result = structuredClone(document);
  Object.keys(result).filter(key => !['v', 'lastUpdatedAtUtc', 'edits'].includes(key)).forEach(key => delete result[key]);
  for (const edits of Object.values(result.edits)) {
    if (!object(edits)) throw new Error('Invalid element edits');
    for (const [key, edit] of Object.entries(edits)) {
      if (!/^[1-7]$/.test(key)) throw new Error('Unsupported edit type');
      const type = Number(key);
      if (global) {
        if (!object(edit)) throw new Error('Invalid global edit');
        const allowed = ['type', 'timeInSec', 'fid', 'srnId', 'newValue', 'height', 'width',
          'newBlurValue', 'newFilterPropertyValue', 'newStyle', 'redactionRect'];
        Object.keys(edit).filter(field => !allowed.includes(field)).forEach(field => delete edit[field]);
        if (edit.redactionRect != null) edit.redactionRect = rect(edit.redactionRect);
      } else {
        const length = type === 2 || type === 4 ? 6 : 4;
        if (!Array.isArray(edit) || edit.length < length - 1 || edit.length > (type === 4 ? 7 : type === 3 || type === 5 ? 5 : length)) throw new Error('Invalid edit tuple');
        if (type === 4 && edit.length === 7 && edit[6] != null) edit[6] = rect(edit[6]);
        if ((type === 3 || type === 5) && edit.length === 5 && edit[4] != null) edit[4] = rect(edit[4]);
        edit[type === 5 ? 2 : 1] = null;
        if (type === 4) edit[3] = null;
      }
    }
  }
  return result;
}

async function migratePublicEditHistory({ s3, bucket, backupBucket, root, apply = false }) {
  if (!bucket || !/^[A-Za-z0-9_-]+$/.test(root || '')) throw new Error('Bucket and valid root are required');
  if (apply && (!backupBucket || backupBucket === bucket)) throw new Error('A distinct private backup bucket is required');
  const read = async (Key, Bucket = bucket) => {
    const response = await s3.send(new GetObjectCommand({ Bucket, Key }));
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error('Edit file exceeds the supported limit');
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error('Edit file exceeds the supported limit');
        chunks.push(Buffer.from(chunk));
      }
      return { body: Buffer.concat(chunks), cacheControl: response.CacheControl };
    } finally { response.Body?.destroy?.(); }
  };
  const writes = [];
  let checked = 0;
  for (const namespace of ['tour', 'ptour']) {
    const Prefix = `${root}/${namespace}/`;
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken }));
      for (const item of page.Contents || []) {
        if (!item.Key?.startsWith(Prefix)) throw new Error('Storage returned an unrelated key');
        const relative = item.Key.slice(Prefix.length);
        const global = namespace === 'tour' && /^[A-Za-z0-9_-]+\/[1-9]\d*_edits\.json$/.test(relative);
        const local = namespace === 'ptour' && /^assets-[A-Za-z0-9_-]+\/[1-9]\d*\/screens\/[A-Za-z0-9_-]+\/edits\.json$/.test(relative);
        if (!global && !local) continue;
        const original = await read(item.Key);
        let Body;
        try { Body = Buffer.from(JSON.stringify(publicEdits(JSON.parse(original.body.toString('utf8')), global))); }
        catch { throw new Error(`Invalid published edit file: ${item.Key}; no changes have been made`); }
        checked += 1;
        if (!Body.equals(original.body)) writes.push({ Key: item.Key, Body, CacheControl: original.cacheControl, original: original.body });
      }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Storage pagination did not advance');
      ContinuationToken = next;
    } while (ContinuationToken);
  }
  // Validate the entire discovered set before writing anything. Back up storage first.
  if (apply) {
    for (const { original, ...change } of writes) {
      const digest = createHash('sha256').update(original).digest('hex');
      const backupKey = `migration/public-edit-history/${digest}/${change.Key}`;
      await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: backupKey,
        Body: original, ContentType: 'application/json', CacheControl: 'no-store' }));
      if (!(await read(backupKey, backupBucket)).body.equals(original)) throw new Error(`Backup verification failed: ${change.Key}`);
      await s3.send(new PutObjectCommand({ Bucket: bucket, ...change, ContentType: 'application/json' }));
      if (!(await read(change.Key)).body.equals(change.Body)) throw new Error(`Read-back verification failed: ${change.Key}`);
    }
  }
  return { dryRun: !apply, checked, changed: writes.length,
    invalidationPaths: writes.length ? [`/${root}/tour/*`, `/${root}/ptour/*`] : [] };
}

module.exports = { publicEdits, migratePublicEditHistory };
if (require.main === module) {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--maintenance-confirmed')) throw new Error('Stop writers and back up storage before applying');
  const s3 = new S3Client({ region: process.env.AWS_S3_REGION || 'ap-south-1',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
    maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  migratePublicEditHistory({ s3, bucket: process.env.ASSET_BUCKET_NAME, backupBucket: process.env.PVT_ASSET_BUCKET_NAME,
    root: process.env.FABLE_ASSET_ROOT, apply })
    .then(report => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
    .finally(() => s3.destroy());
}
