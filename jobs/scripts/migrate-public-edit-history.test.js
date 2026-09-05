const { Readable } = require('node:stream');
const { publicEdits, migratePublicEditHistory } = require('./migrate-public-edit-history');

test('projects every local edit type without changing the source', () => {
  const edits = { v: 1, history: 'PRIVATE', edits: { '1': {
    1: [1, 'PRIVATE', 'text', 'fid'], 2: [1, 'PRIVATE', 'image', '10px', '20px', 'fid'],
    3: [1, 'PRIVATE', 'none', 'fid'], 4: [1, 9, 3, 'PRIVATE', 'blur(3px)', 'fid'],
    5: [1, 'style', 'PRIVATE', 'fid'], 6: [1, 'PRIVATE', 'placeholder', 'fid'], 7: [1, 'PRIVATE', 'value', 'fid']
  } } };
  const before = structuredClone(edits);
  const output = publicEdits(edits, false);
  expect(JSON.stringify(output)).not.toContain('PRIVATE');
  expect(edits).toEqual(before);
  for (let type = 1; type <= 7; type++) {
    expect(output.edits['1'][type][type === 5 ? 1 : 2]).toEqual(before.edits['1'][type][type === 5 ? 1 : 2]);
  }
});

function fixture(invalid = false) {
  const objects = new Map([
    ['root/tour/demo/1_edits.json', JSON.stringify({ v: 1, edits: { 'fid/a': { 1: {
      type: 1, oldValue: 'PRIVATE', newValue: 'current', fid: 'a', timeInSec: 1, srnId: 3
    } } } })],
    ['root/ptour/assets-demo/1/screens/screen/edits.json', invalid ? '{}' : JSON.stringify({ v: 1, edits: { '1': { 1: [1, 'PRIVATE', 'current', 'a'] } } })],
    ['root/tour/demo/edits.json', 'PRIVATE_DRAFT'],
    ['root/ptour/demo/0_d_data.json', 'UNCHANGED_METADATA']
  ]);
  const s3 = { send: jest.fn(async command => {
    const request = command.input;
    if (command.constructor.name === 'ListObjectsV2Command') {
      return { Contents: [...objects.keys()].filter(Key => Key.startsWith(request.Prefix)).map(Key => ({ Key })) };
    }
    if (command.constructor.name === 'GetObjectCommand') return { Body: Readable.from([Buffer.from(objects.get(request.Key))]), CacheControl: 'public, max-age=3600' };
    if (command.constructor.name === 'PutObjectCommand') { objects.set(request.Key, request.Body.toString()); return {}; }
    throw new Error('Unexpected storage operation');
  }) };
  return { objects, s3, params: { s3, bucket: 'public', backupBucket: 'private', root: 'root' } };
}

test('dry run is read-only; repair is scoped, verified and repeatable', async () => {
  const { objects, s3, params } = fixture();
  const original = new Map(objects);
  expect(await migratePublicEditHistory(params)).toMatchObject({ dryRun: true, checked: 2, changed: 2 });
  expect(objects).toEqual(original);
  expect(s3.send.mock.calls.some(([command]) => command.constructor.name === 'PutObjectCommand')).toBe(false);
  expect(await migratePublicEditHistory({ ...params, apply: true })).toMatchObject({ checked: 2, changed: 2 });
  expect(objects.get('root/tour/demo/edits.json')).toBe('PRIVATE_DRAFT');
  expect(objects.get('root/ptour/demo/0_d_data.json')).toBe('UNCHANGED_METADATA');
  expect(objects.get('root/tour/demo/1_edits.json')).not.toContain('PRIVATE');
  expect(objects.get('root/ptour/assets-demo/1/screens/screen/edits.json')).not.toContain('PRIVATE');
  expect(await migratePublicEditHistory(params)).toMatchObject({ checked: 2, changed: 0 });
});

test('invalid legacy data aborts before any public mutation', async () => {
  const { objects, params } = fixture(true);
  const original = new Map(objects);
  await expect(migratePublicEditHistory({ ...params, apply: true })).rejects.toThrow('Invalid published edit file');
  expect(objects).toEqual(original);
});

test('backup failure prevents public overwrites and a public backup bucket is rejected', async () => {
  const { objects, s3, params } = fixture();
  const original = new Map(objects);
  await expect(migratePublicEditHistory({ ...params, backupBucket: 'public', apply: true })).rejects.toThrow('private backup bucket');
  const send = s3.send.getMockImplementation();
  s3.send.mockImplementation(command => {
    if (command.constructor.name === 'PutObjectCommand' && command.input.Bucket === 'private') throw new Error('Backup unavailable');
    return send(command);
  });
  await expect(migratePublicEditHistory({ ...params, apply: true })).rejects.toThrow('Backup unavailable');
  expect(objects).toEqual(original);
});
