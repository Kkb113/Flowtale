import api, { ApiRequestError } from '@fable/common/dist/api';
import { loadSaveReview, compareSavedChanges } from './save-recovery';
import { JournalSnapshot } from './chunk-sync-manager';

jest.mock('../../utils', () => ({}));
jest.mock('@fable/common/dist/api', () => ({
  ...jest.requireActual('@fable/common/dist/api'), __esModule: true, default: jest.fn(),
}));
jest.mock('../../entity-processor', () => ({
  ...jest.requireActual('../../entity-processor'),
  processRawTourData: () => ({ loaderFileUri: new URL('https://assets.example/loader.json'), dataFileUri: new URL('https://assets.example/data.json'), editFileUri: new URL('https://assets.example/edit.json') }),
  processRawScreenData: () => ({ editFileUri: new URL('https://assets.example/screen-edits.json') }),
}));

const snapshot: JournalSnapshot = {
  key: 'fable/syncnd/index/demo',
  targetKey: 'fable/syncnd/index/demo',
  serialized: 'retained',
  kind: 'conflict',
  value: { opts: { main: 'screen/annotation' }, entities: {}, journey: { flows: [] } },
  expectedRevision: 1000,
};
const metadata = { data: { rid: 'demo', displayName: 'Demo', updatedAt: new Date(2000).toISOString() } };
const file = { v: 'legacy', opts: { main: 'old/annotation' }, entities: {}, journey: { flows: [] }, unknown: { retained: true } };
beforeEach(() => jest.clearAllMocks());

it('previews the exact proposed body, preserves unknown fields and writes with the reviewed revision', async () => {
  (api as jest.Mock).mockResolvedValueOnce(metadata).mockResolvedValueOnce(file).mockResolvedValueOnce(metadata).mockResolvedValueOnce(metadata);
  const review = await loadSaveReview(snapshot, {} as any, {} as any);
  expect(review.differences).toEqual([{ field: 'opts / main', saved: 'old/annotation', proposed: 'screen/annotation' }]);
  expect(review.proposed).toMatchObject({ unknown: { retained: true } });
  expect(api).toHaveBeenCalledTimes(3);
  await review.save();
  const [route, options] = (api as jest.Mock).mock.calls[3];
  expect(route).toBe('/recordtredit');
  expect(options.auth).toBe(true);
  expect(options.body.expectedRevision).toBe(2000);
  expect(JSON.parse(options.body.editData)).toMatchObject(review.proposed);
  expect(file.opts.main).toBe('old/annotation');
});

it('refuses a comparison if metadata changes during the separate legacy file read', async () => {
  (api as jest.Mock).mockResolvedValueOnce(metadata).mockResolvedValueOnce(file)
    .mockResolvedValueOnce({ data: { ...metadata.data, updatedAt: new Date(3000).toISOString() } });
  await expect(loadSaveReview(snapshot, {} as any, {} as any)).rejects.toThrow('changed while loading');
  expect((api as jest.Mock).mock.calls.every(([route]) => route !== '/recordtredit')).toBe(true);
});

it('propagates a new conflict and never retries with a newer revision automatically', async () => {
  (api as jest.Mock).mockResolvedValueOnce(metadata).mockResolvedValueOnce(file).mockResolvedValueOnce(metadata)
    .mockRejectedValueOnce(new ApiRequestError(409, 'Conflict', {}));
  const review = await loadSaveReview(snapshot, {} as any, {} as any);
  await expect(review.save()).rejects.toMatchObject({ status: 409 });
  expect(api).toHaveBeenCalledTimes(4);
});

it('compares screen reset markers against the saved edits without mutating either input', async () => {
  const edits = { edits: { title: { 1: [1, 'Original', 'Saved', 'title'] } }, v: 1 };
  const value = { title: { 1: [2, 'Original', null, 'title'] } };
  (api as jest.Mock).mockResolvedValueOnce(metadata).mockResolvedValueOnce(edits).mockResolvedValueOnce(metadata).mockResolvedValueOnce(metadata);
  const key = 'fable/syncnd/editchunk/1/screen';
  const review = await loadSaveReview({ ...snapshot, key, targetKey: key, value }, {} as any, {} as any);
  expect(review.proposed).toEqual({ edits: {}, v: 1 });
  expect(edits.edits.title[1][2]).toBe('Saved');
  expect(value.title[1][2]).toBeNull();
  await review.save();
  expect(api).toHaveBeenLastCalledWith('/recordeledit', expect.objectContaining({ body: expect.objectContaining({ rid: 'screen' }) }));
});

it('does not execute captured markup while producing a complete comparison', () => {
  const malicious = '<img src=x onerror=alert(1)>';
  expect(compareSavedChanges({ text: 'safe' }, { text: malicious })).toEqual([
    { field: 'text', saved: 'safe', proposed: malicious },
  ]);
});

it('reviews loader recovery against its saved file and submits the reviewed revision', async () => {
  const saved = { loadingText: { _val: 'Saved' }, unknown: { preserved: true } };
  (api as jest.Mock).mockResolvedValueOnce(metadata).mockResolvedValueOnce(saved).mockResolvedValueOnce(metadata).mockResolvedValueOnce(metadata);
  const key = 'fable/syncnd/loader/demo';
  const review = await loadSaveReview({ ...snapshot, key, targetKey: key, value: { loadingText: { _val: 'Recovered' } } }, {} as any, {} as any);
  expect(review.proposed).toEqual({ ...saved, loadingText: { _val: 'Recovered' } });
  expect(api).toHaveBeenNthCalledWith(2, 'https://assets.example/loader.json');
  await review.save();
  expect(api).toHaveBeenLastCalledWith('/recordtrloaderedit', expect.objectContaining({ body: expect.objectContaining({ expectedRevision: 2000 }) }));
});
