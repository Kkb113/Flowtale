import api from '@fable/common/dist/api';
import { getImgScreenData } from '@fable/common/dist/utils';
import { ScreenData } from '@fable/common/dist/types';
import { PrivateImage } from './private-image';

jest.mock('@fable/common/dist/api');

test('draft image bytes are authenticated, reused by one preview, and never stored in the source', async () => {
  process.env.REACT_APP_API_ENDPOINT = 'https://api.test';
  (api as jest.Mock).mockResolvedValue(new Blob(['png']));
  URL.createObjectURL = jest.fn(() => 'blob:private-image');
  URL.revokeObjectURL = jest.fn();
  const source = { ...getImgScreenData(), isHTML4: false } as unknown as ScreenData;
  const original = JSON.stringify(source);
  const image = new PrivateImage();
  const [first, second] = await Promise.all([image.document(source, 'owned'), image.document(source, 'owned')]);
  expect(first.docTree.chldrn[2].chldrn[1].attrs.src).toBe('blob:private-image');
  expect(second).toEqual(first);
  expect(JSON.stringify(source)).toBe(original);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith(
    'https://api.test/v1/f/draft/screen/owned/index.img',
    expect.objectContaining({ auth: true, responseType: 'blob' })
  );
  image.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image');
});
