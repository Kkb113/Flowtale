import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { RefForMMV } from './contract';

export class PrivateAssetError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message); }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BATCH_BYTES = 40 * 1024 * 1024;
const TEMPLATE_KEY = 'staging/root/global/sample_ann.png';

export const privateAssetConfig = () => ({
  bucket: process.env.AWS_PRIVATE_ASSET_S3_BUCKET || 'pvt-mics',
  prefix: `${process.env.APP_ENV}/${process.env.AWS_ASSET_ROOT_QUALIFIER || 'root'}/tour_data/org/`,
});

const s3 = new S3Client({
  region: process.env.AWS_PRIVATE_ASSET_S3_BUCKET_REGION || 'ap-south-1',
  ...(process.env.AWS_ENDPOINT_URL_S3 ? { endpoint: process.env.AWS_ENDPOINT_URL_S3, forcePathStyle: true } : {}),
});

/** Authorize the entire batch before reading any object. Legacy unscoped captures must be reuploaded. */
export async function readPrivateImages(
  orgId: number,
  refs: RefForMMV[],
  signal?: AbortSignal,
  client: Pick<S3Client, 'send'> = s3,
  config = privateAssetConfig(),
): Promise<Array<RefForMMV & { data: string; type: 'image/png' | 'image/jpeg' }>> {
  if (!Number.isSafeInteger(orgId) || orgId <= 0) throw new PrivateAssetError(403, 'Workspace access is required');
  if (!Array.isArray(refs) || refs.length > 50) throw new PrivateAssetError(413, 'Choose at most 50 images for AI');
  const prefix = `${config.prefix}${orgId}/`;
  for (const ref of refs) {
    const key = ref?.url;
    if (typeof key !== 'string' || (key !== TEMPLATE_KEY && (!key.startsWith(prefix)
      || !/^[A-Za-z0-9_-]{8,128}\/llmops\/[A-Za-z0-9][A-Za-z0-9_.-]{0,191}$/.test(key.slice(prefix.length))
      || key.includes('..')))) {
      throw new PrivateAssetError(403, 'AI images must belong to this workspace. Upload the capture again to retry.');
    }
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, 30_000);
  let total = 0;
  const result: Array<RefForMMV & { data: string; type: 'image/png' | 'image/jpeg' }> = [];
  try {
    // Sequential reads cap concurrent memory and share a single batch deadline and byte budget.
    for (const ref of refs) {
      if (controller.signal.aborted) throw new PrivateAssetError(504, 'AI image loading timed out. Retry the request.');
      const object = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: ref.url }), { abortSignal: controller.signal });
      const body = object.Body as Readable | undefined;
      if (!body || typeof body.destroy !== 'function') throw new PrivateAssetError(422, 'An AI image is unavailable. Upload it again.');
      const stop = () => body.destroy(new PrivateAssetError(504, 'AI image loading timed out. Retry the request.'));
      controller.signal.addEventListener('abort', stop, { once: true });
      try {
        if (controller.signal.aborted) throw new PrivateAssetError(504, 'AI image loading timed out. Retry the request.');
        if ((object.ContentLength || 0) > MAX_IMAGE_BYTES) throw new PrivateAssetError(413, 'An AI image exceeds 5 MB');
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of body) {
          const bytes = Buffer.from(chunk);
          size += bytes.length;
          total += bytes.length;
          if (size > MAX_IMAGE_BYTES || total > MAX_BATCH_BYTES) throw new PrivateAssetError(413, 'AI images exceed the upload size limit');
          chunks.push(bytes);
        }
        const data = Buffer.concat(chunks);
        const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
        const type = png ? 'image/png' : jpeg ? 'image/jpeg' : undefined;
        if (!type || object.ContentType?.split(';')[0] !== type) throw new PrivateAssetError(422, 'An AI image has an unsupported format');
        result.push({ ...ref, type, data: data.toString('base64') });
      } finally {
        controller.signal.removeEventListener('abort', stop);
        body.destroy();
      }
    }
    return result;
  } catch (error) {
    if (error instanceof PrivateAssetError) throw error;
    throw new PrivateAssetError(controller.signal.aborted ? 504 : 422, 'AI images could not be loaded. Your capture is retained; retry the request.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
