import { readNarrationDocument } from './narration-document';

const originalFetch = global.fetch;
beforeEach(() => { process.env.API_SERVER_ENDPOINT = 'http://api:8080'; global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('authorizes every document read using the caller credential, without a shared cache', async () => {
  (global.fetch as jest.Mock).mockImplementation(async () => new Response(JSON.stringify({ entities: {} })));
  await readNarrationDocument('v1/f/draft/tour/demo/index.json', 'Bearer first');
  await readNarrationDocument('v1/f/draft/tour/demo/index.json', 'Bearer second');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenLastCalledWith('http://api:8080/v1/f/draft/tour/demo/index.json',
    expect.objectContaining({ headers: { Authorization: 'Bearer second', Accept: 'application/json' }, redirect: 'error' }));
});

test('rejects raw keys, foreign URLs and missing credentials before fetching', async () => {
  for (const path of ['root/tour/secret/index.json', 'https://evil.invalid/index.json',
    'v1/f/draft/tour/../index.json', 'v1/f/draft/tour/demo/index.json?key=secret']) {
    await expect(readNarrationDocument(path, 'Bearer token')).rejects.toMatchObject({ status: 400 });
  }
  await expect(readNarrationDocument('v1/f/draft/tour/demo/index.json', undefined)).rejects.toMatchObject({ status: 401 });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('does not use an authorization failure or oversized response as narration content', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('{}', { status: 404 }));
  await expect(readNarrationDocument('v1/f/draft/tour/demo/index.json', 'Bearer token')).rejects.toMatchObject({ status: 404 });
  (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('{}', { headers: { 'content-length': String(65 * 1024 * 1024) } }));
  await expect(readNarrationDocument('v1/f/draft/tour/demo/index.json', 'Bearer token')).rejects.toMatchObject({ status: 413 });
});
