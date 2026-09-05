const { Readable } = require('node:stream');
const { migrateSourceImages } = require('./migrate-source-images');

function fixture(corrupt = false, interrupt = false) {
  const document = { docTree: { chldrn: [{}, {}, { chldrn: [{}, { name: 'img',
    attrs: { src: 'https://assets.test/root/srn/parent/index.img' } }] }] } };
  const objects = new Map([
    ['public/root/srn/parent/index.img', { bytes: Buffer.from('original-png'), type: 'image/png' }],
    ['public/root/ptour/assets-demo/1/screens/clone/index.json', { bytes: Buffer.from(JSON.stringify(document)), type: 'application/json' }],
  ]);
  let deny = false;
  const send = jest.fn(async command => {
    const { Bucket, Key, Prefix, Body, ContentType } = command.input;
    const key = `${Bucket}/${Key}`;
    switch (command.constructor.name) {
      case 'ListObjectsV2Command': return { Contents: [...objects.keys()].filter(k => k.startsWith(`${Bucket}/${Prefix}`))
        .map(k => ({ Key: k.slice(Bucket.length + 1) })) };
      case 'GetObjectCommand': {
        if (deny && key === 'public/root/srn/parent/index.img') throw Object.assign(new Error('denied'), { name: 'AccessDenied' });
        const value = objects.get(key);
        if (!value) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { Body: Readable.from([value.bytes]), ContentLength: value.bytes.length, ContentType: value.type };
      }
      case 'PutObjectCommand':
        objects.set(key, { bytes: corrupt && Bucket === 'private' ? Buffer.from('corrupt') : Buffer.from(Body), type: ContentType }); return {};
      case 'GetBucketPolicyCommand': return { Policy: JSON.stringify({ Statement: [{ Sid: 'keep-existing' }] }) };
      case 'PutBucketPolicyCommand': deny = true; return {};
      case 'DeleteObjectCommand':
        if (interrupt) { interrupt = false; throw new Error('interrupted'); }
        objects.delete(key); return {};
      default: throw new Error('Unexpected command');
    }
  });
  return { objects, send, run: apply => migrateSourceImages({ s3: { send }, publicBucket: 'public',
    privateBucket: 'private', root: 'root', profile: 'local', publicBaseUrl: 'https://assets.test', apply }) };
}

test('dry run is read-only, then preserves parent image bytes and content type before denying originals', async () => {
  const f = fixture();
  const before = new Map(f.objects);
  expect(await f.run(false)).toMatchObject({ publications: 1, privateCopies: 1, deleted: 0 });
  expect(f.objects).toEqual(before);
  expect(await f.run(true)).toMatchObject({ publications: 1, privateCopies: 1, deleted: 1 });
  expect(f.objects.get('private/local/root/srn/parent/index.img')).toEqual(before.get('public/root/srn/parent/index.img'));
  expect(f.objects.get('public/root/ptour/assets-demo/1/screens/clone/index.img')).toEqual(before.get('public/root/srn/parent/index.img'));
  expect(f.objects.get('public/root/ptour/assets-demo/1/screens/clone/index.json').bytes.toString())
    .toContain('https://assets.test/root/ptour/assets-demo/1/screens/clone/index.img');
  expect(await f.run(true)).toMatchObject({ publications: 0, privateCopies: 0, deleted: 0 });
});

test('failed private verification leaves public originals and publication intact', async () => {
  const f = fixture(true);
  const before = f.objects.get('public/root/ptour/assets-demo/1/screens/clone/index.json');
  await expect(f.run(true)).rejects.toThrow('verification');
  expect(f.objects.has('public/root/srn/parent/index.img')).toBe(true);
  expect(f.objects.get('public/root/ptour/assets-demo/1/screens/clone/index.json')).toEqual(before);
  expect(f.send.mock.calls.some(([c]) => c.constructor.name === 'PutBucketPolicyCommand')).toBe(false);
});

test('retries deletion after the deny policy was installed using the verified private original', async () => {
  const f = fixture(false, true);
  await expect(f.run(true)).rejects.toThrow('interrupted');
  expect(await f.run(true)).toMatchObject({ publications: 0, privateCopies: 0, deleted: 1 });
});
