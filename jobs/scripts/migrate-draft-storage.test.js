const { Readable } = require('node:stream');
const { migrateDraftStorage } = require('./migrate-draft-storage');

function fixture(corrupt = false) {
  const objects = new Map(Object.entries({
    'public/root/ptour/demo/0_d_data.json': JSON.stringify({ data: { assetPrefixHash: 'tour',
      pubDataFileName: '2_index.json', screens: [{ assetPrefixHash: 'screen', type: 1 }] } }),
    'public/root/tour/tour/index.json': '{"draft":true}',
    'public/root/srn/screen/index.json': '{"source":true}',
    'public/root/srn/screen/edits.json': '{"unpublished":true}',
    'public/root/srn/screen/2_edits.json': '{"published":true}',
  }).map(([key, value]) => [key, Buffer.from(value)]));
  const send = jest.fn(async command => {
    const { Bucket, Key, Prefix, Body } = command.input;
    const key = `${Bucket}/${Key}`;
    const value = objects.get(key);
    switch (command.constructor.name) {
      case 'ListObjectsV2Command': return { Contents: [...objects.keys()]
        .filter(item => item.startsWith(`${Bucket}/${Prefix}`)).map(item => ({ Key: item.slice(Bucket.length + 1) })) };
      case 'HeadObjectCommand':
      case 'GetObjectCommand':
        if (!value) { const error = new Error('missing'); error.name = 'NoSuchKey'; throw error; }
        return { ContentLength: value.length, Body: Readable.from([value]) };
      case 'PutObjectCommand': objects.set(key, corrupt && Bucket === 'private' ? Buffer.from('corrupt') : Buffer.from(Body)); return {};
      case 'DeleteObjectCommand': objects.delete(key); return {};
      case 'GetBucketPolicyCommand': return { Policy: JSON.stringify({ Version: '2012-10-17',
        Statement: [{ Sid: 'ExistingDelivery', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: 'arn:aws:s3:::public/*' }] }) };
      case 'PutBucketPolicyCommand': return {};
      default: throw new Error(`Unexpected ${command.constructor.name}`);
    }
  });
  return { objects, send, run: apply => migrateDraftStorage({ s3: { send }, sourceBucket: 'public',
    privateBucket: 'private', root: 'root', profile: 'local', apply }) };
}

test('dry run plans copies without modifying any object', async () => {
  const f = fixture();
  const original = new Map(f.objects);
  expect(await f.run(false)).toMatchObject({ dryRun: true, snapshots: 2, privateCopies: 3, deletedPublicDrafts: 0 });
  expect(f.objects).toEqual(original);
});

test('preserves exact published edits, verifies private drafts, removes raw public JSON and is repeatable', async () => {
  const f = fixture();
  expect(await f.run(true)).toMatchObject({ snapshots: 2, privateCopies: 3, deletedPublicDrafts: 3 });
  expect(f.objects.get('public/root/ptour/assets-tour/2/screens/screen/edits.json').toString()).toBe('{"published":true}');
  expect(f.objects.get('private/local/root/srn/screen/edits.json').toString()).toBe('{"unpublished":true}');
  expect(f.objects.has('public/root/srn/screen/index.json')).toBe(false);
  const policy = JSON.parse(f.send.mock.calls.find(([command]) => command.constructor.name === 'PutBucketPolicyCommand')[0].input.Policy);
  expect(policy.Statement).toContainEqual(expect.objectContaining({ Sid: 'ExistingDelivery', Effect: 'Allow' }));
  const deny = policy.Statement.find(statement => statement.Effect === 'Deny');
  expect(deny).toMatchObject({ Principal: '*', Action: 's3:GetObject' });
  expect(deny.Resource).toContain('arn:aws:s3:::public/root/srn/*/index.json');
  expect(deny.Resource.every(resource => !resource.includes('/ptour/'))).toBe(true);
  expect(await f.run(true)).toMatchObject({ snapshots: 0, privateCopies: 0, deletedPublicDrafts: 0 });
});

test('a conflicting private draft or failed copy verification leaves every public source intact', async () => {
  for (const corrupt of [false, true]) {
    const f = fixture(corrupt);
    if (!corrupt) f.objects.set('private/local/root/tour/tour/index.json', Buffer.from('newer draft'));
    await expect(f.run(true)).rejects.toThrow(/conflict|verification/);
    expect(f.objects.has('public/root/tour/tour/index.json')).toBe(true);
    expect(f.objects.has('public/root/srn/screen/index.json')).toBe(true);
    expect(f.send.mock.calls.some(([command]) => command.constructor.name === 'DeleteObjectCommand')).toBe(false);
  }
});
