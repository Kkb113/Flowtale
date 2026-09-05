import api from '@fable/common/dist/api';
import { ScreenData } from '@fable/common/dist/types';
import { PrivateCaptureAssets, proxyAssetKey } from './private-capture-assets';

jest.mock('@fable/common/dist/api');
const key = '11111111-2222-3333-4444-555555555555';
const url = `https://private.test/local/root/proxy_asset/${key}`;

test('private assets use authenticated ID reads and mounted-preview blob URLs without mutating stored content', async () => {
  localStorage.setItem('fable/oid', '7');
  (api as jest.Mock).mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  URL.createObjectURL = jest.fn(() => 'blob:captured-image');
  URL.revokeObjectURL = jest.fn();
  const source = { docTree: { attrs: { src: url, style: `background:url('${url}')` }, props: { proxyUrlMap: { secret: url } } } } as unknown as ScreenData;
  const loader = new PrivateCaptureAssets();
  const rendered = await loader.document(source);
  expect(rendered.docTree.attrs.src).toBe('blob:captured-image');
  expect(rendered.docTree.props.proxyUrlMap).toEqual({});
  expect(source.docTree.attrs.src).toBe(url);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith(`/proxy-file/${key}`, expect.objectContaining({ auth: true, responseType: 'blob' }));
  expect(proxyAssetKey('blob:captured-image')).toBe(key);
  loader.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:captured-image');
  expect(proxyAssetKey('blob:captured-image')).toBeUndefined();
});

test('workspace changes abort resolution before another authenticated request can start', async () => {
  (api as jest.Mock).mockClear();
  localStorage.setItem('fable/oid', '7');
  const loader = new PrivateCaptureAssets();
  localStorage.setItem('fable/oid', '8');
  await expect(loader.document({ source: url } as unknown as ScreenData)).rejects.toThrow('workspace changed');
  expect(api).not.toHaveBeenCalled();
  loader.dispose();
});
