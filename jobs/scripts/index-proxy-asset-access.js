// One-time maintenance backfill from pre-cutover, database-owned drafts.
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const mysql = require('mysql2/promise');
const { createHash } = require('node:crypto');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const missing = error => ['NoSuchKey', 'NotFound'].includes(error.name) || error.$metadata?.httpStatusCode === 404;

async function indexProxyAccess({ s3, db, publicBucket, privateBucket, root, profile, publicBaseUrl, privateBaseUrl, apply = false }) {
  if (!publicBucket || !privateBucket || publicBucket === privateBucket || ![root, profile].every(v => /^[A-Za-z0-9_-]+$/.test(v))) {
    throw new Error('Invalid migration scope');
  }
  const prefixes = [new URL(`${root}/proxy_asset/`, `${publicBaseUrl.replace(/\/$/, '')}/`).href,
    new URL(`${profile}/${root}/proxy_asset/`, `${privateBaseUrl.replace(/\/$/, '')}/`).href];
  const pattern = new RegExp(`(?:${prefixes.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})`, 'gi');
  const planKey = `migration/proxy-access/${profile}/${root}/plan.json`;
  const read = async (Bucket, Key) => {
    let response;
    try { response = await s3.send(new GetObjectCommand({ Bucket, Key })); }
    catch (error) { if (missing(error)) return null; throw error; }
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error('Asset exceeds migration input limit');
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error('Asset exceeds migration input limit');
        chunks.push(Buffer.from(chunk));
      }
      return { bytes: Buffer.concat(chunks), type: response.ContentType || '' };
    } finally { response.Body?.destroy?.(); }
  };
  const savePlan = async plan => {
    const bytes = Buffer.from(JSON.stringify(plan));
    await s3.send(new PutObjectCommand({ Bucket: privateBucket, Key: planKey, Body: bytes,
      ContentType: 'application/json', CacheControl: 'no-store' }));
    const stored = await read(privateBucket, planKey);
    if (!stored || hash(stored.bytes) !== hash(bytes)) throw new Error('Access-plan verification failed');
  };
  const previous = await read(privateBucket, planKey);
  let plan = previous ? JSON.parse(previous.bytes.toString('utf8')) : null;
  if (plan && (plan.publicBucket !== publicBucket || plan.privateBucket !== privateBucket || plan.root !== root || plan.profile !== profile
      || !Array.isArray(plan.grants) || !plan.grants.every(v => /^[1-9][0-9]*:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)))) {
    throw new Error('Invalid stored access plan');
  }
  if (plan?.complete) return { dryRun: !apply, alreadyComplete: true, grants: plan.grants.length, added: 0 };
  if (!plan) {
    const grants = new Set();
    const [screens] = await db.query('SELECT belongs_to_org AS org, asset_prefix_hash AS prefix FROM screen');
    const [tours] = await db.query('SELECT belongs_to_org AS org, asset_prefix_hash AS prefix FROM tour');
    const documents = [...screens.map(row => ({ ...row, kind: 'srn', files: ['index.json', 'edits.json'] })),
      ...tours.flatMap(row => [{ ...row, kind: 'tour', files: ['index.json', 'edits.json', 'loader.json'] },
        { ...row, kind: 'dh', files: ['index.json'] }])];
    for (const row of documents) {
      if (!Number.isSafeInteger(Number(row.org)) || Number(row.org) <= 0) continue; // Orphan data remains private and ungranted.
      if (!/^[A-Za-z0-9_-]+$/.test(row.prefix)) throw new Error('Invalid database asset prefix');
      const visited = new Set();
      let bytes = 0;
      const pending = [];
      for (const file of row.files) {
        const source = await read(privateBucket, `${profile}/${root}/${row.kind}/${row.prefix}/${file}`);
        if (source) pending.push(source.bytes.toString('utf8'));
      }
      while (pending.length) {
        for (const match of pending.shift().matchAll(pattern)) {
          const key = match[1];
          if (visited.has(key)) continue;
          visited.add(key);
          if (visited.size > 512) throw new Error('Draft exceeds captured asset count limit');
          const asset = await read(privateBucket, `${profile}/${root}/proxy_asset/${key}`)
            || await read(publicBucket, `${root}/proxy_asset/${key}`);
          if (!asset) throw new Error(`Referenced captured asset is missing: ${key}`);
          bytes += asset.bytes.length;
          if (bytes > 64 * 1024 * 1024) throw new Error('Draft exceeds captured asset byte limit');
          grants.add(`${row.org}:${key}`);
          if (asset.type.toLowerCase().startsWith('text/css')) pending.push(asset.bytes.toString('utf8'));
        }
      }
    }
    plan = { publicBucket, privateBucket, root, profile, grants: [...grants].sort(), complete: false };
    if (apply) await savePlan(plan); // A retry must never infer fresh access from post-cutover editable content.
  }
  if (!apply) return { dryRun: true, grants: plan.grants.length, added: 0 };
  let added = 0;
  await db.beginTransaction();
  try {
    for (const grant of plan.grants) {
      const [result] = await db.execute('INSERT IGNORE INTO proxy_asset_access (grant_id) VALUES (?)', [grant]);
      added += result.affectedRows;
      const [rows] = await db.execute('SELECT grant_id FROM proxy_asset_access WHERE grant_id=?', [grant]);
      if (rows.length !== 1 || rows[0].grant_id !== grant) throw new Error('Access grant verification failed');
    }
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  plan.complete = true;
  await savePlan(plan);
  return { dryRun: false, grants: plan.grants.length, added };
}

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, ...value] = arg.replace(/^--/, '').split('='); return [key, value.join('=') || true];
  }));
  if (args.apply && !args['maintenance-confirmed']) throw new Error('Stop writers and pass --maintenance-confirmed');
  const s3 = new S3Client({ region: args.region || 'ap-south-1', endpoint: args.endpoint, forcePathStyle: !!args.endpoint,
    maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  let db;
  mysql.createConnection({ uri: process.env.FABLE_MIGRATION_DB_URL, connectTimeout: 10000 }).then(async connection => {
    db = connection;
    return indexProxyAccess({ s3, db, publicBucket: args['public-bucket'], privateBucket: args['private-bucket'],
      root: args.root, profile: args.profile, publicBaseUrl: args['public-base-url'], privateBaseUrl: args['private-base-url'], apply: !!args.apply });
  }).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(async () => { if (db) await db.end(); s3.destroy(); });
}
module.exports = { indexProxyAccess };
