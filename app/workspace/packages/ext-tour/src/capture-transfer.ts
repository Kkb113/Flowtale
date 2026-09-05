import { captureChecksum, CaptureManifest, CAPTURE_CHUNK_SIZE, validateManifest } from "@fable/common/dist/capture-transfer";
import { DBData, OBJECT_KEY_VALUE } from "@fable/common/dist/db-utils";

const PREFIX = "fable/pending-capture/";
interface PendingCapture { manifest: CaptureManifest; payload: string }

export async function retainCapture(screens: unknown[], screenStyleData: unknown, id = crypto.randomUUID()): Promise<CaptureManifest> {
  if (!screens.length) throw new Error("No recording screens were captured");
  const data: DBData = { id: OBJECT_KEY_VALUE,
    captureSessionId: id,
    screensData: JSON.stringify(screens),
    screenStyleData: JSON.stringify(screenStyleData),
    cookies: "[]",
    version: "3" };
  const payload = JSON.stringify(data);
  const manifest: CaptureManifest = { protocol: 4,
    id,
    checksum: await captureChecksum(payload),
    chunks: Math.ceil(payload.length / CAPTURE_CHUNK_SIZE),
    screenCount: screens.length,
    createdAt: Date.now() };
  validateManifest(manifest);
  const existing: PendingCapture | undefined = (await chrome.storage.local.get(PREFIX + id))[PREFIX + id];
  if (existing) {
    if (existing.manifest.checksum !== manifest.checksum) throw new Error("The retained recording has different content");
    return existing.manifest;
  }
  await chrome.storage.local.set({ [PREFIX + id]: { manifest, payload } });
  return manifest;
}

export async function pendingCaptures(): Promise<CaptureManifest[]> {
  const stored = await chrome.storage.local.get(null);
  return Object.entries(stored).filter(([key]) => key.startsWith(PREFIX))
    .map(([, value]) => (value as PendingCapture).manifest).sort((a, b) => a.createdAt - b.createdAt);
}

export async function handleCaptureRequest(
  message: { type: string; id?: string; index?: number; checksum?: string },
  sender: chrome.runtime.MessageSender
) {
  const endpoint = new URL(process.env.REACT_APP_CLIENT_ENDPOINT!);
  const source = new URL(sender.url || "about:blank");
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || source.origin !== endpoint.origin
    || source.pathname !== "/preptour") throw new Error("Recording transfer is only available in Fable");
  let pending: PendingCapture | undefined;
  if (message.id) {
    pending = (await chrome.storage.local.get(PREFIX + message.id))[PREFIX + message.id];
  } else {
    const stored = await chrome.storage.local.get(null);
    pending = Object.entries(stored).filter(([key]) => key.startsWith(PREFIX))
      .map(([, value]) => value as PendingCapture).sort((a, b) => a.manifest.createdAt - b.manifest.createdAt)[0];
  }
  // The durable client may retry after the acknowledgement response was lost.
  if (!pending && message.type === "fable/CAPTURE_ACK" && message.id
    && /^[a-f0-9]{64}$/.test(message.checksum || "")) return { acknowledged: true };
  if (!pending) throw new Error("No pending recording was found. Open your saved recording or record again.");
  if (message.type === "fable/CAPTURE_MANIFEST") return { manifest: pending.manifest };
  if (message.type === "fable/CAPTURE_CHUNK") {
    const index = message.index;
    if (index === undefined || !Number.isSafeInteger(index) || index < 0 || index >= pending.manifest.chunks) {
      throw new Error("Invalid recording chunk");
    }
    const content = pending.payload.slice(index * CAPTURE_CHUNK_SIZE, (index + 1) * CAPTURE_CHUNK_SIZE);
    return { chunk: { index, content, checksum: await captureChecksum(content) } };
  }
  if (message.type === "fable/CAPTURE_ACK" && message.checksum === pending.manifest.checksum) {
    await chrome.storage.local.remove(PREFIX + pending.manifest.id);
    return { acknowledged: true };
  }
  throw new Error("Invalid recording acknowledgement");
}
