import api, { ApiRequestError, isApiConflict } from './api';

describe('api errors', () => {
  const originalFetch = (global as any).fetch;

  afterEach(() => {
    (global as any).fetch = originalFetch;
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
});
