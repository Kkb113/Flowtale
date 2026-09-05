// Run in the jobs image on the isolated local network. Never use production endpoints.
const assert = require('node:assert/strict');
const { S3 } = require('@aws-sdk/client-s3');

const endpoint = process.env.LOCAL_STORAGE_TEST_ENDPOINT;
const allowedHosts = new Set(['storage', 'fable-phase0-storage-probe']);
if (!endpoint || !allowedHosts.has(new URL(endpoint).hostname)) {
  throw new Error('LOCAL_STORAGE_TEST_ENDPOINT must name an isolated local storage service');
}
const mode = process.argv[2];
if (!['write', 'read'].includes(mode)) throw new Error('Expected write or read mode');
const Bucket = 'phase0-storage-verification';
const s3 = new S3({ endpoint, region: 'ap-south-1', forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, maxAttempts: 2 });
const deadline = setTimeout(() => { console.error('Storage verification timed out'); process.exit(1); }, 60000);

async function main() {
  if (mode === 'write') {
    try { await s3.headBucket({ Bucket }); } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
      await s3.createBucket({ Bucket });
    }
    await s3.putBucketCors({ Bucket, CORSConfiguration: { CORSRules: [{
      AllowedOrigins: ['http://localhost:3000'], AllowedMethods: ['GET', 'HEAD', 'PUT'], AllowedHeaders: ['*'],
    }] } });
    await s3.putBucketPolicy({ Bucket, Policy: JSON.stringify({ Version: '2012-10-17', Statement: [{
      Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${Bucket}/public/*`,
    }] }) });
    await s3.putObject({ Bucket, Key: 'public/source', Body: 'durable fixture',
      ContentType: 'text/plain', Metadata: { fixture: 'phase0' } });
    await s3.copyObject({ Bucket, Key: 'public/copy', CopySource: `${Bucket}/public/source` });
    await s3.putObject({ Bucket, Key: 'private/secret', Body: 'private fixture' });
  }
  const result = await s3.getObject({ Bucket, Key: 'public/copy', Range: 'bytes=0-6' });
  assert.equal(await result.Body.transformToString(), 'durable');
  assert.equal(result.Metadata.fixture, 'phase0');
  assert.equal(result.ContentType, 'text/plain');
  const publicObject = await fetch(`${endpoint}/${Bucket}/public/copy`, { signal: AbortSignal.timeout(10000) });
  assert.equal(publicObject.status, 200);
  assert.equal(await publicObject.text(), 'durable fixture');
  const privateObject = await fetch(`${endpoint}/${Bucket}/private/secret`, { signal: AbortSignal.timeout(10000) });
  assert.equal(privateObject.status, 403, 'Anonymous access to private keys must be denied');
  await privateObject.body?.cancel();
  const cors = await fetch(`${endpoint}/${Bucket}/public/source`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'content-type',
  }, signal: AbortSignal.timeout(10000) });
  assert.equal(cors.ok, true);
  assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  await cors.body?.cancel();
  assert.equal((await s3.listObjectsV2({ Bucket })).Contents.length, 3);
  console.log(`PASS (${mode}): signed upload, metadata, copy, range, listing, CORS and private access boundaries`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  clearTimeout(deadline);
  s3.destroy();
});
