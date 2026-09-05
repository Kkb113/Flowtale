import * as nodeCrypto from "crypto";
import { retainCapture, handleCaptureRequest } from "./capture-transfer";

let storage: Record<string, any>;
const sender = { id: "fable-extension", frameId: 0, url: "http://localhost:3000/preptour" };
beforeEach(() => {
  storage = {};
  process.env.REACT_APP_CLIENT_ENDPOINT = "http://localhost:3000";
  Object.defineProperty(global, "crypto", { configurable: true, value: (nodeCrypto as any).webcrypto });
  (global as any).chrome = { runtime: { id: sender.id },
    storage: { local: {
      get: jest.fn(async (key: string | null) => (key === null ? { ...storage } : { [key]: storage[key] })),
      set: jest.fn(async (items: object) => { Object.assign(storage, items); }),
      remove: jest.fn(async (key: string) => { delete storage[key]; }),
    } } };
});

it("retains the payload until a valid acknowledgement and accepts acknowledgement retries", async () => {
  const manifest = await retainCapture([{ captured: true }], {});
  const first = await handleCaptureRequest({ type: "fable/CAPTURE_CHUNK", id: manifest.id, index: 0 }, sender);
  expect(await handleCaptureRequest({ type: "fable/CAPTURE_CHUNK", id: manifest.id, index: 0 }, sender)).toEqual(first);
  await expect(handleCaptureRequest({ type: "fable/CAPTURE_ACK", id: manifest.id, checksum: "incorrect" }, sender))
    .rejects.toThrow("acknowledgement");
  expect(Object.keys(storage)).toHaveLength(1);
  const ack = { type: "fable/CAPTURE_ACK", id: manifest.id, checksum: manifest.checksum };
  await expect(handleCaptureRequest(ack, sender)).resolves.toEqual({ acknowledged: true });
  await expect(handleCaptureRequest(ack, sender)).resolves.toEqual({ acknowledged: true });
  expect(Object.keys(storage)).toHaveLength(0);
});

it.each([
  { ...sender, frameId: 1 }, { ...sender, id: "other-extension" },
  { ...sender, url: "https://untrusted.test/preptour" }, { ...sender, url: "http://localhost:3000/demo" },
])("does not expose pending recording bytes to an unauthorized sender", async source => {
  await retainCapture([{ secret: "test-only" }], {});
  await expect(handleCaptureRequest({ type: "fable/CAPTURE_MANIFEST" }, source)).rejects.toThrow("only available");
});

it("reports quota failure without claiming that the recording is retained", async () => {
  (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error("QUOTA_BYTES exceeded"));
  await expect(retainCapture([{}], {})).rejects.toThrow("QUOTA_BYTES");
  expect(Object.keys(storage)).toHaveLength(0);
});

it("replays interrupted completion with one stable identity and rejects changed content", async () => {
  const id = crypto.randomUUID();
  const first = await retainCapture([{ captured: true }], {}, id);
  const replay = await retainCapture([{ captured: true }], {}, id);
  expect(replay).toEqual(first);
  expect(Object.keys(storage)).toHaveLength(1);
  await expect(retainCapture([{ different: true }], {}, id)).rejects.toThrow("different content");
  expect((await handleCaptureRequest({ type: "fable/CAPTURE_MANIFEST", id }, sender)).manifest).toEqual(first);
});
