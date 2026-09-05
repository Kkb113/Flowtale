/** Upload acknowledgement is an HTTP success, not merely a resolved fetch. */
export async function uploadAsset(
  url: string,
  body: BodyInit,
  contentType: string,
  options: { signal?: AbortSignal; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, options.timeoutMs ?? 120000);
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(url, {
      method: 'PUT',
      body,
      signal: controller.signal,
      headers: { 'Content-Type': contentType, ...options.headers },
    });
    if (!response.ok) throw new Error(`Asset upload failed (HTTP ${response.status}). Retry the upload.`);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
