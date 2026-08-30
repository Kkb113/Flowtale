export function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (reader.readyState === FileReader.DONE) {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      } else {
        reject(new Error('Failed to convert Blob to Uint8Array.'));
      }
    };

    reader.readAsArrayBuffer(blob);
  });
}
