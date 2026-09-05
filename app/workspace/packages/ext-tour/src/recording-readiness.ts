/** Completion is based on captured parts, never on elapsed time or the tab's current frame list. */
export interface RecordingPart {
  frameId: number;
  type: "serdom" | "thumbnail" | "sigstop" | "sigskip";
  data: unknown;
}

export interface RecordingReadiness {
  complete: boolean;
  usable: boolean;
  missingFrames: number[];
  thumbnailMissing: boolean;
  hasExpectedFrames: boolean;
}

export function recordingReadiness(expectedFrames: number[] | undefined, parts: RecordingPart[]): RecordingReadiness {
  const recorded = new Set(parts.filter(part => part.type === "serdom"
    && part.data !== null && typeof part.data === "object").map(part => part.frameId));
  const thumbnailMissing = !parts.some(part => part.type === "thumbnail"
    && typeof part.data === "string" && /^data:image\/(png|jpeg);base64,.+/.test(part.data));
  const hasExpectedFrames = !!expectedFrames?.length && expectedFrames.includes(0);
  const missingFrames = Array.from(new Set(expectedFrames || [0])).filter(frame => !recorded.has(frame));
  const usable = recorded.has(0) && !thumbnailMissing;
  return { complete: hasExpectedFrames && usable && missingFrames.length === 0,
    usable,
    missingFrames,
    thumbnailMissing,
    hasExpectedFrames };
}
