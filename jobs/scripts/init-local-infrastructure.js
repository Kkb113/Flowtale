// Local development bootstrap only. No production endpoints or credentials are accepted.
const { S3 } = require('@aws-sdk/client-s3');
const { SQS } = require('@aws-sdk/client-sqs');
const { setTimeout: delay } = require('node:timers/promises');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { draftDocumentDenyStatement } = require('./migrate-draft-storage');
const options = { region: 'ap-south-1', credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  maxAttempts: 1, requestHandler: { connectionTimeout: 2000, requestTimeout: 5000 } };
const s3 = new S3({ ...options, endpoint: 'http://storage:8333', forcePathStyle: true });
const sqs = new SQS({ ...options, endpoint: 'http://queue:9324' });
const deadline = setTimeout(() => { console.error('Local infrastructure initialization timed out'); process.exit(1); }, 180000);

async function ready() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await s3.listBuckets({});
      await sqs.getQueueUrl({ QueueName: 'tour_app_queue' });
      return;
    } catch (error) {
      if (attempt === 59) throw error;
      await delay(1000);
    }
  }
}

async function main() {
  await ready();
  for (const Bucket of ['fable-local-assets', 'fable-local-private']) {
    try { await s3.headBucket({ Bucket }); } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
      await s3.createBucket({ Bucket });
    }
    await s3.putBucketCors({ Bucket, CORSConfiguration: { CORSRules: [{
      AllowedHeaders: ['*'], AllowedMethods: ['GET', 'HEAD', 'PUT'],
      AllowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'], ExposeHeaders: ['ETag'],
    }] } });
  }
  // Preserve existing policy statements, including the private-draft migration boundary.
  let policy = { Version: '2012-10-17', Statement: [] };
  try { policy = JSON.parse((await s3.getBucketPolicy({ Bucket: 'fable-local-assets' })).Policy); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NoSuchBucketPolicy') throw error; }
  const deny = draftDocumentDenyStatement('fable-local-assets', 'local');
  policy.Statement = policy.Statement.filter(statement => !['FableLocalPublicRead', deny.Sid].includes(statement.Sid));
  policy.Statement.push({ Sid: 'FableLocalPublicRead', Effect: 'Allow', Principal: '*', Action: 's3:GetObject',
    Resource: 'arn:aws:s3:::fable-local-assets/*' }, deny);
  await s3.putBucketPolicy({ Bucket: 'fable-local-assets', Policy: JSON.stringify(policy) });
  // A listening HTTP socket does not prove that the persistence backend can commit writes.
  const Key = `health/${randomUUID()}`;
  const Bucket = 'fable-local-private';
  await s3.putObject({ Bucket, Key, Body: 'local storage ready' });
  const object = await s3.getObject({ Bucket, Key });
  assert.equal(await object.Body.transformToString(), 'local storage ready');
  await s3.deleteObject({ Bucket, Key });
  const QueueUrl = (await sqs.createQueue({ QueueName: `local-readiness-${randomUUID()}` })).QueueUrl;
  try {
    const sent = await sqs.sendMessage({ QueueUrl, MessageBody: 'local queue ready' });
    const received = (await sqs.receiveMessage({ QueueUrl, WaitTimeSeconds: 1 })).Messages?.[0];
    assert.equal(received?.MessageId, sent.MessageId);
    await sqs.deleteMessage({ QueueUrl, ReceiptHandle: received.ReceiptHandle });
  } finally { await sqs.deleteQueue({ QueueUrl }); }
  console.log('Local object storage and durable queue initialized and verified');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  clearTimeout(deadline); s3.destroy(); sqs.destroy();
});
