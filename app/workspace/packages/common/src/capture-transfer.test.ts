import * as nodeCrypto from 'crypto';
import { captureChecksum, CaptureChunk, CaptureManifest, CAPTURE_CHUNK_SIZE, validateCapture, validateManifest } from './capture-transfer';
import { DBData } from './db-utils';

const originalCrypto = Object.getOwnPropertyDescriptor(global, 'crypto');
beforeAll(() => Object.defineProperty(global, 'crypto', { configurable: true, value: (nodeCrypto as any).webcrypto }));
afterAll(() => {
  if (originalCrypto) Object.defineProperty(global, 'crypto', originalCrypto);
  else delete (global as any).crypto;
});

async function fixture() {
  const data: DBData = { id: '1',
    captureSessionId: 'session-1',
    version: '3',
    cookies: '[]',
    screensData: JSON.stringify([{ text: '🌎'.repeat(CAPTURE_CHUNK_SIZE) }]),
    screenStyleData: '{}' };
  const payload = JSON.stringify(data);
  const chunks: CaptureChunk[] = [];
  for (let start = 0; start < payload.length; start += CAPTURE_CHUNK_SIZE) {
    const content = payload.slice(start, start + CAPTURE_CHUNK_SIZE);
    chunks.push({ index: chunks.length, content, checksum: await captureChecksum(content) });
  }
  const manifest: CaptureManifest = { protocol: 4,
    id: 'session-1',
    checksum: await captureChecksum(payload),
    chunks: chunks.length,
    screenCount: 1,
    createdAt: Date.now() };
  return { data, chunks, manifest };
}

it('reassembles Unicode payloads with out-of-order delivery and identical retries', async () => {
  const { data, chunks, manifest } = await fixture();
  await expect(validateCapture(manifest, [...chunks].reverse().concat(chunks[0]))).resolves.toEqual(data);
});

it('rejects missing chunks without accepting a duplicate as the missing chunk', async () => {
  const { chunks, manifest } = await fixture();
  await expect(validateCapture(manifest, chunks.slice(1).concat(chunks[1]))).rejects.toThrow('missing chunks');
});

it('rejects corrupted chunks and whole-recording mismatches', async () => {
  const { chunks, manifest } = await fixture();
  await expect(validateCapture(manifest, [{ ...chunks[0], content: 'changed' }, ...chunks.slice(1)]))
    .rejects.toThrow('integrity');
  await expect(validateCapture({ ...manifest, checksum: '0'.repeat(64) }, chunks)).rejects.toThrow('integrity');
});

it('rejects a different session or screen count even with an intact payload', async () => {
  const { chunks, manifest } = await fixture();
  await expect(validateCapture({ ...manifest, id: 'other-session' }, chunks)).rejects.toThrow('session');
  await expect(validateCapture({ ...manifest, screenCount: 2 }, chunks)).rejects.toThrow('session');
});

it.each([0, -1, 1.5, 1025, Infinity])('rejects unsafe manifest chunk count %s before requesting chunks', async chunks => {
  const { manifest } = await fixture();
  expect(() => validateManifest({ ...manifest, chunks })).toThrow('manifest');
});
