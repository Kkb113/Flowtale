// Offline repair of historical public snapshots. Application writers must be stopped.
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');

function compileWithCommand(command, input) {
  if (!Array.isArray(command) || !command.length || command.some(part => typeof part !== 'string')) throw new Error('Compiler command must be a JSON string array');
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let size = 0;
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Publication compiler timed out')); }, 60000);
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > 192 * 1024 * 1024) { child.kill(); reject(new Error('Compiler output exceeds the supported limit')); }
      else chunks.push(chunk);
    });
    // Compiler diagnostics may include document content. Report the storage key at the caller instead.
    child.stderr.resume();
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error('Publication compiler rejected this snapshot'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid compiler output')); }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

async function migratePublishedScreens({ s3, bucket, backupBucket, root, compile, apply = false }) {
  if (!bucket || !backupBucket || bucket === backupBucket || !/^[A-Za-z0-9_-]+$/.test(root || '')) throw new Error('Public bucket, distinct private backup bucket and valid root are required');
  const keys = new Set();
  const originals = new Map();
  const changes = new Map();
  for (const namespace of ['tour', 'ptour']) {
    const Prefix = `${root}/${namespace}/`;
    let ContinuationToken;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken }));
      for (const item of page.Contents || []) {
        if (!item.Key?.startsWith(Prefix)) throw new Error('Storage returned an unrelated key');
        keys.add(item.Key);
      }
      const next = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && (!next || next === ContinuationToken)) throw new Error('Storage pagination did not advance');
      ContinuationToken = next;
    } while (ContinuationToken);
  }
  const read = async (Key, Bucket = bucket) => {
    if (Bucket === bucket && originals.has(Key)) return originals.get(Key);
    const response = await s3.send(new GetObjectCommand({ Bucket, Key }));
    const chunks = [];
    let size = 0;
    try {
      if (response.ContentLength > 64 * 1024 * 1024) throw new Error(`Object exceeds supported size: ${Key}`);
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > 64 * 1024 * 1024) throw new Error(`Object exceeds supported size: ${Key}`);
        chunks.push(Buffer.from(chunk));
      }
    } finally { response.Body?.destroy?.(); }
    const result = { Body: Buffer.concat(chunks), CacheControl: response.CacheControl, ContentType: response.ContentType || 'application/json' };
    if (Bucket === bucket) originals.set(Key, result);
    return result;
  };
  const planKey = `migration/published-screens/${root}/pending.json`;
  const savePlan = async plan => {
    const Body = Buffer.from(JSON.stringify(plan));
    await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: planKey, Body, ContentType: 'application/json', CacheControl: 'no-store' }));
    if (!(await read(planKey, backupBucket)).Body.equals(Body)) throw new Error('Migration plan verification failed');
  };
  const finish = async plan => {
    if (plan.bucket !== bucket || plan.root !== root || !Array.isArray(plan.entries)) throw new Error('Migration plan does not match this deployment');
    for (const entry of plan.entries) {
      if (!entry.key.startsWith(`${root}/ptour/`) && !entry.key.startsWith(`${root}/tour/`)) throw new Error('Unrelated migration target');
      if (entry.delete) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: entry.key }));
        originals.delete(entry.key);
        try { await read(entry.key); throw new Error(`Deleted derivative still exists: ${entry.key}`); }
        catch (error) { if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NoSuchKey') throw error; }
      } else {
        const { Body } = await read(entry.nextKey, backupBucket);
        if (createHash('sha256').update(Body).digest('hex') !== entry.digest) throw new Error('Staged repair checksum mismatch');
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: entry.key, Body, ContentType: entry.contentType, CacheControl: entry.cacheControl }));
        originals.delete(entry.key);
        if (!(await read(entry.key)).Body.equals(Body)) throw new Error(`Read-back verification failed: ${entry.key}`);
      }
    }
    await savePlan({ ...plan, complete: true });
    return { ...plan.report, dryRun: false, resumed: true };
  };
  let pending;
  try { pending = JSON.parse((await read(planKey, backupBucket)).Body.toString('utf8')); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NoSuchKey') throw error; }
  if (pending && !pending.complete) {
    if (!apply) return { ...pending.report, dryRun: true, pending: true };
    return finish(pending);
  }
  const json = async key => JSON.parse((await read(key)).Body.toString('utf8'));
  const change = async (key, value) => {
    const original = await read(key);
    const Body = value === null ? null : Buffer.from(JSON.stringify(value));
    if (Body === null || !Body.equals(original.Body)) changes.set(key, { ...original, Body });
  };
  const redactions = new Map();
  const cssVariables = new Map();
  const globals = new Map();
  let checked = 0;
  for (const key of keys) {
    const match = key.slice(`${root}/ptour/`.length).match(/^assets-([A-Za-z0-9_-]+)\/([1-9]\d*)\/screens\/([A-Za-z0-9_-]+)\/index\.json$/);
    if (!key.startsWith(`${root}/ptour/`) || !match) continue;
    const [, demo, version, screen] = match;
    const localKey = key.replace(/index\.json$/, 'edits.json');
    // Image-only snapshots have no DOM edits, matching the publication service.
    if (!keys.has(localKey)) continue;
    const globalKey = `${root}/tour/${demo}/${version}_edits.json`;
    if (!keys.has(globalKey)) throw new Error(`Missing global edit snapshot: ${globalKey}`);
    if (!globals.has(globalKey)) globals.set(globalKey, await json(globalKey));
    const source = await json(key);
    // A marker in an old captured document is not proof that its bytes were compiled.
    let result;
    try { result = await compile({ source, local: await json(localKey), global: globals.get(globalKey) }); }
    catch { throw new Error(`Repair rejected for ${key}; resolve its legacy edits before retrying`); }
    if (result?.screen?.publicationSchema !== 1 || typeof result.redacted !== 'boolean' || !result.edits?.edits) throw new Error(`Invalid compilation result for ${key}`);
    await change(key, result.screen);
    await change(localKey, result.edits);
    const redacted = result.redacted;
    if (redacted) {
      const id = `${demo}/${version}`;
      if (!redactions.has(id)) redactions.set(id, new Set());
      redactions.get(id).add(screen);
      if (!cssVariables.has(id)) cssVariables.set(id, new Set());
      for (const name of result.screen.redactedCssVariables || []) cssVariables.get(id).add(name);
    }
    checked++;
  }
  // Version-owned CSS is independently downloadable. Repair it with the same
  // compiler and backup/resume plan as the screen, even after edits were flattened.
  for (const [id] of redactions) {
    const [demo, version] = id.split('/');
    const prefix = `${root}/ptour/assets-${demo}/${version}/proxy/`;
    const css = [];
    for (const key of keys) if (key.startsWith(prefix)) {
      const original = await read(key);
      if (original.ContentType.toLowerCase().startsWith('text/css')) css.push({ key, original });
    }
    if (!css.length) continue;
    const result = await compile({ styles: css.map(item => item.original.Body.toString('utf8')),
      variables: [...cssVariables.get(id)] });
    if (!Array.isArray(result?.styles) || result.styles.length !== css.length
        || result.styles.some(style => typeof style !== 'string')) throw new Error('Invalid CSS compilation result');
    css.forEach(({ key, original }, index) => {
      const Body = Buffer.from(result.styles[index]);
      if (!Body.equals(original.Body)) changes.set(key, { ...original, Body });
    });
  }
  // All screen snapshots are compiled before removing now-flattened global edits.
  for (const [key, value] of globals) await change(key, { v: value.v, edits: {} });
  for (const key of keys) {
    if (!key.startsWith(`${root}/ptour/`) || !/\/[^/]+\/0_d_data\.json$/.test(key)) continue;
    const metadata = await json(key);
    const data = metadata.data;
    const version = data?.pubDataFileName?.match(/^([1-9]\d*)_index\.json$/)?.[1];
    const protectedScreens = redactions.get(`${data?.assetPrefixHash}/${version}`);
    if (!protectedScreens?.size) continue;
    for (const screen of data.screens || []) {
      if (!protectedScreens.has(screen.assetPrefixHash)) continue;
      screen.redacted = true;
      delete screen.thumbnail; delete screen.url; delete screen.icon;
    }
    if (data.info) delete data.info.thumbnail;
    await change(key, metadata);
    const manifestKey = key.replace(/0_d_data\.json$/, 'manifest.json');
    if (keys.has(manifestKey)) {
      const manifest = await json(manifestKey);
      manifest.screenAssets = [];
      await change(manifestKey, manifest);
    }
    const gifKey = key.replace(/0_d_data\.json$/, 'demo.gif');
    if (keys.has(gifKey)) await change(gifKey, null);
  }
  if (apply) {
    // Verify every private backup before changing the first public object.
    for (const [key] of changes) {
      const original = originals.get(key);
      const digest = createHash('sha256').update(original.Body).digest('hex');
      const backupKey = `migration/published-screens/${digest}/${key}`;
      await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: backupKey, ...original, CacheControl: 'no-store' }));
      if (!(await read(backupKey, backupBucket)).Body.equals(original.Body)) throw new Error(`Backup verification failed: ${key}`);
    }
    const entries = [];
    for (const [key, value] of changes) {
      if (value.Body === null) { entries.push({ key, delete: true }); continue; }
      const digest = createHash('sha256').update(value.Body).digest('hex');
      const nextKey = `migration/published-screens/staged/${digest}/${key}`;
      await s3.send(new PutObjectCommand({ Bucket: backupBucket, Key: nextKey, ...value, CacheControl: 'no-store' }));
      if (!(await read(nextKey, backupBucket)).Body.equals(value.Body)) throw new Error(`Staged repair verification failed: ${key}`);
      entries.push({ key, nextKey, digest, contentType: value.ContentType, cacheControl: value.CacheControl });
    }
    if (entries.length) {
      const plan = { bucket, root, complete: false, entries, report: { checked, changed: changes.size,
        redactedVersions: redactions.size, invalidationPaths: [`/${root}/ptour/*`, `/${root}/tour/*`] } };
      await savePlan(plan);
      return finish(plan);
    }
  }
  return { dryRun: !apply, checked, changed: changes.size, redactedVersions: redactions.size,
    invalidationPaths: changes.size ? [`/${root}/ptour/*`, `/${root}/tour/*`] : [] };
}

module.exports = { migratePublishedScreens, compileWithCommand };
if (require.main === module) {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--maintenance-confirmed')) throw new Error('Stop application writers before applying');
  const command = JSON.parse(process.env.FABLE_PUBLICATION_COMPILER || 'null');
  const s3 = new S3Client({ region: process.env.AWS_S3_REGION || 'ap-south-1', endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT), maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 } });
  migratePublishedScreens({ s3, bucket: process.env.ASSET_BUCKET_NAME, backupBucket: process.env.PVT_ASSET_BUCKET_NAME,
    root: process.env.FABLE_ASSET_ROOT, apply, compile: input => compileWithCommand(command, input) })
    .then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
    .finally(() => s3.destroy());
}
