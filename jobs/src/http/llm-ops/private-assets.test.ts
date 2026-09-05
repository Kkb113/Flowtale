import { Readable } from 'stream';
import { readPrivateImages } from './private-assets';

const config = { bucket: 'private-fixture', prefix: 'local/root/tour_data/org/' };
const key = `${config.prefix}7/capture_123/llmops/screen.png`;
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const send = jest.fn();
const client = { send } as unknown as Parameters<typeof readPrivateImages>[3];
const read = (url = key, signal?: AbortSignal) => readPrivateImages(7, [{ id: 1, url }], signal, client, config);

beforeEach(() => send.mockReset());

test('reads only the authenticated workspace key and determines the image type from bytes', async () => {
  send.mockResolvedValue({ Body: Readable.from([png]), ContentType: 'image/png', ContentLength: png.length });
  await expect(read()).resolves.toEqual([{ id: 1, url: key, type: 'image/png', data: png.toString('base64') }]);
  expect(send.mock.calls[0][0].input).toEqual({ Bucket: config.bucket, Key: key });
});

test.each([
  key.replace('/org/7/', '/org/8/'),
  key.replace('screen.png', '../secret.png'),
  key.replace('screen.png', '%2e%2e%2fsecret.png'),
  'https://example.org/screen.png',
  'staging/root/global/other.png',
  'staging/root/tour_data/old-capture/llmops/screen.png',
])('rejects unauthorized key %s before any storage request', async url => {
  await expect(read(url)).rejects.toMatchObject({ statusCode: 403 });
  expect(send).not.toHaveBeenCalled();
});

test('rejects a mixed batch before reading its valid first image', async () => {
  await expect(readPrivateImages(7, [{ id: 1, url: key }, { id: 2, url: 'secret' }], undefined, client, config))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(send).not.toHaveBeenCalled();
});

test('allows only the exact shared theme fixture', async () => {
  send.mockResolvedValue({ Body: Readable.from([png]), ContentType: 'image/png' });
  await expect(read('staging/root/global/sample_ann.png')).resolves.toHaveLength(1);
});

test.each([true, false])('bounds oversized images with content length present: %s', async declared => {
  const body = Readable.from([Buffer.alloc(5 * 1024 * 1024 + 1)]);
  send.mockResolvedValue({ Body: body, ContentType: 'image/png', ...(declared ? { ContentLength: 6 * 1024 * 1024 } : {}) });
  await expect(read()).rejects.toMatchObject({ statusCode: 413 });
  expect(body.destroyed).toBe(true);
});

test('rejects MIME mismatch and missing bodies without partial results', async () => {
  send.mockResolvedValueOnce({ Body: Readable.from([png]), ContentType: 'image/jpeg' }).mockResolvedValueOnce({});
  await expect(read()).rejects.toMatchObject({ statusCode: 422 });
  await expect(read()).rejects.toMatchObject({ statusCode: 422 });
});

test('aborts a stalled stream and releases it', async () => {
  const body = new Readable({ read() { /* Deliberately stalled source, released by cancellation. */ } });
  send.mockResolvedValue({ Body: body, ContentType: 'image/png' });
  const controller = new AbortController();
  const pending = read(key, controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await expect(pending).rejects.toMatchObject({ statusCode: 504 });
  expect(body.destroyed).toBe(true);
});

test('does not read after cancellation or when the batch exceeds the image limit', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(read(key, controller.signal)).rejects.toMatchObject({ statusCode: 504 });
  await expect(readPrivateImages(7, Array.from({ length: 51 }, () => ({ id: 1, url: key })), undefined, client, config))
    .rejects.toMatchObject({ statusCode: 413 });
  expect(send).not.toHaveBeenCalled();
});
