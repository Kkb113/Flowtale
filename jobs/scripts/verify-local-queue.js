// Run inside the jobs image on fable-local_local, with this directory mounted at /usr/sqs_jobs/scripts.
// Uses temporary queues only; never consumes the application queue or sends external messages.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { SQS } = require('@aws-sdk/client-sqs');
const { processDelivery, startQueueWorker } = require('../dist/src/queue-worker');

const endpoint = process.env.LOCAL_QUEUE_TEST_ENDPOINT || 'http://queue:9324';
if (!['localstack', 'queue', 'fable-phase0-queue-probe'].includes(new URL(endpoint).hostname)) {
  throw new Error('Queue verification only supports isolated local services');
}
const sqs = new SQS({ endpoint, region: 'ap-south-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, maxAttempts: 2 });
const name = `phase0-verification-${randomUUID()}`;
const createdQueues = [];
const deadline = setTimeout(() => { console.error('Local queue verification timed out'); process.exit(1); }, 120000);

async function receive(url) {
  const result = await sqs.receiveMessage({ QueueUrl: url, WaitTimeSeconds: 1, MaxNumberOfMessages: 1,
    VisibilityTimeout: 90, MessageSystemAttributeNames: ['ApproximateReceiveCount'] });
  return result.Messages?.[0];
}

async function main() {
  const dlq = (await sqs.createQueue({ QueueName: `${name}-dlq` })).QueueUrl;
  createdQueues.push(dlq);
  const arn = (await sqs.getQueueAttributes({ QueueUrl: dlq, AttributeNames: ['QueueArn'] })).Attributes.QueueArn;
  const url = (await sqs.createQueue({ QueueName: name, Attributes: {
    RedrivePolicy: JSON.stringify({ deadLetterTargetArn: arn, maxReceiveCount: '5' }), VisibilityTimeout: '90',
  } })).QueueUrl;
  createdQueues.push(url);

  const failure = await sqs.sendMessage({ QueueUrl: url, MessageBody: 'deterministic processor failure' });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const message = await receive(url);
    assert.equal(message?.MessageId, failure.MessageId);
    assert.equal(Number(message.Attributes.ApproximateReceiveCount), attempt);
    await assert.rejects(processDelivery(sqs, url, message, async () => { throw new Error('fixture failure'); }),
      /fixture failure/);
    // Compress only the test retry delay; the worker still sets the real bounded retry visibility.
    await sqs.changeMessageVisibility({ QueueUrl: url, ReceiptHandle: message.ReceiptHandle, VisibilityTimeout: 0 });
  }
  assert.equal(await receive(url), undefined, 'Exhausted delivery must leave the source queue');
  const exhausted = await receive(dlq);
  assert.equal(exhausted?.MessageId, failure.MessageId, 'The DLQ must preserve the original delivery identity');
  console.log('PASS: failed work is retried five times and reaches the real DLQ without false acknowledgement');

  await sqs.sendMessage({ QueueUrl: url, MessageBody: 'slow successful processor' });
  const slow = await receive(url);
  assert.ok(slow);
  let renewals = 0;
  const observed = {
    changeMessageVisibility: async request => { renewals += 1; return sqs.changeMessageVisibility(request); },
    deleteMessage: request => sqs.deleteMessage(request),
  };
  await processDelivery(observed, url, slow, async () => {
    await delay(21000);
    assert.equal(await receive(url), undefined, 'Active work must remain invisible');
  });
  assert.ok(renewals >= 1, 'Slow work must renew its lease');
  assert.equal(await receive(url), undefined, 'Completed work must be acknowledged');
  console.log('PASS: slow work renews its real SQS lease and acknowledges only after completion');

  const interruption = await sqs.sendMessage({ QueueUrl: url, MessageBody: 'interrupted processor' });
  let started;
  const processing = new Promise(resolve => { started = resolve; });
  let receipt;
  let canceled = false;
  const worker = startQueueWorker(sqs, name, 1, async (message, signal) => {
    receipt = message.ReceiptHandle;
    started();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => {
      canceled = true;
      reject(new Error('Shutdown'));
    }, { once: true }));
  }, () => {});
  await processing;
  await worker.stop();
  assert.equal(canceled, true);
  await sqs.changeMessageVisibility({ QueueUrl: url, ReceiptHandle: receipt, VisibilityTimeout: 0 });
  const recovered = await receive(url);
  assert.equal(recovered?.MessageId, interruption.MessageId, 'Shutdown must retain unfinished work');
  await processDelivery(sqs, url, recovered, async () => {});
  assert.equal(await receive(url), undefined);
  console.log('PASS: graceful shutdown cancels slow processing, retains delivery and permits recovery');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try {
    for (const url of createdQueues.reverse()) await sqs.deleteQueue({ QueueUrl: url });
  } finally { clearTimeout(deadline); sqs.destroy(); }
});
