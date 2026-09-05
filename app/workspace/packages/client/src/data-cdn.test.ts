import { dataCdnBaseUrl } from './data-cdn';

it('preserves existing production CDN host configuration', () => {
  expect(dataCdnBaseUrl('assets.example.com', 'prod')).toBe('https://assets.example.com');
});
it('supports the local object storage bucket path', () => {
  expect(dataCdnBaseUrl('http://localhost:14566/fable-local-assets/', 'local'))
    .toBe('http://localhost:14566/fable-local-assets');
});
it.each(['prod', 'staging'])('rejects HTTP assets in %s', environment => {
  expect(() => dataCdnBaseUrl('http://localhost:14566/bucket', environment)).toThrow();
});
it.each(['http://remote.example.com', 'https://name:secret@example.com', 'https://example.com?token=x',
  // Deliberately hostile configuration must be rejected rather than executed.
  // eslint-disable-next-line no-script-url
  'javascript:alert(1)'])('rejects an invalid asset endpoint %s', endpoint => {
  expect(() => dataCdnBaseUrl(endpoint, 'local')).toThrow();
});
