/** A screen requires its root document and screenshot; embedded documents may time out. */
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

export function recordingReadiness(expectedFrames: number[] | undefined, parts: RecordingPart[], embeddedFramesSettled = false): RecordingReadiness {
  const recorded = new Set(parts.filter(part => part.type === "serdom"
    && part.data !== null && typeof part.data === "object").map(part => part.frameId));
  const thumbnailMissing = !parts.some(part => part.type === "thumbnail"
    && typeof part.data === "string" && /^data:image\/(png|jpeg);base64,.+/.test(part.data));
  const hasExpectedFrames = !!expectedFrames?.length && expectedFrames.includes(0);
  const root = parts.find(part => part.type === "serdom" && part.frameId === 0)?.data;
  const postProcesses = root && typeof root === "object"
    ? (root as { postProcesses?: { type: string }[] }).postProcesses : undefined;
  // Chrome's frame inventory also includes hidden, removed and extension-owned frames.
  // The serializer's post-processing list describes the embedded documents actually
  // used by this saved screen. If there are none, only the root capture is required.
  // Keep the original expectations when metadata is absent or embedded content exists.
  const needsEmbeddedFrames = !Array.isArray(postProcesses)
    || postProcesses.some(process => process.type === "iframe" || process.type === "object");
  const requiredFrames = needsEmbeddedFrames ? expectedFrames || [0] : [0];
  const missingFrames = Array.from(new Set(requiredFrames)).filter(frame => !recorded.has(frame));
  const usable = recorded.has(0) && !thumbnailMissing;
  return { complete: hasExpectedFrames && usable && (missingFrames.length === 0 || embeddedFramesSettled),
    usable,
    missingFrames,
    thumbnailMissing,
    hasExpectedFrames };
}
