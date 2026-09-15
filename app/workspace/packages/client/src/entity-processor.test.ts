import { groupScreens, processRawScreenData, P_RespScreen, thumbnailUrl } from './entity-processor';

jest.mock('./utils', () => ({ getDisplayableTime: () => 'today', getDefaultThumbnailHash: () => 'default.png' }));
jest.mock('./component/annotation-rich-text-editor/utils/lead-form-node-utils', () => ({}));
jest.mock('./component/screen-editor/utils/edits', () => ({}));
jest.mock('nanoid', () => ({ nanoid: () => 'unused-in-grouping' }));

const screen = (id: number, parentScreenId: number, updatedAt = id): P_RespScreen => ({
  id, parentScreenId, isRootScreen: parentScreenId === 0, related: [], updatedAt: new Date(updatedAt),
} as unknown as P_RespScreen);

it('serves missing/default thumbnails from bundled assets and preserves authorized derivatives', () => {
  expect(thumbnailUrl(undefined, 'https://assets.example/').origin).toBe(window.location.origin);
  expect(thumbnailUrl('ph/placeholder1.png', 'https://assets.example/').origin).toBe(window.location.origin);
  const derivative = 'data:image/jpeg;base64,YQ==';
  expect(thumbnailUrl('private.jpg', 'https://assets.example/', undefined, derivative).href).toBe(derivative);
});

it('isolates published screen documents by demo and version while retaining portable export paths', () => {
  const source = { ...screen(1, 0),
    rid: 'screen-rid',
    assetPrefixHash: 'screen-hash',
    url: 'https://example.com',
    thumbnail: 'thumb.jpg' };
  const config = { pubTourAssetPath: 'https://assets.example/root/ptour/',
    commonAssetPath: 'https://assets.example/root/',
    dataFileName: 'index.json',
    editFileName: 'edits.json' };
  const publication = { assetPrefixHash: 'demo-hash', pubDataFileName: '2_index.json', pubEditFileName: '2_edits.json' };
  const published = processRawScreenData(source as any, config as any, publication as any);
  expect(published.dataFileUri.href).toBe('https://assets.example/root/ptour/assets-demo-hash/2/screens/screen-hash/index.json');
  expect(published.editFileUri.pathname).toBe('/root/ptour/assets-demo-hash/2/screens/screen-hash/edits.json');
  const redacted = processRawScreenData({ ...source, url: undefined, thumbnail: undefined } as any, config as any, publication as any);
  expect(redacted.urlStructured.href).toBe('https://screen.invalid/');
  expect(redacted.thumbnailUri.href).not.toContain('undefined');
  const exported = processRawScreenData(source as any, config as any, publication as any, true, 'https://export.example');
  expect(exported.dataFileUri.href).toBe('https://export.example/root/srn/screen-hash/index.json');
  expect(exported.editFileUri.pathname).toBe('/root/srn/screen-hash/2_edits.json');
});

it('groups descendants under their available source without mutating input or duplicating entries on reload', () => {
  const screens = [screen(1, 2), screen(2, 5), screen(3, 5), screen(5, 0), screen(6, 0)];
  const grouped = groupScreens(screens);
  expect(grouped.map(item => item.id)).toEqual([6, 5]);
  expect(grouped[1].related.map(item => item.id)).toEqual([3, 2, 1]);
  expect(grouped[1].numUsedInTours).toBe(3);
  expect(screens.every(item => item.related.length === 0)).toBe(true);
  expect(groupScreens(screens)).toEqual(grouped);
});

it('keeps orphaned screens available and terminates malformed parent cycles', () => {
  const grouped = groupScreens([screen(1, 99), screen(2, 3), screen(3, 2), screen(4, 4)]);
  const ids = grouped.flatMap(item => [item.id, ...item.related.map(child => child.id)]).sort();
  expect(ids).toEqual([1, 2, 3, 4]);
  expect(grouped.some(item => item.id === 1)).toBe(true);
  expect(grouped.some(item => item.id === 2 && item.related[0].id === 3)).toBe(true);
  expect(groupScreens([])).toEqual([]);
});
