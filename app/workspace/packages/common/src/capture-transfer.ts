import { DBData } from './db-utils';

export const CAPTURE_CHUNK_SIZE = 256 * 1024;
export const MAX_CAPTURE_CHUNKS = 1024;

export interface CaptureManifest {
  protocol: 4;
  id: string;
  checksum: string;
  chunks: number;
  screenCount: number;
  createdAt: number;
}

export interface CaptureChunk { index: number; content: string; checksum: string }

export function validateManifest(manifest: CaptureManifest): void {
  if (!manifest || manifest.protocol !== 4 || typeof manifest.id !== 'string'
    || !/^[a-zA-Z0-9-]{1,64}$/.test(manifest.id) || !/^[a-f0-9]{64}$/.test(manifest.checksum)
    || !Number.isSafeInteger(manifest.chunks) || manifest.chunks < 1 || manifest.chunks > MAX_CAPTURE_CHUNKS
    || !Number.isSafeInteger(manifest.screenCount) || manifest.screenCount < 1
    || !Number.isSafeInteger(manifest.createdAt) || manifest.createdAt < 0) {
    throw new Error('The recording manifest is invalid or unsupported. Update the extension and retry.');
  }
}

export async function captureChecksum(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateCapture(manifest: CaptureManifest, chunks: CaptureChunk[]): Promise<DBData> {
  validateManifest(manifest);
  if (chunks.length < manifest.chunks) {
    throw new Error('The recording transfer is incomplete. Retry to resume it.');
  }
  const ordered = new Map<number, string>();
  for (const chunk of chunks) {
    if (!chunk || typeof chunk.content !== 'string'
      || !Number.isSafeInteger(chunk.index) || chunk.index < 0 || chunk.index >= manifest.chunks
      || chunk.content.length > CAPTURE_CHUNK_SIZE || await captureChecksum(chunk.content) !== chunk.checksum) {
      throw new Error('A recording chunk failed its integrity check. Retry the transfer.');
    }
    if (ordered.has(chunk.index) && ordered.get(chunk.index) !== chunk.content) {
      throw new Error('Conflicting recording chunks received');
    }
    ordered.set(chunk.index, chunk.content);
  }
  if (ordered.size !== manifest.chunks) throw new Error('The recording transfer is missing chunks');
  const serialized = Array.from({ length: manifest.chunks }, (_, index) => ordered.get(index)!).join('');
  if (await captureChecksum(serialized) !== manifest.checksum) throw new Error('Recording integrity check failed');
  const data = JSON.parse(serialized) as DBData;
  const screens = JSON.parse(data.screensData);
  if (data.id !== '1' || data.version !== '3' || data.cookies !== '[]'
    || typeof data.screenStyleData !== 'string' || !JSON.parse(data.screenStyleData)
    || data.captureSessionId !== manifest.id || !Array.isArray(screens) || screens.length !== manifest.screenCount) {
    throw new Error('Recording session does not match its manifest');
  }
  return data;
}
