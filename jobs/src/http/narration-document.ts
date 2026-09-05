import { ApiServiceError } from '../api';

/** Narration reads the user's authorized draft, never an arbitrary bucket key or shared cache entry. */
export async function readNarrationDocument(indexUri: unknown, authorization: string | undefined): Promise<Record<string, any>> {
  if (typeof indexUri !== 'string' || !/^\/?v1\/f\/draft\/tour\/[A-Za-z0-9_-]+\/index\.json$/.test(indexUri)) {
    throw new ApiServiceError(400);
  }
  if (!authorization) throw new ApiServiceError(401);
  const response = await fetch(`${process.env.API_SERVER_ENDPOINT}/${indexUri.replace(/^\//, '')}`, {
    headers: { Authorization: authorization, Accept: 'application/json' },
    signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  if (!response.ok) { await response.body?.cancel(); throw new ApiServiceError(response.status); }
  const limit = 64 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit || !response.body) {
    await response.body?.cancel();
    throw new ApiServiceError(413);
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new ApiServiceError(413);
      chunks.push(Buffer.from(value));
    }
    const document = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!document || !document.entities || typeof document.entities !== 'object' || Array.isArray(document.entities)) {
      throw new ApiServiceError(422);
    }
    return document;
  } finally {
    try { await reader.cancel(); } catch { /* Preserve the original read failure. */ }
    reader.releaseLock();
  }
}
