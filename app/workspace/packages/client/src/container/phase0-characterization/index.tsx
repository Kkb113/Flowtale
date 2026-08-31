import { DemoCommandHistory, DemoEditHistoryResult, DemoEditPlan } from '@fable/common/dist/demo-edit';
import { CreateJourneyPositioning, TourDataWoScheme } from '@fable/common/dist/types';
import { getDefaultLiteralTourOpts, getRandomId } from '@fable/common/dist/utils';
import React, { ReactElement, useRef, useState } from 'react';

const STORAGE_KEY = 'fable/phase0/semantic-edit';

function createInitialState(): TourDataWoScheme {
  return {
    opts: getDefaultLiteralTourOpts(),
    entities: {},
    diagnostics: {},
    journey: {
      positioning: CreateJourneyPositioning.Left_Bottom,
      title: 'Phase 0 characterization demo',
      flows: [],
      primaryColor: getDefaultLiteralTourOpts().primaryColor,
      hideModuleOnLoad: false,
      hideModuleOnMobile: false,
    },
  };
}

function readState(): TourDataWoScheme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) as TourDataWoScheme : createInitialState();
}

function createPlan(value: boolean): DemoEditPlan {
  return {
    id: getRandomId(),
    version: 1,
    source: 'manual',
    description: 'Minimize module on start',
    operations: [{
      id: getRandomId(),
      type: 'journey-option.set',
      key: 'hideModuleOnLoad',
      value,
    }],
  };
}

export default function Phase0Characterization(): ReactElement {
  const history = useRef(new DemoCommandHistory());
  const [demoState, setDemoState] = useState(readState);
  const [diff, setDiff] = useState('No changes yet');

  const persist = (result: DemoEditHistoryResult): void => {
    if (!result.changed) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state));
    setDemoState(result.state);
    setDiff(result.diff.map(item => item.summary).join(', '));
  };

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '2rem', color: '#160245' }}>
      <h1>Editor safety characterization</h1>
      <p>This development-only page exercises the same semantic edit and command-history layer as the editor.</p>
      <label htmlFor="minimize-module">
        <input
          id="minimize-module"
          data-testid="minimize-module"
          type="checkbox"
          checked={demoState.journey.hideModuleOnLoad}
          onChange={event => persist(history.current.execute(demoState, createPlan(event.target.checked)))}
        />
        Minimize module on start
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          type="button"
          data-testid="undo"
          disabled={!history.current.canUndo()}
          onClick={() => persist(history.current.undo(demoState))}
        >
          Undo
        </button>
        <button
          type="button"
          data-testid="redo"
          disabled={!history.current.canRedo()}
          onClick={() => persist(history.current.redo(demoState))}
        >
          Redo
        </button>
      </div>
      <p data-testid="diff" aria-live="polite">{diff}</p>
      <output data-testid="persisted-state">
        {demoState.journey.hideModuleOnLoad ? 'On' : 'Off'}
      </output>
    </main>
  );
}
