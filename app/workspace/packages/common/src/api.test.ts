import api, { ApiRequestError, isApiConflict } from './api';
import { fsec } from './fsec';

describe('api errors', () => {
  const originalFetch = (global as any).fetch;
  const originalToken = fsec.getAccessToken;
  const originalStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');

  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    fsec.getAccessToken = originalToken;
    if (originalStorage) Object.defineProperty(global, 'localStorage', originalStorage);
    else delete (global as any).localStorage;
    jest.useRealTimers();
  });

  it('exposes HTTP 409 as a handled conflict', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ status: 409, message: 'Edit conflict' }),
    });

    let caught: unknown;
    try {
      await api<null, unknown>('https://example.test/edit', { auth: false });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect(isApiConflict(caught)).toBe(true);
    expect((caught as ApiRequestError).message).toBe('Edit conflict');
  });

  it('surfaces a permission denial without redirecting or invalidating the login', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false, status: 403, text: async () => JSON.stringify({ message: 'Invitation expired' }),
    });
    await expect(api('https://example.test/invitation', { auth: false })).rejects.toMatchObject({
      status: 403, message: 'Invitation expired',
    });
  });

  it('does not treat an application-level failure as a successful save', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ status: 'Failure', data: null }),
    });
    await expect(api('https://example.test/save', { auth: false })).rejects.toMatchObject({ status: 502 });
  });

  it('aborts a request that does not complete before its deadline', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal;
    (global as any).fetch = jest.fn().mockImplementation((url, init) => {
      requestSignal = init.signal;
      return new Promise((resolve, reject) => {
        requestSignal.addEventListener('abort', () => reject(new Error('request aborted')));
      });
    });
    const result = api('https://example.test/save', { auth: false, timeoutMs: 100 });
    const assertion = expect(result).rejects.toThrow('request aborted');
    jest.advanceTimersByTime(100);
    await assertion;
    expect(requestSignal!.aborted).toBe(true);
  });

  it('times out a stalled identity provider before attempting any HTTP request', async () => {
    jest.useFakeTimers();
    fsec.getAccessToken = jest.fn(() => new Promise<string>(() => {}));
    (global as any).fetch = jest.fn();
    const response = api('/save', { auth: true, timeoutMs: 100 });
    const assertion = expect(response).rejects.toMatchObject({ name: 'AbortError' });
    jest.advanceTimersByTime(100);
    await assertion;
    expect((global as any).fetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not start token acquisition for an already canceled operation', async () => {
    const controller = new AbortController();
    controller.abort();
    fsec.getAccessToken = jest.fn();
    (global as any).fetch = jest.fn();
    await expect(api('/save', { auth: true, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fsec.getAccessToken).not.toHaveBeenCalled();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('does not retarget a pending mutation after a workspace switch', async () => {
    localStorage.setItem('fable/oid', '7');
    let release!: (token: string) => void;
    fsec.getAccessToken = () => new Promise(resolve => { release = resolve; });
    (global as any).fetch = jest.fn();
    const response = api('/useraccess', { auth: true, body: { userId: 3, activate: false } });
    await Promise.resolve();
    localStorage.setItem('fable/oid', '99');
    release('fixture-token');
    await expect(response).rejects.toMatchObject({ name: 'AbortError' });
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('cancels a pending request when its identity provider is replaced', async () => {
    let release!: (token: string) => void;
    fsec.getAccessToken = () => new Promise(resolve => { release = resolve; });
    (global as any).fetch = jest.fn();
    const response = api('/save', { auth: true });
    await Promise.resolve();
    fsec.getAccessToken = () => Promise.resolve('other-account');
    release('fixture-token');
    await expect(response).rejects.toMatchObject({ name: 'AbortError' });
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('keeps the original workspace scope when identity lookup completes normally', async () => {
    localStorage.setItem('fable/oid', '7');
    fsec.getAccessToken = () => Promise.resolve('fixture-token');
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: true }) });
    await expect(api('/save', { auth: true })).resolves.toEqual({ data: true });
    expect((global as any).fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer 7:fixture-token' }),
    }));
  });
});
