/** Fetch a captured screenshot without relabeling PNG bytes as JPEG. */
export async function fetchAiImage(url: string): Promise<File> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const limit = 5 * 1024 * 1024;
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok || !response.body) throw new Error('The AI screenshot could not be loaded');
    const reader = response.body.getReader();
    let complete = false;
    try {
      if (Number(response.headers.get('content-length')) > limit) throw new Error('The AI screenshot exceeds 5 MB');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) { complete = true; break; }
        size += value.byteLength;
        if (size > limit) throw new Error('The AI screenshot exceeds 5 MB');
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.byteLength; });
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!png && !jpeg) throw new Error('The AI screenshot must be PNG or JPEG');
      return new File([bytes], png ? 'screenshot.png' : 'screenshot.jpeg', { type: png ? 'image/png' : 'image/jpeg' });
    } finally {
      if (!complete) await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  } finally {
    clearTimeout(timer);
  }
}
