interface BrowserFrame { frameId: number; parentFrameId: number; url: string }

/** Each cross-origin boundary needs a recorder, even when a descendant returns to the top origin. */
export function captureFrameIds(frames: BrowserFrame[]): number[] {
  const byId = new Map(frames.map(frame => [frame.frameId, frame]));
  const origin = (frame: BrowserFrame, visited = new Set<number>()): string | null => {
    if (visited.has(frame.frameId)) return null;
    visited.add(frame.frameId);
    if (!frame.url || ["about:blank", "about:srcdoc"].includes(frame.url)) {
      const parent = byId.get(frame.parentFrameId);
      return parent ? origin(parent, visited) : null;
    }
    try { return new URL(frame.url).origin; } catch { return null; }
  };
  return frames.filter(frame => {
    if (frame.frameId === 0) return true;
    const parent = byId.get(frame.parentFrameId);
    const childOrigin = origin(frame);
    return !parent || !childOrigin || childOrigin === "null" || childOrigin !== origin(parent);
  }).map(frame => frame.frameId);
}
