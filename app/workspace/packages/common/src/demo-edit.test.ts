import {
  applyDemoEditPlan,
  DemoCommandHistory,
  DemoEditPlan,
  DemoEditValidationError,
  validateDemoEditPlan,
} from './demo-edit';
import { CreateJourneyPositioning, PropertyType, TourDataWoScheme } from './types';

function state(hideModuleOnLoad = false): TourDataWoScheme {
  return {
    opts: {
      lf_pkf: 'email',
      main: '',
      primaryColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
      annotationBodyBackgroundColor: { type: PropertyType.LITERAL, from: '', _val: '#fff' },
      annotationBodyBorderColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
      annotationFontFamily: { type: PropertyType.LITERAL, from: '', _val: null },
      annotationFontColor: { type: PropertyType.LITERAL, from: '', _val: '#111' },
      borderRadius: { type: PropertyType.LITERAL, from: '', _val: 4 },
      showFableWatermark: { type: PropertyType.LITERAL, from: '', _val: true },
      annotationPadding: { type: PropertyType.LITERAL, from: '', _val: '14 14' },
      showStepNum: { type: PropertyType.LITERAL, from: '', _val: true },
      reduceMotionForMobile: false,
      monoIncKey: 0,
      createdAt: 1,
      updatedAt: 1,
    },
    entities: {},
    diagnostics: {},
    journey: {
      positioning: CreateJourneyPositioning.Left_Bottom,
      title: '',
      flows: [],
      primaryColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
      hideModuleOnLoad,
      hideModuleOnMobile: false,
    },
  };
}

function plan(value: boolean): DemoEditPlan {
  return {
    id: 'plan-1',
    version: 1,
    source: 'manual',
    description: 'Minimize module on start',
    operations: [{
      id: 'operation-1',
      type: 'journey-option.set',
      key: 'hideModuleOnLoad',
      value,
    }],
  };
}

describe('DemoEditPlan', () => {
  it('validates supported plans and rejects unsafe operations', () => {
    expect(validateDemoEditPlan(plan(true))).toEqual(plan(true));
    expect(() => validateDemoEditPlan({ ...plan(true), version: 2 })).toThrow(DemoEditValidationError);
    expect(() => validateDemoEditPlan({ ...plan(true), operations: [] })).toThrow('at least one operation');
    expect(() => validateDemoEditPlan({
      ...plan(true),
      operations: [{ ...plan(true).operations[0], type: 'raw-json.replace' }],
    })).toThrow('Unsupported operation type');
  });

  it('applies without mutating state and returns a readable diff and inverse', () => {
    const before = state();
    const result = applyDemoEditPlan(before, plan(true));

    expect(result.state).not.toBe(before);
    expect(result.state.journey).not.toBe(before.journey);
    expect(before.journey.hideModuleOnLoad).toBe(false);
    expect(result.state.journey.hideModuleOnLoad).toBe(true);
    expect(result.diff[0].summary).toBe('Minimize module on start: Off → On');
    expect(applyDemoEditPlan(result.state, result.inverse).state.journey.hideModuleOnLoad).toBe(false);
  });

  it('supports execute, undo, redo, and clears redo on a new edit', () => {
    const history = new DemoCommandHistory();
    const executed = history.execute(state(), plan(true));
    expect(history.canUndo()).toBe(true);
    expect(executed.state.journey.hideModuleOnLoad).toBe(true);

    const undone = history.undo(executed.state);
    expect(undone.changed).toBe(true);
    expect(undone.state.journey.hideModuleOnLoad).toBe(false);
    expect(history.canRedo()).toBe(true);

    const redone = history.redo(undone.state);
    expect(redone.state.journey.hideModuleOnLoad).toBe(true);

    history.undo(redone.state);
    history.execute(state(), { ...plan(false), id: 'plan-2' });
    expect(history.canRedo()).toBe(false);
  });
});
