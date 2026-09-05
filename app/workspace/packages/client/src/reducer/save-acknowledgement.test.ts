import reducer from './default-reducer';
import ActionType from '../action/type';
import { TSaveEditChunks, TSaveGlobalEditChunks, TSaveTourEntities } from '../action/creator';
import { EditItem } from '../types';

describe('save acknowledgement and newer local changes', () => {
  it('updates remote screen data without removing newer local edits or mutating the previous state', () => {
    const initial = reducer(undefined, { type: 'init-test' });
    const pending = [['newer']] as unknown as EditItem[];
    const state = { ...initial,
      localEdits: Object.freeze({ 1: pending }),
      remoteEdits: Object.freeze({}),
      screenEdits: Object.freeze({}) };
    const action = { type: ActionType.SAVE_EDIT_CHUNKS,
      screenId: 1,
      isLocal: false,
      preserveLocal: true,
      editList: [],
      editFile: { edits: {} } } as unknown as TSaveEditChunks;
    const next = reducer(state, action);
    expect(next.localEdits[1]).toBe(pending);
    expect(next.screenEdits[1]).toBe(action.editFile);
    expect(state.screenEdits).toEqual({});
  });

  it('retains newer global edits while recording the remote acknowledgement', () => {
    const initial = reducer(undefined, { type: 'init-test' });
    const pending = [['newer global']] as unknown as EditItem[];
    const state = { ...initial, localGlobalEdits: pending };
    const next = reducer(state, { type: ActionType.SAVE_GLOBAL_EDIT_CHUNKS,
      isLocal: false,
      preserveLocal: true,
      editList: [],
      editFile: { edits: {} } } as unknown as TSaveGlobalEditChunks);
    expect(next.localGlobalEdits).toBe(pending);
  });

  it('retains newer annotations, theme and journey when an older tour save completes', () => {
    const initial = reducer(undefined, { type: 'init-test' });
    const pending = { screen1: [] };
    const state = { ...initial, localAnnotations: pending };
    const next = reducer(state, { type: ActionType.SAVE_TOUR_ENTITIES,
      isLocal: false,
      preserveLocal: true,
      annotations: {},
      opts: {},
      journey: { title: 'older' },
      data: {},
      idMap: {} } as unknown as TSaveTourEntities);
    expect(next.localAnnotations).toBe(pending);
    expect(next.journey).toBe(state.journey);
  });
});
