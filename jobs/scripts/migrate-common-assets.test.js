const { Readable } = require('node:stream');
const { migrateCommonAssets } = require('./migrate-common-assets');
const filename = '11111111-2222-3333-4444-555555555555.png';

function fixture(corrupt = false, assetKind = 'common') {
  const objects = new Map([
    [`public/root/cmn/${filename}`, { bytes: Buffer.from('thumbnail'), type: 'image/png' }],
    ['public/root/cmn/ph/placeholder1.png', { bytes: Buffer.from('placeholder'), type: 'image/png' }],
    ['public/root/ptour/demo/0_d_data.json', { bytes: Buffer.from(JSON.stringify({ data: {
      screens: [{ thumbnail: filename }, { redacted: true }] } })), type: 'application/json' }],
    ['public/root/srn/screen/1_edits.json', { bytes: Buffer.from('{}'), type: 'application/json' }],
  ]);
  const send = jest.fn(async command => {
    const { Bucket, Key, Prefix, Body, ContentType } = command.input;
    const key = `${Bucket}/${Key}`;
    switch (command.constructor.name) {
      case 'ListObjectsV2Command': return { Contents: [...objects.keys()].filter(k => k.startsWith(`${Bucket}/${Prefix}`))
        .map(k => ({ Key: k.slice(Bucket.length + 1) })) };
      case 'GetObjectCommand': {
        const value = objects.get(key);
        if (!value) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { ContentLength: value.bytes.length, ContentType: value.type, Body: Readable.from([value.bytes]) };
      }
      case 'PutObjectCommand': objects.set(key, { bytes: corrupt && Bucket === 'private' ? Buffer.from('bad') : Buffer.from(Body), type: ContentType }); return {};
      case 'DeleteObjectCommand': objects.delete(key); return {};
      case 'GetBucketPolicyCommand': return { Policy: JSON.stringify({ Statement: [{ Sid: 'existing' }] }) };
      case 'PutBucketPolicyCommand': return {};
      default: throw new Error(`Unexpected ${command.constructor.name}`);
    }
  });
  return { objects, send, run: apply => migrateCommonAssets({ s3: { send }, publicBucket: 'public', privateBucket: 'private',
    root: 'root', profile: 'local', publicBaseUrl: 'https://assets.test', apply, assetKind }) };
}

test('preserves only published thumbnail references under the owning publication and leaves placeholders public', async () => {
  const f = fixture();
  const before = new Map(f.objects);
  expect(await f.run(false)).toMatchObject({ privateCopies: 1, documents: 1, derivatives: 1, removed: 0 });
  expect(f.objects).toEqual(before);
  expect(await f.run(true)).toMatchObject({ removed: 2 });
  const doc = JSON.parse(f.objects.get('public/root/ptour/demo/0_d_data.json').bytes);
  expect(doc.data.screens[0].thumbnail).toMatch(/^https:\/\/assets.test\/root\/ptour\/demo\/binary\//);
  expect(doc.data.screens[1]).toEqual({ redacted: true });
  expect(f.objects.has(`public/root/cmn/${filename}`)).toBe(false);
  expect(f.objects.has('public/root/cmn/ph/placeholder1.png')).toBe(true);
  expect(f.objects.get(`private/local/root/cmn/${filename}`)).toEqual(before.get(`public/root/cmn/${filename}`));
  expect(await f.run(true)).toMatchObject({ privateCopies: 0, documents: 0, derivatives: 0, removed: 0 });
});

test('failed backup verification or an unknown namespace does not remove originals or rewrite publications', async () => {
  for (const corrupt of [true, false]) {
    const f = fixture(corrupt);
    if (!corrupt) f.objects.set('public/root/cmn/unknown', { bytes: Buffer.from('unknown'), type: 'image/png' });
    const before = f.objects.get('public/root/ptour/demo/0_d_data.json');
    await expect(f.run(true)).rejects.toThrow(/Verification|Unknown/);
    expect(f.objects.get('public/root/ptour/demo/0_d_data.json')).toEqual(before);
    expect(f.objects.has(`public/root/cmn/${filename}`)).toBe(true);
    expect(f.send.mock.calls.some(([c]) => c.constructor.name === 'DeleteObjectCommand')).toBe(false);
  }
});

test('nested CSS derivatives omit redacted images throughout their owning version', async () => {
  const f = fixture(false, 'proxy');
  const css = '11111111-2222-3333-4444-555555555555';
  const secret = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  f.objects.set(`public/root/proxy_asset/${css}`, { type: 'text/css', bytes: Buffer.from(`.x{background:url(https://assets.test/root/proxy_asset/${secret})}`) });
  f.objects.set(`public/root/proxy_asset/${secret}`, { type: 'image/png', bytes: Buffer.from('private pixels') });
  f.objects.set('public/root/ptour/assets-demo/1/screens/screen/index.json', { type: 'application/json', bytes: Buffer.from(JSON.stringify({
    redacted: true, redactedAssetKeys: [secret], href: `https://assets.test/root/proxy_asset/${css}`,
  })) });
  expect(await f.run(true)).toMatchObject({ privateCopies: 2, derivatives: 1 });
  const cssOutput = [...f.objects.entries()].find(([key, value]) => key.startsWith('public/root/ptour/assets-demo/1/screens/screen/binary/') && value.type === 'text/css');
  expect(cssOutput[1].bytes.toString()).toContain('url(data:,)');
  expect(cssOutput[1].bytes.toString()).not.toContain(secret);
  expect(f.objects.has(`public/root/proxy_asset/${secret}`)).toBe(false);
});
