import React, { useCallback, useEffect, useRef, useState } from 'react';

export type RegisterEditorDrain = (drain: () => Promise<void>) => void;

// The current journal uses shared browser keys. One editor per demo may own them
// at a time; independent devices still use the server's revision checks.
export default function EditorSessionBoundary({ demoId, children }: {
  demoId: string;
  children: (registerDrain: RegisterEditorDrain) => React.ReactNode;
}): JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const drain = useRef<(() => Promise<void>) | null>(null);
  const registerDrain = useCallback<RegisterEditorDrain>(callback => { drain.current = callback; }, []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    if (!navigator.locks) {
      setError('This browser cannot safely coordinate demo editing. Open Fable over HTTPS in a current Chrome, Edge, Firefox or Safari browser.');
    } else {
      navigator.locks.request(`fable/demo-editor/${demoId}`, { signal: controller.signal }, async () => {
        if (!alive) return;
        setReady(true);
        await held;
      }).catch(failure => {
        if (alive && failure.name !== 'AbortError') setError('The editing session could not be opened. Reload this page to try again.');
      });
    }
    return () => {
      alive = false;
      controller.abort();
      // Wait for the previous editor's acknowledgement before handing its journal
      // to a waiting tab. A failed save stays in the durable recovery journal.
      Promise.resolve().then(() => drain.current?.()).catch(() => {}).finally(release);
    };
  }, [demoId]);
  if (ready) return <>{children(registerDrain)}</>;
  return (
    <section aria-live="polite" style={{ padding: '3rem', maxWidth: 680, margin: 'auto' }}>
      <h1>{error ? 'Unable to open editor' : 'Waiting for the other editor tab'}</h1>
      <p>{error || 'This demo can be edited in one tab at a time in this browser. Close its other editor tab, or navigate away from it. This tab will then open automatically with the latest saved changes.'}</p>
      <a href="/demos">Back to demos</a>
    </section>
  );
}
