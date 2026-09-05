const { Readable } = require('node:stream');
const { indexProxyAccess } = require('./index-proxy-asset-access');
const css = '11111111-2222-3333-4444-555555555555';
const image = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function fixture() {
  const objects = new Map([
    ['private/local/root/srn/screen/index.json', { bytes: Buffer.from(JSON.stringify({ src: `https://public.test/root/proxy_asset/${css}` })), type: 'application/json' }],
    [`public/root/proxy_asset/${css}`, { bytes: Buffer.from(`p{background:url(https://public.test/root/proxy_asset/${image})}`), type: 'text/css' }],
    [`public/root/proxy_asset/${image}`, { bytes: Buffer.from('image'), type: 'image/png' }],
  ]);
  const grants = new Set();
  const db = { query: jest.fn(async sql => [sql.includes('FROM screen') ? [{ org: 7, prefix: 'screen' }] : []]),
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(),
    execute: jest.fn(async (sql, [grant]) => {
      if (sql.startsWith('INSERT')) { const added = !grants.has(grant); grants.add(grant); return [{ affectedRows: +added }]; }
      return [grants.has(grant) ? [{ grant_id: grant }] : []];
    }) };
  const s3 = { send: jest.fn(async command => {
    const key = `${command.input.Bucket}/${command.input.Key}`;
    if (command.constructor.name === 'PutObjectCommand') {
      objects.set(key, { bytes: Buffer.from(command.input.Body), type: command.input.ContentType }); return {};
    }
    const value = objects.get(key);
    if (!value) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
    return { Body: Readable.from([value.bytes]), ContentLength: value.bytes.length, ContentType: value.type };
  }) };
  return { objects, db, grants, run: apply => indexProxyAccess({ s3, db, publicBucket: 'public', privateBucket: 'private',
    root: 'root', profile: 'local', publicBaseUrl: 'https://public.test', privateBaseUrl: 'https://private.test', apply }) };
}

test('backs up an exact access plan, includes nested CSS, and never infers new grants after completion', async () => {
  const f = fixture();
  expect(await f.run(false)).toMatchObject({ grants: 2, added: 0 });
  expect(f.db.execute).not.toHaveBeenCalled();
  expect(await f.run(true)).toMatchObject({ grants: 2, added: 2 });
  expect(f.grants).toEqual(new Set([`7:${css}`, `7:${image}`]));
  f.db.query.mockClear();
  expect(await f.run(true)).toMatchObject({ alreadyComplete: true, added: 0 });
  expect(f.db.query).not.toHaveBeenCalled();
});

test('an interrupted database write resumes only the saved plan', async () => {
  const f = fixture();
  f.db.execute.mockRejectedValueOnce(new Error('interrupted'));
  await expect(f.run(true)).rejects.toThrow('interrupted');
  expect(f.db.rollback).toHaveBeenCalled();
  f.db.query.mockClear();
  f.objects.delete('private/local/root/srn/screen/index.json');
  expect(await f.run(true)).toMatchObject({ grants: 2, added: 2 });
  expect(f.db.query).not.toHaveBeenCalled();
});
