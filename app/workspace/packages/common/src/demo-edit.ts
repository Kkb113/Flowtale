import { JourneyData, TourDataWoScheme } from './types';

export const DEMO_EDIT_PLAN_VERSION = 1 as const;

export type DemoEditSource = 'manual' | 'ai' | 'system';

export interface SetJourneyOptionOperation {
  id: string;
  type: 'journey-option.set';
  key: 'hideModuleOnLoad';
  value: boolean;
}

export type DemoEditOperation = SetJourneyOptionOperation;

export interface DemoEditPlan {
  id: string;
  version: typeof DEMO_EDIT_PLAN_VERSION;
  source: DemoEditSource;
  description?: string;
  operations: DemoEditOperation[];
}

export interface DemoEditDiffItem {
  operationId: string;
  label: string;
  before: boolean;
  after: boolean;
  summary: string;
}

export interface AppliedDemoEditPlan {
  state: TourDataWoScheme;
  inverse: DemoEditPlan;
  diff: DemoEditDiffItem[];
}

export class DemoEditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoEditValidationError';
    Object.setPrototypeOf(this, DemoEditValidationError.prototype);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DemoEditValidationError(`${field} must be a non-empty string`);
  }
}

export function validateDemoEditPlan(value: unknown): DemoEditPlan {
  if (!isRecord(value)) throw new DemoEditValidationError('Edit plan must be an object');
  assertNonEmptyString(value.id, 'Edit plan id');
  if (value.version !== DEMO_EDIT_PLAN_VERSION) {
    throw new DemoEditValidationError(`Unsupported edit plan version: ${String(value.version)}`);
  }
  if (value.source !== 'manual' && value.source !== 'ai' && value.source !== 'system') {
    throw new DemoEditValidationError(`Unsupported edit plan source: ${String(value.source)}`);
  }
  if (!Array.isArray(value.operations) || value.operations.length === 0) {
    throw new DemoEditValidationError('Edit plan must contain at least one operation');
  }

  const operationIds = new Set<string>();
  value.operations.forEach((operation, index) => {
    if (!isRecord(operation)) {
      throw new DemoEditValidationError(`Operation ${index + 1} must be an object`);
    }
    assertNonEmptyString(operation.id, `Operation ${index + 1} id`);
    if (operationIds.has(operation.id)) {
      throw new DemoEditValidationError(`Duplicate operation id: ${operation.id}`);
    }
    operationIds.add(operation.id);

    if (operation.type !== 'journey-option.set') {
      throw new DemoEditValidationError(`Unsupported operation type: ${String(operation.type)}`);
    }
    if (operation.key !== 'hideModuleOnLoad') {
      throw new DemoEditValidationError(`Unsupported journey option: ${String(operation.key)}`);
    }
    if (typeof operation.value !== 'boolean') {
      throw new DemoEditValidationError(`Operation ${operation.id} value must be boolean`);
    }
  });

  return value as unknown as DemoEditPlan;
}

function onOff(value: boolean): string {
  return value ? 'On' : 'Off';
}

export function applyDemoEditPlan(state: TourDataWoScheme, value: unknown): AppliedDemoEditPlan {
  const plan = validateDemoEditPlan(value);
  let journey: JourneyData = { ...state.journey };
  const inverseOperations: DemoEditOperation[] = [];
  const diff: DemoEditDiffItem[] = [];

  plan.operations.forEach(operation => {
    const before = journey[operation.key];
    journey = { ...journey, [operation.key]: operation.value };
    inverseOperations.unshift({
      id: `inverse-${operation.id}`,
      type: operation.type,
      key: operation.key,
      value: before,
    });
    diff.push({
      operationId: operation.id,
      label: 'Minimize module on start',
      before,
      after: operation.value,
      summary: `Minimize module on start: ${onOff(before)} → ${onOff(operation.value)}`,
    });
  });

  return {
    state: {
      ...state,
      opts: { ...state.opts },
      entities: { ...state.entities },
      diagnostics: { ...state.diagnostics },
      journey,
    },
    inverse: {
      id: `inverse-${plan.id}`,
      version: DEMO_EDIT_PLAN_VERSION,
      source: 'system',
      description: `Undo ${plan.description || plan.id}`,
      operations: inverseOperations,
    },
    diff,
  };
}

interface DemoEditHistoryEntry {
  forward: DemoEditPlan;
  inverse: DemoEditPlan;
}

export interface DemoEditHistoryResult extends AppliedDemoEditPlan {
  changed: boolean;
}

function unchanged(state: TourDataWoScheme): DemoEditHistoryResult {
  return {
    state,
    inverse: {
      id: 'no-op',
      version: DEMO_EDIT_PLAN_VERSION,
      source: 'system',
      operations: [{
        id: 'no-op-operation',
        type: 'journey-option.set',
        key: 'hideModuleOnLoad',
        value: state.journey.hideModuleOnLoad,
      }],
    },
    diff: [],
    changed: false,
  };
}

export class DemoCommandHistory {
  private past: DemoEditHistoryEntry[] = [];

  private future: DemoEditHistoryEntry[] = [];

  execute(state: TourDataWoScheme, value: unknown): DemoEditHistoryResult {
    const forward = validateDemoEditPlan(value);
    const applied = applyDemoEditPlan(state, forward);
    this.past.push({ forward, inverse: applied.inverse });
    this.future = [];
    return { ...applied, changed: true };
  }

  undo(state: TourDataWoScheme): DemoEditHistoryResult {
    const entry = this.past.pop();
    if (!entry) return unchanged(state);
    const applied = applyDemoEditPlan(state, entry.inverse);
    this.future.push(entry);
    return { ...applied, changed: true };
  }

  redo(state: TourDataWoScheme): DemoEditHistoryResult {
    const entry = this.future.pop();
    if (!entry) return unchanged(state);
    const applied = applyDemoEditPlan(state, entry.forward);
    this.past.push({ forward: entry.forward, inverse: applied.inverse });
    return { ...applied, changed: true };
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }
}
