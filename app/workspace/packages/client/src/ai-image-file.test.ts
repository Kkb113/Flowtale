import { fetchAiImage } from './ai-image-file';

const fetchMock = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
afterAll(() => { global.fetch = originalFetch; });
function response(bytes: number[], length = 0) {
  const reader = { read: jest.fn().mockResolvedValueOnce({ value: new Uint8Array(bytes), done: false }).mockResolvedValue({ done: true }), cancel: jest.fn().mockResolvedValue(undefined), releaseLock: jest.fn() };
  fetchMock.mockResolvedValue({ ok: true, headers: new Headers({ 'content-length': String(length) }), body: { getReader: () => reader } });
  return reader;
}
it.each([
  [[137, 80, 78, 71, 13, 10, 26, 10], 'image/png'],
  [[255, 216, 255, 1], 'image/jpeg']
])('preserves the actual screenshot format', async (bytes, type) => {
  response(bytes as number[]);
  expect((await fetchAiImage('https://fixture.test/screenshot')).type).toBe(type);
});
it('rejects oversized data before reading and cancels the stream', async () => {
  const reader = response([], 6 * 1024 * 1024);
  await expect(fetchAiImage('https://fixture.test/screenshot')).rejects.toThrow('exceeds');
  expect(reader.read).not.toHaveBeenCalled();
  expect(reader.cancel).toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
});
it('rejects HTTP failure and non-image bytes', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false });
  await expect(fetchAiImage('https://fixture.test/screenshot')).rejects.toThrow('could not be loaded');
  response([60, 104, 116, 109, 108]);
  await expect(fetchAiImage('https://fixture.test/screenshot')).rejects.toThrow('PNG or JPEG');
});
