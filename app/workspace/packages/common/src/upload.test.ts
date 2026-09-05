import { uploadAsset } from './upload';

describe('asset uploads', () => {
  const originalFetch = (global as any).fetch;
  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.useRealTimers();
  });

  it('rejects HTTP failure without exposing the signed URL', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(uploadAsset('https://storage.test/asset?secret=token', 'data', 'text/plain'))
      .rejects.toThrow('Asset upload failed (HTTP 403)');
  });

  it('accepts all successful HTTP acknowledgements', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    await expect(uploadAsset('https://storage.test/asset', 'data', 'text/plain')).resolves.toBeUndefined();
  });

  it('cancels a stalled upload at its deadline', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal;
    (global as any).fetch = jest.fn().mockImplementation((url, init) => {
      signal = init.signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    const upload = uploadAsset('https://storage.test/asset', 'data', 'text/plain', { timeoutMs: 100 });
    const assertion = expect(upload).rejects.toThrow('aborted');
    jest.advanceTimersByTime(100);
    await assertion;
    expect(signal!.aborted).toBe(true);
  });
});
