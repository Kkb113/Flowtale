import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import EditorSessionBoundary from './editor-session-boundary';

afterEach(() => { Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }); });

it('holds ownership until the previous editor finishes its acknowledgement', async () => {
  let grant!: () => Promise<void>;
  let released = false;
  Object.defineProperty(navigator, 'locks', { configurable: true,
    value: {
      request: jest.fn((_key, _options, callback) => {
        grant = async () => { await callback(); released = true; };
        return Promise.resolve();
      }),
    } });
  let acknowledge!: () => void;
  const finishing = new Promise<void>(resolve => { acknowledge = resolve; });
  const drain = jest.fn(() => finishing);
  const view = render(
    <EditorSessionBoundary demoId="demo-a">
      {register => { register(drain); return <p>Editor ready</p>; }}
    </EditorSessionBoundary>
  );
  expect(screen.getByText('Waiting for the other editor tab')).toBeTruthy();
  let held!: Promise<void>;
  await act(async () => { held = grant(); });
  expect(screen.getByText('Editor ready')).toBeTruthy();
  view.unmount();
  await waitFor(() => expect(drain).toHaveBeenCalledTimes(1));
  expect(released).toBe(false);
  await act(async () => { acknowledge(); await held; });
  expect(released).toBe(true);
});

it('does not mount an editor when the browser cannot coordinate its journal', () => {
  const child = jest.fn(() => <p>Unsafe editor</p>);
  render(<EditorSessionBoundary demoId="demo-a">{child}</EditorSessionBoundary>);
  expect(screen.getByText('Unable to open editor')).toBeTruthy();
  expect(child).not.toHaveBeenCalled();
});

it('aborts a queued request on navigation and ignores a late grant', async () => {
  let signal!: AbortSignal;
  let grant!: () => Promise<void>;
  const child = jest.fn(() => <p>Editor</p>);
  Object.defineProperty(navigator, 'locks', { configurable: true,
    value: {
      request: jest.fn((_key, options, callback) => { signal = options.signal; grant = callback; return Promise.resolve(); }),
    } });
  const view = render(<EditorSessionBoundary demoId="demo-a">{child}</EditorSessionBoundary>);
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { await grant(); });
  expect(child).not.toHaveBeenCalled();
});
