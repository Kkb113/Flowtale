import api from '@fable/common/dist/api';
import { deleteTour, deleteDemoHub, duplicateTour, flushGlobalEditChunksToMasterFile, flushTourDataToMasterFile, recordLoaderData, saveLocalLoaderData } from './creator';
import reducer from '../reducer/default-reducer';
import ActionType from './type';
import { CreationJournal } from '../container/create-tour/creation-journal';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../utils', () => ({}));
jest.mock('../container/create-tour/utils', () => ({}));
jest.mock('./utils', () => ({}));
jest.mock('./ai-context', () => ({}));
jest.mock('../entity-processor', () => ({
  mergeGlobalEdits: (saved: object, incoming: object) => ({ ...saved, ...incoming }),
  convertGlobalEditsToLineItems: () => [],
  processRawTourData: (tour: object) => tour,
  processLoader: (loader: object) => loader,
  normalizeBackwardCompatibilityForLoader: (loader: object) => loader,
}));

function fixture() {
  let state = { default: { ...reducer(undefined, { type: 'test-init' }),
    currentTour: { rid: 'tour-a', updatedAt: new Date(1000) },
    globalEditFile: { edits: {} },
    localGlobalEdits: [['pending']],
    commonConfig: {},
    globalConfig: {},
  } } as any;
  const dispatch = jest.fn((action: any) => {
    if ([ActionType.SAVE_GLOBAL_EDIT_CHUNKS, ActionType.AUTOSAVING, ActionType.SAVE_TOUR_LOADER].includes(action.type)) {
      state = { default: reducer(state.default, action) };
    }
  });
  return { dispatch,
    getState: () => state,
    update: (changes: object) => {
      state = { default: { ...state.default, ...changes } };
    } };
}

beforeEach(() => jest.clearAllMocks());

it('keeps newer visible global edits and the pending indicator after an older request completes', async () => {
  const store = fixture();
  let acknowledge!: (response: unknown) => void;
  (api as jest.Mock).mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const saving = flushGlobalEditChunksToMasterFile('tour-a', {})(store.dispatch, store.getState);
  const newer = [['newer local change']];
  store.update({ localGlobalEdits: newer });
  acknowledge({ data: { rid: 'tour-a', updatedAt: new Date(2000) } });
  await saving;
  expect(store.getState().default.localGlobalEdits).toBe(newer);
  expect(store.getState().default.isAutoSaving).toBe(true);
});

it('never reports saved when the API rejects the write', async () => {
  const store = fixture();
  (api as jest.Mock).mockRejectedValue(new Error('storage offline'));
  await expect(flushGlobalEditChunksToMasterFile('tour-a', {})(store.dispatch, store.getState)).rejects.toThrow('offline');
  expect(store.getState().default.isAutoSaving).toBe(true);
  expect(store.getState().default.localGlobalEdits).toHaveLength(1);
});

it('does not update another demo when a request finishes after navigation', async () => {
  const store = fixture();
  let acknowledge!: (response: unknown) => void;
  (api as jest.Mock).mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const saving = flushGlobalEditChunksToMasterFile('tour-a', {})(store.dispatch, store.getState);
  store.update({ currentTour: { rid: 'tour-b' } });
  acknowledge({ data: { rid: 'tour-a', updatedAt: new Date(2000) } });
  await expect(saving).resolves.toBe(2000);
  expect(store.dispatch).not.toHaveBeenCalled();
  expect(store.getState().default.currentTour.rid).toBe('tour-b');
});

it('rejects a tour journal belonging to another demo before making a request', async () => {
  const store = fixture();
  await expect(flushTourDataToMasterFile({ rid: 'tour-b' } as any, {})(store.dispatch, store.getState))
    .rejects.toThrow('another demo');
  expect(api).not.toHaveBeenCalled();
});

it('guards loader writes and preserves edits made while an older save is pending', async () => {
  const store = fixture();
  const tour = store.getState().default.currentTour;
  const loader = { loadingText: { _val: 'First' } } as any;
  store.dispatch(saveLocalLoaderData(tour, loader));
  let acknowledge!: (response: unknown) => void;
  (api as jest.Mock).mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const saving = recordLoaderData(tour, loader, 1000)(store.dispatch, store.getState);
  expect((api as jest.Mock).mock.calls[0][1].body.expectedRevision).toBe(1000);
  const newer = { loadingText: { _val: 'Newer' } } as any;
  store.dispatch(saveLocalLoaderData(tour, newer));
  acknowledge({ data: { rid: tour.rid, updatedAt: new Date(2000) } });
  await expect(saving).resolves.toBe(2000);
  expect(store.getState().default.tourLoaderData).toBe(newer);
  expect(store.getState().default.isAutoSavingLoader).toBe(true);
  expect(loader).toEqual({ loadingText: { _val: 'First' } });
});

