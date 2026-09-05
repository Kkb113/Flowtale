// Local-only integration: real API presigning, private S3 PUT/GET and worker authorization.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { readPrivateImages } = require('../dist/src/http/llm-ops/private-assets');

const api = 'http://localhost:18080/v1';
const endpoint = 'http://localhost:14566';
const config = { bucket: 'fable-local-private', prefix: 'local/local/tour_data/org/' };
const client = new S3Client({ endpoint, region: 'ap-south-1', forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1sAAAAASUVORK5CYII=', 'base64');
const written = [];
async function request(path, token, body) {
  return fetch(`${api}${path}`, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
}
async function workspace(account) {
  const token = `fable-local-user-${account}-development-token-v1`;
  const memberships = await request('/f/orgsfruser', token);
  assert.equal(memberships.status, 200);
  const name = `Phase 0 private assets ${account}`;
  let org = (await memberships.json()).data.find(item => item.displayName === name);
  if (!org) {
    const created = await request('/f/neworg', token, { displayName: name, thumbnail: '' });
    assert.equal(created.status, 200);
    org = (await created.json()).data;
  }
  return { id: org.id, token: `${org.id}:${token}` };
}
async function main() {
  const first = await workspace('a');
  const second = await workspace('b');
  const session = randomUUID();
  for (const org of [first, second]) {
    const query = new URLSearchParams({ te: Buffer.from('image/png').toString('base64'),
      pre: session, fe: Buffer.from('screen.png').toString('base64'), t: 'MarkedImgs' });
    const prepared = await request(`/f/getpvtuploadlink?${query}`, org.token);
    assert.equal(prepared.status, 200);
    const upload = (await prepared.json()).data;
    assert.equal(upload.objectKey, `${config.prefix}${org.id}/${session}/llmops/screen.png`);
    assert.equal(new URL(upload.url).origin, endpoint);
    const put = await fetch(upload.url, { method: 'PUT', body: png, headers: { 'Content-Type': 'image/png' }, signal: AbortSignal.timeout(15000) });
    assert.equal(put.ok, true);
    written.push(upload.objectKey);
    const anonymous = await fetch(`${endpoint}/${config.bucket}/${upload.objectKey}`, { signal: AbortSignal.timeout(15000) });
    assert.equal(anonymous.status, 403);
    await anonymous.body?.cancel();
    const images = await readPrivateImages(org.id, [{ id: 1, url: upload.objectKey }], undefined, client, config);
    assert.equal(images[0].data, png.toString('base64'));
  }
  assert.notEqual(written[0], written[1]);
  await assert.rejects(readPrivateImages(first.id, [{ id: 1, url: written[1] }], undefined, client, config), { statusCode: 403 });
  assert.equal((await request('/f/assgnimplorg', first.token, {})).status, 410);
  assert.equal((await request('/f/org?if=1', first.token)).status, 410);
  console.log('PASS: private uploads, anonymous denial, tenant-scoped worker reads and retired domain-based membership routes');
}
main().finally(async () => {
  for (const Key of written) await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key }));
  client.destroy();
}).catch(error => { console.error(error.message); process.exitCode = 1; });
