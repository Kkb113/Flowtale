import api from '@fable/common/dist/api';
import { ApiResp, JobProcessingStatus, RespMediaProcessingInfo } from '@fable/common/dist/api-contract';

function pause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const canceled = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', canceled);
      reject(new Error('Media processing canceled'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', canceled);
      resolve();
    }, 2000);
    signal.addEventListener('abort', canceled, { once: true });
    if (signal.aborted) canceled();
  });
}

/** Never attach unready output URLs to an annotation. Job completion includes every durable output upload. */
export async function waitForMedia(jobs: RespMediaProcessingInfo[], signal?: AbortSignal,): Promise<RespMediaProcessingInfo[]> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = (): void => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(() => { timedOut = true; cancel(); }, 15 * 60 * 1000);
  try {
    let current = jobs;
    if (!current.length || current.some(job => !Number.isSafeInteger(job.jobId) || job.jobId <= 0)) {
      throw new Error('The server did not return valid media jobs');
    }
    while (!controller.signal.aborted) {
      if (current.some(job => job.processingState === JobProcessingStatus.Failed)) {
        throw new Error('Media processing failed. Your recording has been retained; retry or choose another file.');
      }
      if (current.every(job => job.processingState === JobProcessingStatus.Processed)) return current;
      if (current.some(job => ![JobProcessingStatus.Touched, JobProcessingStatus.InProcess,
        JobProcessingStatus.Processed].includes(job.processingState))) throw new Error('Unknown media processing state');
      await pause(controller.signal);
      current = await Promise.all(current.map(async job => {
        if (job.processingState === JobProcessingStatus.Processed) return job;
        const response = await api<null, ApiResp<RespMediaProcessingInfo>>(`/mediajobs/${job.jobId}`, {
          auth: true, signal: controller.signal, timeoutMs: 30000,
        });
        if (response.data.jobId !== job.jobId) throw new Error('The server returned a different media job');
        return response.data;
      }));
    }
    throw new Error('Media processing canceled');
  } catch (error) {
    if (timedOut) throw new Error('Media processing is taking too long. Your recording has been retained; retry to check it.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
