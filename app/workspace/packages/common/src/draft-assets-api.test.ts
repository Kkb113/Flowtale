export {};

test('URL-only draft reads send the scoped credential only to the configured API', async () => {
  const endpoint = process.env.REACT_APP_API_ENDPOINT;
  const originalFetch = (global as any).fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
  process.env.REACT_APP_API_ENDPOINT = 'https://api.example';
  try {
    jest.resetModules();
    const { default: api } = await import('./api');
    const { fsec } = await import('./fsec');
    const token = jest.fn().mockResolvedValue('fixture-token');
    fsec.getAccessToken = token;
    Object.defineProperty(global, 'localStorage', { configurable: true, value: { getItem: () => '7' } });
    const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ entities: {} }) });
    (global as any).fetch = fetch;
    await api('https://api.example/v1/f/draft/tour/demo/index.json');
    expect(fetch).toHaveBeenLastCalledWith(
      'https://api.example/v1/f/draft/tour/demo/index.json',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer 7:fixture-token' }) })
    );
    await api('https://elsewhere.example/v1/f/draft/tour/demo/index.json');
    expect(fetch.mock.calls[1][1].headers).toBeUndefined();
    expect(token).toHaveBeenCalledTimes(1);
  } finally {
    if (endpoint === undefined) delete process.env.REACT_APP_API_ENDPOINT;
    else process.env.REACT_APP_API_ENDPOINT = endpoint;
    (global as any).fetch = originalFetch;
    if (originalStorage) Object.defineProperty(global, 'localStorage', originalStorage);
    else delete (global as any).localStorage;
    jest.resetModules();
  }
});
