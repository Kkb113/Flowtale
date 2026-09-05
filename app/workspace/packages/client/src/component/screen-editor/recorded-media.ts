export function recordingMimeType(kind: 'audio' | 'video'): string {
  const candidates = kind === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/webm']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  const mimeType = candidates.find(candidate => MediaRecorder.isTypeSupported(candidate));
  if (!mimeType) throw new Error('This browser cannot record this media format. Upload an existing recording instead.');
  return mimeType;
}

/** The final dataavailable event precedes stop; creating the Blob immediately after stop() loses that data. */
export function finishRecording(recorder: MediaRecorder, parts: Blob[], signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      recorder.removeEventListener('stop', stopped);
      recorder.removeEventListener('error', failed);
      signal.removeEventListener('abort', canceled);
    };
    const failed = (): void => { cleanup(); reject(new Error('The recording could not be finalized. Please record again.')); };
    const canceled = (): void => { cleanup(); reject(new Error('Recording canceled')); };
    const stopped = (): void => {
      cleanup();
      const blob = new Blob(parts, { type: recorder.mimeType });
      if (!blob.size) reject(new Error('The recording is empty. Please record again.'));
      else resolve(blob);
    };
    const timer = setTimeout(failed, 15000);
    recorder.addEventListener('stop', stopped, { once: true });
    recorder.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', canceled, { once: true });
    if (signal.aborted) { canceled(); return; }
    try { recorder.stop(); } catch { failed(); }
  });
}