it('keeps loader changes pending on failure and rejects a missing base revision before dispatch', async () => {
  const store = fixture();
  const tour = store.getState().default.currentTour;
  const loader = { loadingText: { _val: 'Retained' } } as any;
  store.dispatch(saveLocalLoaderData(tour, loader));
  (api as jest.Mock).mockRejectedValue(new Error('Offline'));
  await expect(recordLoaderData(tour, loader)(store.dispatch, store.getState)).rejects.toThrow('Offline');
  expect(store.getState().default.tourLoaderData).toBe(loader);
  expect(store.getState().default.isAutoSavingLoader).toBe(true);
  jest.clearAllMocks();
  await expect(recordLoaderData({ ...tour, updatedAt: undefined }, loader)(store.dispatch, store.getState)).rejects.toThrow('could not be verified');
  expect(api).not.toHaveBeenCalled();
});

it('ignores a loader acknowledgement after navigation to another demo', async () => {
  const store = fixture();
  const tour = store.getState().default.currentTour;
  let acknowledge!: (response: unknown) => void;
  (api as jest.Mock).mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const saving = recordLoaderData(tour, {} as any)(store.dispatch, store.getState);
  store.update({ currentTour: { rid: 'other' } });
  acknowledge({ data: { rid: tour.rid, updatedAt: new Date(2000) } });
  await saving;
  expect(store.dispatch).not.toHaveBeenCalled();
});

it.each([false, true])('guards duplication finalization and clears operation state (failure: %p)', async fail => {
  const store = fixture();
  store.update({ principal: { id: 1 }, org: { id: 2 } });
  localStorage.clear();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key: string, run: () => unknown) => run() } });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'fixture-duplicate' } });
  const open = jest.spyOn(CreationJournal, 'open').mockResolvedValue({
    read: async () => undefined,
    checkpoint: async (_key: string, run: () => unknown) => run(),
    request: async (_key: string, route: string, body: unknown) => api(route, { auth: true, body }),
    complete: async (value: unknown) => value,
    close: () => {},
  } as any);
  const copy = { rid: 'copy', updatedAt: new Date(1234), idxm: {}, dataFileUri: new URL('https://assets.example/copied') };
  (api as jest.Mock).mockImplementation(async (route: string) => {
    if (route === '/duptour') return { data: copy };
    if (route === 'https://assets.example/copied') return { entities: {}, unknown: 'preserved' };
    if (route === '/recordtredit' && fail) throw new Error('Conflict');
    return { data: copy };
  });
  const saving = duplicateTour(store.getState().default.currentTour, 'Copy')(store.dispatch, store.getState);
  if (fail) await expect(saving).rejects.toThrow('Conflict');
  else await saving;
  const request = (api as jest.Mock).mock.calls.find(([route]) => route === '/recordtredit')![1];
  expect(request.body.expectedRevision).toBe(1234);
  expect(JSON.parse(request.body.editData).unknown).toBe('preserved');
  expect(store.dispatch).toHaveBeenLastCalledWith({ type: ActionType.OPS_IN_PROGRESS, ops: 0 });
  if (fail) {
    expect((api as jest.Mock).mock.calls.some(([route]) => route === '/updtrprop')).toBe(false);
    expect(store.dispatch.mock.calls.some(([action]) => action.type === ActionType.TOUR)).toBe(false);
  }
  open.mockRestore();
});

for (const remove of [deleteTour, deleteDemoHub]) {
  it(`${remove.name} retains the item until acknowledged and leaves it visible after failure`, async () => {
    const store = fixture();
    let reject!: (error: Error) => void;
    (api as jest.Mock).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    const pending = (remove('item-a') as any)(store.dispatch, store.getState);
    expect(store.dispatch).not.toHaveBeenCalled();
    reject(new Error('service unavailable'));
    await expect(pending).rejects.toThrow('service unavailable');
    expect(store.dispatch).not.toHaveBeenCalled();
    (api as jest.Mock).mockResolvedValue({ data: [] });
    await (remove('item-a') as any)(store.dispatch, store.getState);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });
}
