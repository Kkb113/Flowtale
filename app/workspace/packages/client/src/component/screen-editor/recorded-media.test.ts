import { finishRecording } from './recorded-media';

function recorderFixture(parts: Blob[]) {
  const recorder = new EventTarget() as MediaRecorder;
  Object.defineProperty(recorder, 'mimeType', { value: 'audio/webm' });
  recorder.stop = jest.fn(() => {
    setTimeout(() => {
      parts.push(new Blob(['final chunk']));
      recorder.dispatchEvent(new Event('stop'));
    }, 10);
  });
  return recorder;
}

afterEach(() => jest.useRealTimers());

it('waits for the browser final chunk before exposing a recording', async () => {
  jest.useFakeTimers();
  const parts = [new Blob(['first chunk'])];
  const recorder = recorderFixture(parts);
  const done = finishRecording(recorder, parts, new AbortController().signal);
  jest.advanceTimersByTime(10);
  const blob = await done;
  expect(blob.size).toBe(22);
  expect(blob.type).toBe('audio/webm');
  expect(jest.getTimerCount()).toBe(0);
});

it('releases finalization listeners and timers when the editor closes', async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const recorder = recorderFixture([]);
  const remove = jest.spyOn(recorder, 'removeEventListener');
  const done = finishRecording(recorder, [], controller.signal);
  const assertion = expect(done).rejects.toThrow('canceled');
  controller.abort();
  await assertion;
  jest.runOnlyPendingTimers();
  expect(remove).toHaveBeenCalledWith('stop', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
  expect(jest.getTimerCount()).toBe(0);
});
