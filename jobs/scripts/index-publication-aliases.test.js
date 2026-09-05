const { Readable } = require('node:stream');
const { indexPublicationAliases } = require('./index-publication-aliases');

function fixture() {
  const objects = new Map([
    ['public/root/ptour/old/0_d_data.json', Buffer.from('{"data":{"assetPrefixHash":"same"}}')],
    ['public/root/ptour/new/0_d_data.json', Buffer.from('{"data":{"assetPrefixHash":"same"}}')],
    ['public/root/pdh/hub/0_d_data.json', Buffer.from('{"data":{"assetPrefixHash":"hub-hash"}}')],
  ]);
  const s3 = { send: jest.fn(async command => {
    const { Bucket, Key, Prefix, Body } = command.input;
    const id = `${Bucket}/${Key}`;
    if (command.constructor.name === 'ListObjectsV2Command') return { Contents: [...objects.keys()]
      .filter(key => key.startsWith(`${Bucket}/${Prefix}`)).map(key => ({ Key: key.slice(Bucket.length + 1) })) };
    if (command.constructor.name === 'GetObjectCommand') {
      if (!objects.has(id)) { const error = new Error('missing'); error.name = 'NoSuchKey'; throw error; }
      return { Body: Readable.from([objects.get(id)]) };
    }
    if (command.constructor.name === 'PutObjectCommand') { objects.set(id, Buffer.from(Body)); return {}; }
    throw new Error('Unexpected storage mutation');
  }) };
  return { objects, s3, options: { s3, sourceBucket: 'public', privateBucket: 'private', root: 'root', profile: 'local' } };
}

test('dry run is read only; applying groups historical aliases and is repeatable', async () => {
  const { objects, options } = fixture();
  expect(await indexPublicationAliases(options)).toMatchObject({ dryRun: true, changedRegistries: 2 });
  expect(objects.size).toBe(3);
  await indexPublicationAliases({ ...options, apply: true });
  expect(JSON.parse(objects.get('private/local/root/tour/same/publication-aliases.json'))).toEqual(['new', 'old']);
  expect(JSON.parse(objects.get('private/local/root/dh/hub-hash/publication-aliases.json'))).toEqual(['hub']);
  expect(await indexPublicationAliases({ ...options, apply: true })).toMatchObject({ changedRegistries: 0 });
  expect(objects.size).toBe(5);
});

test('malformed metadata stops before any registry is written', async () => {
  const { objects, options, s3 } = fixture();
  objects.set('public/root/ptour/broken/0_d_data.json', Buffer.from('{"data":{"assetPrefixHash":"../other"}}'));
  await expect(indexPublicationAliases({ ...options, apply: true })).rejects.toThrow('Invalid published identity');
  expect(s3.send.mock.calls.some(([command]) => command.constructor.name === 'PutObjectCommand')).toBe(false);
});
