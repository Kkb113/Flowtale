import { Message, SQS } from '@aws-sdk/client-sqs';

export interface QueueWorker {
  done: Promise<void>;
  stop: () => Promise<void>;
}

export async function processDelivery(
  sqs: SQS, url: string, message: Message, process: (message: Message, signal: AbortSignal) => Promise<void>,
  shutdown?: AbortSignal,
): Promise<void> {
  if (!message.ReceiptHandle) throw new Error('Queue delivery has no receipt handle');
  const handle = message.ReceiptHandle;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  shutdown?.addEventListener('abort', cancel, { once: true });
  if (shutdown?.aborted) cancel();
  let finished = false;
  let renewal: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout>;
  const renew = () => {
    if (controller.signal.aborted) return;
    timer = setTimeout(() => {
      renewal = sqs.changeMessageVisibility({ QueueUrl: url, ReceiptHandle: handle, VisibilityTimeout: 90 })
        .then(() => { if (!finished) renew(); })
        .catch(() => { controller.abort(); });
    }, 20000);
  };
  renew();
  try {
    if (controller.signal.aborted) throw new Error('Queue processing canceled; acknowledgement withheld');
    await process(message, controller.signal);
    finished = true;
    clearTimeout(timer!);
    await renewal;
    if (controller.signal.aborted) throw new Error('Queue lease was lost; acknowledgement withheld');
    await sqs.deleteMessage({ QueueUrl: url, ReceiptHandle: handle });
  } catch (error) {
    const receiveCount = Number(message.Attributes?.ApproximateReceiveCount || 1);
    // SQS redrive, rather than delete-and-resend, preserves delivery identity and DLQ guarantees.
    if (!controller.signal.aborted) await sqs.changeMessageVisibility({ QueueUrl: url,
      ReceiptHandle: handle, VisibilityTimeout: Math.min(30 * (2 ** Math.min(receiveCount - 1, 5)), 900),
    });
    throw error;
  } finally {
    finished = true;
    clearTimeout(timer!);
    await renewal;
    shutdown?.removeEventListener('abort', cancel);
  }
}

export function startQueueWorker(
  sqs: SQS, queueName: string, concurrency: number,
  process: (message: Message, signal: AbortSignal) => Promise<void>,
  report: (message: string) => void,
): QueueWorker {
  const polling = new AbortController();
  const active = new AbortController();
  let retryTimer: ReturnType<typeof setTimeout>;
  const pause = () => new Promise<void>(resolve => {
    const abort = () => { clearTimeout(retryTimer); polling.signal.removeEventListener('abort', abort); resolve(); };
    polling.signal.addEventListener('abort', abort, { once: true });
    retryTimer = setTimeout(() => { polling.signal.removeEventListener('abort', abort); resolve(); }, 5000);
  });
  const done = (async () => {
    const { QueueUrl: url } = await sqs.getQueueUrl({ QueueName: queueName }, { abortSignal: polling.signal });
    if (!url) throw new Error('Worker queue was not found');
    const { Attributes: attributes } = await sqs.getQueueAttributes({ QueueUrl: url, AttributeNames: ['RedrivePolicy'] },
      { abortSignal: polling.signal });
    if (!attributes?.RedrivePolicy) throw new Error('Worker queue requires a dead-letter redrive policy');
    while (!polling.signal.aborted) {
      try {
        const result = await sqs.receiveMessage({ QueueUrl: url, MaxNumberOfMessages: concurrency,
          WaitTimeSeconds: 20, VisibilityTimeout: 90, MessageAttributeNames: ['All'],
          MessageSystemAttributeNames: ['ApproximateReceiveCount'],
        }, { abortSignal: polling.signal });
        await Promise.all((result.Messages || []).map(async message => {
          try { await processDelivery(sqs, url, message, process, active.signal); }
          catch { report(`Queue delivery ${message.MessageId || 'unknown'} failed; retained for retry or DLQ`); }
        }));
      } catch {
        if (!polling.signal.aborted) { report('Queue polling failed; retrying'); await pause(); }
      }
    }
  })();
  let stopping: Promise<void> | undefined;
  return { done, stop: () => {
    if (!stopping) {
      polling.abort();
      const grace = setTimeout(() => active.abort(), 5000);
      stopping = done.finally(() => { clearTimeout(grace); active.abort(); });
    }
    return stopping;
  } };
}
