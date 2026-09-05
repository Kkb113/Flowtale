import api from '@fable/common/dist/api';
import { getTourData, loadScreenAndData } from './creator';
import ActionType from './type';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../utils', () => ({}));
jest.mock('../container/create-tour/utils', () => ({}));
jest.mock('./utils', () => ({}));
jest.mock('./ai-context', () => ({}));
jest.mock('../entity-processor', () => ({
  processRawScreenData: (screen: object) => screen,
  processRawTourData: (tour: object) => tour,
}));

const screen = { id: 1,
  rid: 'screen-a',
  parentScreenId: 0,
  dataFileUri: new URL('https://assets.example/published-screen.json') };
const captured = { docTree: { name: 'published capture' } };
const state = { default: { allScreens: [], commonConfig: {}, screenData: {}, screenEdits: {}, remoteEdits: {} } };
beforeEach(() => jest.resetAllMocks());

it('authenticates and escapes authoring screen and tour requests', async () => {
  (api as jest.Mock).mockResolvedValueOnce({ data: screen }).mockResolvedValueOnce(captured);
  await loadScreenAndData('screen & private')(jest.fn(), () => state as any);
  expect(api).toHaveBeenNthCalledWith(1, '/screen?rid=screen%20%26%20private', { auth: true });
  (api as jest.Mock).mockResolvedValueOnce({ data: { rid: 'tour-a' } });
  await getTourData('tour & private')(jest.fn(), () => state as any);
  expect(api).toHaveBeenLastCalledWith('/tour?rid=tour%20%26%20private', { auth: true });
});

it('loads a published screen without a draft metadata request or draft cache reuse', async () => {
  const dispatch = jest.fn();
  (api as jest.Mock).mockResolvedValue(captured);
  const contaminated = { default: { ...state.default,
    allScreens: [{ ...screen, dataFileUri: new URL('https://assets.example/private-draft.json') }],
    screenData: { 1: { docTree: { name: 'unsaved private text' } } } } };
  await loadScreenAndData(screen.rid, true, false, { screens: [screen] } as any)(dispatch, () => contaminated as any);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith(screen.dataFileUri.href);
  expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({
    type: ActionType.SCREEN_AND_DATA_LOADED, screenData: captured, screen,
  }));
});

it('reports an invalid publication instead of fetching a missing screen from the draft', async () => {
  await expect(loadScreenAndData(screen.rid, false, false, { screens: [] } as any)(jest.fn(), () => state as any))
    .rejects.toThrow('missing from this published demo');
  expect(api).not.toHaveBeenCalled();
});

it('preserves the static screen metadata fallback in exported demos', async () => {
  (api as jest.Mock).mockResolvedValueOnce({ data: screen }).mockResolvedValueOnce(captured);
  await loadScreenAndData(screen.rid, false, false, { screens: [] } as any, true, 'https://export.example/demo')(jest.fn(), () => state as any);
  expect(api).toHaveBeenNthCalledWith(1, 'https://export.example/demo/v1/screen/screen-a');
});
