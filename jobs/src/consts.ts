export const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 2);
if (!Number.isSafeInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 10) {
  throw new Error('WORKER_CONCURRENCY must be an integer between 1 and 10');
}
