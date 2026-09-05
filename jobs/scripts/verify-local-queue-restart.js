// Called by the local restart check, on an isolated queue owned by this invocation.
const assert = require('node:assert/strict');
const { SQS } = require('@aws-sdk/client-sqs');
const [mode, id] = process.argv.slice(2);
if (!['write', 'read'].includes(mode) || !/^[a-f0-9-]{36}$/.test(id || '')) {
  throw new Error('Expected write/read and a verification UUID');
}
const sqs = new SQS({ endpoint: 'http://queue:9324', region: 'ap-south-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, maxAttempts: 2,
  requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 } });
const QueueName = `phase0-restart-${id}`;
const deadline = setTimeout(() => { console.error('Queue restart check timed out'); process.exit(1); }, 60000);

async function main() {
  if (mode === 'write') {
    const QueueUrl = (await sqs.createQueue({ QueueName })).QueueUrl;
    await sqs.sendMessage({ QueueUrl, MessageBody: 'already acknowledged' });
    const acknowledged = (await sqs.receiveMessage({ QueueUrl, WaitTimeSeconds: 1 })).Messages?.[0];
    assert.equal(acknowledged?.Body, 'already acknowledged');
    await sqs.deleteMessage({ QueueUrl, ReceiptHandle: acknowledged.ReceiptHandle });
    await sqs.sendMessage({ QueueUrl, MessageBody: id });
    console.log('PASS: committed queued work and acknowledgement before restart');
  } else {
    const QueueUrl = (await sqs.getQueueUrl({ QueueName })).QueueUrl;
    const recovered = (await sqs.receiveMessage({ QueueUrl, WaitTimeSeconds: 1 })).Messages?.[0];
    assert.equal(recovered?.Body, id, 'Restart must recover the pending payload');
    await sqs.deleteMessage({ QueueUrl, ReceiptHandle: recovered.ReceiptHandle });
    const remaining = await sqs.receiveMessage({ QueueUrl, WaitTimeSeconds: 1 });
    assert.equal(remaining.Messages?.length || 0, 0, 'Restart must not resurrect acknowledged work');
    await sqs.deleteQueue({ QueueUrl });
    console.log('PASS: pending payload survives restart and acknowledged work stays deleted');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  clearTimeout(deadline); sqs.destroy();
});
