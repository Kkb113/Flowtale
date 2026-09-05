import { SQS } from '@aws-sdk/client-sqs';
import { processDelivery, startQueueWorker } from './queue-worker';

function queue() {
  return { changeMessageVisibility: jest.fn().mockResolvedValue({}), deleteMessage: jest.fn().mockResolvedValue({}) };
}
const message = { MessageId: 'delivery-1', ReceiptHandle: 'receipt', Attributes: { ApproximateReceiveCount: '2' } };

describe('queue acknowledgement', () => {
  afterEach(() => jest.useRealTimers());

  it('waits for the processor and its durable writes before deleting', async () => {
    const sqs = queue();
    let finish!: () => void;
    const delivery = processDelivery(sqs as unknown as SQS, 'queue', message,
      () => new Promise<void>(resolve => { finish = resolve; }));
    expect(sqs.deleteMessage).not.toHaveBeenCalled();
    finish();
    await delivery;
    expect(sqs.deleteMessage).toHaveBeenCalledWith({ QueueUrl: 'queue', ReceiptHandle: 'receipt' });
  });

  it('retains failed work for bounded redrive instead of acknowledging it', async () => {
    const sqs = queue();
    await expect(processDelivery(sqs as unknown as SQS, 'queue', message,
      async () => { throw new Error('storage failed'); })).rejects.toThrow('storage failed');
    expect(sqs.deleteMessage).not.toHaveBeenCalled();
    expect(sqs.changeMessageVisibility).toHaveBeenCalledWith({
      QueueUrl: 'queue', ReceiptHandle: 'receipt', VisibilityTimeout: 60,
    });
  });

  it('renews slow work and withholds acknowledgement after losing the lease', async () => {
    jest.useFakeTimers();
    const sqs = queue();
    sqs.changeMessageVisibility.mockRejectedValue(new Error('lease lost'));
    let finish!: () => void;
    let signal!: AbortSignal;
    const delivery = processDelivery(sqs as unknown as SQS, 'queue', message, async (msg, cancellation) => {
      signal = cancellation;
      await new Promise<void>(resolve => { finish = resolve; });
    });
    const assertion = expect(delivery).rejects.toThrow('lease was lost');
    await jest.advanceTimersByTimeAsync(20000);
    expect(signal.aborted).toBe(true);
    finish();
    await assertion;
    expect(sqs.deleteMessage).not.toHaveBeenCalled();
  });

  it('allows a shutdown grace period, then cancels slow work without acknowledging it', async () => {
    jest.useFakeTimers();
    const sqs = { ...queue(), getQueueUrl: jest.fn().mockResolvedValue({ QueueUrl: 'queue' }),
      getQueueAttributes: jest.fn().mockResolvedValue({ Attributes: { RedrivePolicy: '{}' } }),
      receiveMessage: jest.fn().mockResolvedValue({ Messages: [message] }),
    };
    let started!: () => void;
    let signal!: AbortSignal;
    const processing = new Promise<void>(resolve => { started = resolve; });
    const worker = startQueueWorker(sqs as unknown as SQS, 'queue', 1, async (msg, cancellation) => {
      signal = cancellation;
      started();
      await new Promise<void>((resolve, reject) => cancellation.addEventListener('abort',
        () => reject(new Error('Canceled')), { once: true }));
    }, jest.fn());
    await processing;
    const stopping = worker.stop();
    expect(worker.stop()).toBe(stopping);
    expect(signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(5000);
    await stopping;
    expect(signal.aborted).toBe(true);
    expect(sqs.deleteMessage).not.toHaveBeenCalled();
    expect(sqs.receiveMessage).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
