const { Readable } = require('node:stream');
const { migratePublishedScreens, compileWithCommand } = require('./migrate-published-screens');

function fixture() {
  const objects = new Map();
  const put = (key, value) => objects.set(`public/${key}`, Buffer.from(JSON.stringify(value)));
  put('root/ptour/assets-demo/1/screens/screen/index.json', { private: 'PRIVATE', docTree: {} });
  put('root/ptour/assets-demo/1/screens/screen/edits.json', { v: 1, edits: { private: 'PRIVATE' } });
  put('root/tour/demo/1_edits.json', { v: 1, edits: { private: 'PRIVATE' } });
  put('root/tour/demo/index.json', { private: 'PRIVATE_DRAFT' });
  put('root/ptour/demo-rid/0_d_data.json', { data: { assetPrefixHash: 'demo', pubDataFileName: '1_index.json',
    info: { thumbnail: 'PRIVATE' }, screens: [{ assetPrefixHash: 'screen', thumbnail: 'PRIVATE', url: 'PRIVATE', icon: 'PRIVATE' }] } });
  put('root/ptour/demo-rid/manifest.json', { screenAssets: [{ thumbnail: 'PRIVATE' }] });
  objects.set('public/root/ptour/demo-rid/demo.gif', Buffer.from('PRIVATE_GIF'));
  const s3 = { send: jest.fn(async command => {
    const request = command.input;
    const key = `${request.Bucket}/${request.Key}`;
    if (command.constructor.name === 'ListObjectsV2Command') return { Contents: [...objects.keys()]
      .filter(item => item.startsWith(`${request.Bucket}/${request.Prefix}`)).map(item => ({ Key: item.slice(request.Bucket.length + 1) })) };
    if (command.constructor.name === 'GetObjectCommand') {
      if (!objects.has(key)) { const error = new Error('Missing'); error.name = 'NoSuchKey'; throw error; }
      return { Body: Readable.from([objects.get(key)]), ContentType: key.endsWith('.gif') ? 'image/gif' : 'application/json', CacheControl: 'max-age=3600' };
    }
    if (command.constructor.name === 'PutObjectCommand') { objects.set(key, Buffer.from(request.Body)); return {}; }
    if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(key); return {}; }
    throw new Error('Unexpected storage operation');
  }) };
  const compile = jest.fn(async () => ({ screen: { publicationSchema: 1, redacted: true, docTree: { replacement: true } }, edits: { v: 1, edits: {} }, redacted: true }));
  return { objects, s3, compile, params: { s3, compile, bucket: 'public', backupBucket: 'private', root: 'root' } };
}

test('repairs only public snapshots, removes unsafe derivative references and repeats without changes', async () => {
  const { objects, params } = fixture();
  const original = new Map(objects);
  expect(await migratePublishedScreens(params)).toMatchObject({ dryRun: true, checked: 1, changed: 6 });
  expect(objects).toEqual(original);
  expect(await migratePublishedScreens({ ...params, apply: true })).toMatchObject({ dryRun: false, checked: 1, changed: 6 });
  for (const [key, value] of objects) if (key.startsWith('public/') && !key.endsWith('/demo/index.json')) expect(value.toString()).not.toContain('PRIVATE');
  expect(objects.get('public/root/tour/demo/index.json').toString()).toContain('PRIVATE_DRAFT');
  expect(await migratePublishedScreens(params)).toMatchObject({ changed: 0, redactedVersions: 1 });
});

test('compiler rejection and failed private backups leave public objects unchanged', async () => {
  const { objects, params, compile, s3 } = fixture();
  const original = new Map(objects);
  compile.mockRejectedValueOnce(new Error('Invalid legacy edits'));
  await expect(migratePublishedScreens({ ...params, apply: true })).rejects.toThrow('Repair rejected');
  expect(objects).toEqual(original);
  const send = s3.send.getMockImplementation();
  s3.send.mockImplementation(command => {
    if (command.constructor.name === 'PutObjectCommand' && command.input.Bucket === 'private') throw new Error('Backup unavailable');
    return send(command);
  });
  await expect(migratePublishedScreens({ ...params, apply: true })).rejects.toThrow('Backup unavailable');
  expect(objects).toEqual(original);
});

test('an interrupted public rewrite resumes its verified plan without recompiling a mixed snapshot', async () => {
  const { params, s3, compile } = fixture();
  const send = s3.send.getMockImplementation();
  let writes = 0;
  s3.send.mockImplementation(command => {
    if (command.constructor.name === 'PutObjectCommand' && command.input.Bucket === 'public' && ++writes === 2) throw new Error('Storage interrupted');
    return send(command);
  });
  await expect(migratePublishedScreens({ ...params, apply: true })).rejects.toThrow('Storage interrupted');
  compile.mockClear();
  expect(await migratePublishedScreens(params)).toMatchObject({ pending: true });
  expect(await migratePublishedScreens({ ...params, apply: true })).toMatchObject({ resumed: true, changed: 6 });
  expect(compile).not.toHaveBeenCalled();
  expect(await migratePublishedScreens(params)).toMatchObject({ changed: 0 });
});

test('compiler subprocess receives JSON through stdin without a shell', async () => {
  const input = { source: { text: 'literal $() ` ;' }, local: {}, global: {} };
  const command = [process.execPath, '-e', 'let data="";process.stdin.on("data",x=>data+=x);process.stdin.on("end",()=>process.stdout.write(data));'];
  expect(await compileWithCommand(command, input)).toEqual(input);
  await expect(compileWithCommand([process.execPath, '-e', 'process.exit(1)'], input)).rejects.toThrow('rejected');
});
