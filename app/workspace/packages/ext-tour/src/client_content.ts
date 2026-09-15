import { openDb, DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE, DBData } from "@fable/common/dist/db-utils";
import { CaptureChunk, CaptureManifest, captureChecksum, validateCapture, validateManifest } from "@fable/common/dist/capture-transfer";
import { commitCapture, readCapture } from "@fable/common/dist/capture-storage";

function status(id: string, value: string) {
  const element = document.getElementById(id) || document.createElement("div");
  element.id = id;
  element.textContent = value;
  element.hidden = true;
  document.body.appendChild(element);
}

async function request<T>(message: object): Promise<T> {
  // Send one bounded request at a time. Retrying the same chunk has no side effects.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage(message),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Recording transfer timed out. Reload to retry.")), 30000);
      }),
    ]);
    if (!response || response.error) throw new Error(response?.error || "Recording transfer interrupted. Reload to retry.");
    return response as T;
  } finally { if (timer) clearTimeout(timer); }
}

async function transfer() {
  const id = new URL(window.location.href).searchParams.get("capture") || undefined;
  if (id) {
    const db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
    let previous: DBData | undefined;
    try {
      previous = await readCapture(db, id);
    } finally { db.close(); }
    if (previous?.captureSessionId === id) {
      await request({ type: "fable/CAPTURE_ACK", id, checksum: await captureChecksum(JSON.stringify({ ...previous, id: OBJECT_KEY_VALUE })) });
      status("version-data", "3");
      status("redirect-ready", "1");
      return;
    }
  }
  const { manifest } = await request<{manifest: CaptureManifest}>({ type: "fable/CAPTURE_MANIFEST", id });
  validateManifest(manifest);
  // Pin the session in the URL, so reload cannot select a different pending recording.
  const url = new URL(window.location.href);
  url.searchParams.set("capture", manifest.id);
  window.history.replaceState(window.history.state, "", url);
  status("total-screen-count", String(manifest.chunks));
  const chunks: CaptureChunk[] = [];
  for (let index = 0; index < manifest.chunks; index++) {
    const { chunk } = await request<{chunk: CaptureChunk}>({ type: "fable/CAPTURE_CHUNK", id: manifest.id, index });
    chunks.push(chunk);
    status("number-of-screens-received-count", String(chunks.length));
  }
  const data = await validateCapture(manifest, chunks);
  const db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
  try { await commitCapture(db, data); } finally { db.close(); }
  await request({ type: "fable/CAPTURE_ACK", id: manifest.id, checksum: manifest.checksum });
  status("version-data", "3");
  status("redirect-ready", "1");
}

const runtime = globalThis as typeof globalThis & { fableCaptureTransferRunning?: boolean };
if (!runtime.fableCaptureTransferRunning) {
  runtime.fableCaptureTransferRunning = true;
  transfer().catch(error => status("capture-transfer-error", error.message));
}
