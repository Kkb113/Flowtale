import { recordingReadiness, RecordingPart } from "./recording-readiness";

const root: RecordingPart = { frameId: 0, type: "serdom", data: { recorded: "root" } };
const thumbnail: RecordingPart = { frameId: 0, type: "thumbnail", data: "data:image/png;base64,AAAA" };

it("waits for every expected frame even after the root and stop marker arrive", () => {
  const parts: RecordingPart[] = [root, thumbnail, { frameId: 0, type: "sigstop", data: "" }];
  expect(recordingReadiness([0, 7], parts)).toMatchObject({ complete: false, usable: true, missingFrames: [7] });
  expect(recordingReadiness([0, 7], [...parts, { frameId: 7, type: "serdom", data: {} }]).complete).toBe(true);
});

it("does not let duplicate or out-of-order frame delivery manufacture completion", () => {
  expect(recordingReadiness([0, 2], [thumbnail, root, root]).complete).toBe(false);
  expect(recordingReadiness([0, 2], [thumbnail, { frameId: 2, type: "serdom", data: {} }, root]).complete).toBe(true);
});

it("keeps the capture's frame expectation independent from later navigation", () => {
  const expected = [0, 9];
  const currentTabFrames = [0];
  expect(recordingReadiness(expected, [root, thumbnail]).missingFrames).toEqual([9]);
  expect(currentTabFrames).toEqual([0]);
  expect(expected).toEqual([0, 9]);
});

it("never silently accepts missing root data, failed screenshots or legacy captures without expectations", () => {
  expect(recordingReadiness([0], [thumbnail]).usable).toBe(false);
  expect(recordingReadiness([0], [root, { ...thumbnail, data: "" }]).usable).toBe(false);
  expect(recordingReadiness(undefined, [root, thumbnail])).toMatchObject({ complete: false, usable: true });
});
