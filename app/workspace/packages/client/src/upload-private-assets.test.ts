import api from '@fable/common/dist/api';
import { uploadAsset } from '@fable/common/dist/upload';
import { ResponseStatus } from '@fable/common/dist/api-contract';
import { uploadMarkedImageToAws } from './upload-media-to-aws';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@fable/common/dist/upload', () => ({ uploadAsset: jest.fn() }));
const file = new File(['fixture'], 'image.png', { type: 'image/png' });
const key = 'local/root/tour_data/org/7/capture_123/llmops/image.png';
beforeEach(() => jest.resetAllMocks());

it('returns the authorized object key only after storage acknowledges the upload', async () => {
  (api as jest.Mock).mockResolvedValue({ status: ResponseStatus.Success, data: { url: 'https://storage/upload?signature=fixture', objectKey: key } });
  (uploadAsset as jest.Mock).mockResolvedValue(undefined);
  await expect(uploadMarkedImageToAws('image/png', 'capture_123', 'image.png', file)).resolves.toBe(key);
  expect(uploadAsset).toHaveBeenCalledWith('https://storage/upload?signature=fixture', file, 'image/png');
  const query = new URL((api as jest.Mock).mock.calls[0][0], 'https://fixture.test').searchParams;
  expect(atob(query.get('te')!)).toBe('image/png');
  expect(atob(query.get('fe')!)).toBe('image.png');
  expect(query.get('pre')).toBe('capture_123');
});

it.each([
  { status: ResponseStatus.Failure },
  { status: ResponseStatus.Success, data: { url: 'https://storage/legacy' } }
])('rejects missing authorization metadata without uploading', async response => {
  (api as jest.Mock).mockResolvedValue(response);
  await expect(uploadMarkedImageToAws('image/png', 'capture_123', 'image.png', file)).rejects.toThrow('capture is retained');
  expect(uploadAsset).not.toHaveBeenCalled();
});

it('does not report success when storage rejects the upload', async () => {
  (api as jest.Mock).mockResolvedValue({ status: ResponseStatus.Success, data: { url: 'https://storage/upload', objectKey: key } });
  (uploadAsset as jest.Mock).mockRejectedValue(new Error('Storage rejected upload'));
  await expect(uploadMarkedImageToAws('image/png', 'capture_123', 'image.png', file)).rejects.toThrow('Storage rejected');
});
