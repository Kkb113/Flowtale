import { Message, SQS } from '@aws-sdk/client-sqs';
import { createHash } from 'node:crypto';
import { PoolConnection } from 'mysql2/promise';
import { TMsgAttrs } from './types';
import transcodeVideo from './processors/media/video_transcoder';
import transcodeAudio from './processors/media/audio_transcoder';
import * as log from './log';
import { getApiConnection } from './db';
import { JobProcessingStatus } from './api-contract';
import NonRunnableErr from './irrecoverable_err';
import { CONCURRENCY } from './consts';
import { startQueueWorker } from './queue-worker';

async function query<T>(connection: PoolConnection, sql: string, values: unknown[]): Promise<T> {
  const [rows] = await connection.query(sql, values);
  return rows as T;
}

export async function processJob(message: Message, signal: AbortSignal): Promise<void> {
  const attributes: TMsgAttrs = {};
  for (const [key, value] of Object.entries(message.MessageAttributes || {})) attributes[key] = value.StringValue;
  if (message.Body === 'NF' || message.Body === 'CBE') {
    if (process.env.APP_ENV === 'local' && process.env.INTEGRATIONS_ENABLED !== 'true') {
      log.info('Optional integration event skipped in local mode');
      return;
    }
    if (message.Body === 'NF') {
      const { processEventsForDestination } = await import('./processors/mics');
      await processEventsForDestination(attributes);
    } else {
      const { sendEventToCobalt } = await import('./processors/cobalt');
      await sendEventToCobalt(attributes);
    }
    return;
  }
  if (message.Body === 'SUBS_UPGRADE_DOWNGRADE_SIDE_EFFECT') {
    const { upgradeDowngradeSideEffect } = await import('./processors/upgrade-downgrade-sideffect');
    await upgradeDowngradeSideEffect(attributes);
    return;
  }
  if (!attributes.key) {
    const body = JSON.parse(message.Body || '{}');
    if (body.type !== 'TRIGGER_ANALYTICS_JOB') throw new NonRunnableErr('Unknown queue message type');
    const { routeAnalyticsJob } = await import('./analytics/event_router');
    await routeAnalyticsJob(body);
    return;
  }
  if (!['TRANSCODE_VIDEO', 'TRANSCODE_AUDIO'].includes(message.Body || '')) {
    throw new NonRunnableErr('Unsupported media job');
  }
  const type = message.Body!;
  const connection = await getApiConnection();
  const lock = `media:${createHash('sha256').update(`${type}:${attributes.key}`).digest('hex').slice(0, 56)}`;
  let acquired = false;
  try {
    const claim = await query<{acquired: number}[]>(connection, 'SELECT GET_LOCK(?, 0) AS acquired', [lock]);
    acquired = claim[0]?.acquired === 1;
    if (!acquired) throw new Error('Media job is already being processed');
    const rows = await query<{processing_status: JobProcessingStatus; info: TMsgAttrs | string}[]>(connection,
      'SELECT processing_status, info FROM jobs WHERE job_type = ? AND job_key = ?', [type, attributes.key]);
    if (!rows.length) throw new Error('Media job has not committed yet');
    if (rows[0].processing_status === JobProcessingStatus.Processed) return;
    const saved = typeof rows[0].info === 'string' ? JSON.parse(rows[0].info) : rows[0].info;
    if (!saved || saved.key !== attributes.key || saved.type !== type) throw new NonRunnableErr('Invalid media job record');
    // The queue identifies work. Only the committed database row supplies source and output locations.
    await query(connection, 'UPDATE jobs SET processing_status = ?, failure_reason = NULL WHERE job_type = ? AND job_key = ?',
      [JobProcessingStatus.InProcess, type, attributes.key]);
    try {
      let info;
      if (type === 'TRANSCODE_VIDEO') info = await transcodeVideo(saved, signal);
      else if (type === 'TRANSCODE_AUDIO') info = await transcodeAudio(saved, signal);
      else throw new NonRunnableErr('Unsupported media job');
      if (signal.aborted) throw new Error('Media job lease lost');
      await query(connection, 'UPDATE jobs SET processing_status = ?, info = ? WHERE job_type = ? AND job_key = ?',
        [JobProcessingStatus.Processed, JSON.stringify(info), type, attributes.key]);
    } catch (error) {
      await query(connection, 'UPDATE jobs SET processing_status = ?, failure_reason = ? WHERE job_type = ? AND job_key = ?',
        [JobProcessingStatus.Failed, 'Media processing failed; retry or inspect the dead-letter queue', type, attributes.key]);
      throw error;
    }
  } finally {
    try { if (acquired) await query(connection, 'SELECT RELEASE_LOCK(?)', [lock]); }
    finally { connection.release(); }
  }
}

export default function mainMsgLoop() {
  const sqs = new SQS({ region: process.env.SQS_Q_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_SQS || process.env.AWS_ENDPOINT_URL });
  const worker = startQueueWorker(sqs, process.env.SQS_Q_NAME || '', CONCURRENCY, processJob, log.warn);
  return { done: worker.done, stop: async () => { try { await worker.stop(); } finally { sqs.destroy(); } } };
}
