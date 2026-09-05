import { completeUserGuide, getUserGuidesInArray, insertFableUserGuide, removeDeprecatedTours,
  shouldShowGuide, updateStepsTaken, upsertFableUserGuide } from './utils';
import { USER_GUIDE_LOCAL_STORE_KEY } from './types';

const guide = { id: 'guide',
  name: 'Guide',
  groupId: 'intro',
  partId: 0,
  serialId: 1,
  totalSteps: 3,
  stepsTaken: 0,
  isCompleted: false,
  isSkipped: false,
  desc: { toursCreated: 'Learn to edit', toursNotCreated: 'Create a demo' } };

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  insertFableUserGuide([]);
});

it('supports fresh guide registration without importing guide UI from storage helpers', () => {
  expect(getUserGuidesInArray()).toEqual([]);
  removeDeprecatedTours([{ guideInfo: guide, component: jest.fn() }]);
  upsertFableUserGuide(guide);
  expect(shouldShowGuide(guide.id)).toBe(true);
  expect(getUserGuidesInArray()).toEqual([guide]);
});

it('preserves completion and progress when definitions are updated', () => {
  upsertFableUserGuide(guide);
  updateStepsTaken(guide.id, 2);
  completeUserGuide(guide.id);
  upsertFableUserGuide({ ...guide, name: 'Updated guide' });
  expect(getUserGuidesInArray()[0]).toMatchObject({ name: 'Updated guide', stepsTaken: 2, isCompleted: true });
  expect(guide.isCompleted).toBe(false);
});

it('does not crash the page when optional guide storage is unavailable', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage denied'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  upsertFableUserGuide(guide);
  expect(shouldShowGuide(guide.id)).toBe(true);
  completeUserGuide(guide.id);
  expect(shouldShowGuide(guide.id)).toBe(false);
  expect(guide.isCompleted).toBe(false);
});

it('can repair malformed guide progress without touching editor journals', () => {
  localStorage.setItem('fable/editor/pending', 'private pending changes');
  localStorage.setItem(USER_GUIDE_LOCAL_STORE_KEY, 'invalid JSON');
  upsertFableUserGuide(guide);
  expect(getUserGuidesInArray()).toEqual([guide]);
  expect(localStorage.getItem('fable/editor/pending')).toBe('private pending changes');
});
