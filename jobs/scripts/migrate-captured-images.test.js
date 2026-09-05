const { Readable } = require('node:stream');
const { migrateCapturedImages } = require('./migrate-captured-images');

function fixture(fail = false) {
  const original = 'root/usr/org/7/captured';
  const source = 'private/local/root/srn/screen/index.json';
  const objects = new Map([
    [`public/${original}`, { bytes: Buffer.from('image'), type: 'image/png' }],
    ['public/root/usr/org/7/unrelated', { bytes: Buffer.from('unrelated'), type: 'image/png' }],
    [source, { bytes: Buffer.from(JSON.stringify({ docTree: { props: { origHref: 'blob:captured' }, attrs: { src: `https://assets.test/${original}` } } })), type: 'application/json' }],
  ]);
  const send = jest.fn(async command => {
    const { Bucket, Key, Prefix, Body, ContentType } = command.input;
    const key = `${Bucket}/${Key}`;
    switch (command.constructor.name) {
      case 'ListObjectsV2Command': return { Contents: [...objects.entries()].filter(([k]) => k.startsWith(`${Bucket}/${Prefix}`))
        .map(([k, v]) => ({ Key: k.slice(Bucket.length + 1), Size: v.bytes.length, LastModified: new Date(0) })) };
      case 'GetObjectCommand': {
        const value = objects.get(key); if (!value) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { ContentType: value.type, Body: Readable.from([value.bytes]) };
      }
      case 'PutObjectCommand':
        if (fail && key === source) { fail = false; throw new Error('interrupted'); }
        objects.set(key, { bytes: Buffer.from(Body), type: ContentType }); return {};
      case 'DeleteObjectCommand': objects.delete(key); return {};
      default: throw new Error(command.constructor.name);
    }
  });
  return { objects, send, source, original, run: apply => migrateCapturedImages({ s3: { send }, publicBucket: 'public', privateBucket: 'private',
    root: 'root', profile: 'local', publicBaseUrl: 'https://assets.test', apply }) };
}
test('repairs only proven captures, preserves unrelated media and is repeatable', async () => {
  const f = fixture(); const before = new Map(f.objects);
  expect(await f.run(false)).toMatchObject({ originals: 1, documents: 1 });
  expect(f.objects).toEqual(before);
  expect(await f.run(true)).toMatchObject({ complete: true, originals: 1 });
  expect(f.objects.has(`public/${f.original}`)).toBe(false);
  expect(f.objects.has('public/root/usr/org/7/unrelated')).toBe(true);
  expect(JSON.parse(f.objects.get(f.source).bytes).docTree.attrs.src).toBe('data:image/png;base64,aW1hZ2U=');
  expect(await f.run(true)).toMatchObject({ complete: true, changed: 0 });
});
test('interrupted repair retains the original and resumes the exact staged plan', async () => {
  const f = fixture(true);
  await expect(f.run(true)).rejects.toThrow('interrupted');
  expect(f.objects.has(`public/${f.original}`)).toBe(true);
  expect(await f.run(true)).toMatchObject({ complete: true });
  expect(f.objects.has(`public/${f.original}`)).toBe(false);
});
