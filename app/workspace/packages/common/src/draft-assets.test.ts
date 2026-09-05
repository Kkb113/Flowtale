import { draftAssetUrl, isDraftAssetUrl } from './draft-assets';

test('draft URLs address a resource, not a caller-selected storage key', () => {
  expect(draftAssetUrl('tour', 'demo', 'index.json', 'https://api.example').href)
    .toBe('https://api.example/v1/f/draft/tour/demo/index.json');
  expect(draftAssetUrl('screen', 'id/with/slashes', 'edits.json', 'https://api.example').pathname)
    .toContain('id%2Fwith%2Fslashes');
});

test('only the configured API draft path is eligible for implicit authentication', () => {
  const endpoint = 'https://api.example';
  expect(isDraftAssetUrl(`${endpoint}/v1/f/draft/tour/demo/index.json`, endpoint)).toBe(true);
  for (const url of ['https://other.example/v1/f/draft/tour/demo/index.json',
    `${endpoint}/public/index.json`, `${endpoint}/v1/f/draft/tour/demo/1_index.json`,
    'https://name:secret@api.example/v1/f/draft/tour/demo/index.json']) {
    expect(isDraftAssetUrl(url, endpoint)).toBe(false);
  }
});
