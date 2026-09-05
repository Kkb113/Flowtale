import express, { Request, Response } from 'express';
import cors from 'cors';
import pino from 'pino-http';
import mainMsgLoop from './main_msg_loop';
import * as log from './log';
import { apiConnectionPool, clientAnalytics } from './db';
import { sentryInitialize } from './sentry';
import { authenticateUser } from './middlewares/resolve-principal';
import globalErrorHandler from './middlewares/global-err-handler';
import { verifySlackRequest } from './middlewares/slack-signature';

async function start() {
  const required = ['APP_ENV', 'SQS_Q_REGION', 'SQS_Q_NAME', 'DB_CONN_URL', 'DB_USER', 'DB_PWD', 'DB_DB',
    'AWS_ASSET_FILE_S3_BUCKET', 'AWS_ASSET_FILE_S3_BUCKET_REGION', 'ANALYTICS_DB_CONN_URL',
    'ANALYTICS_DB_NAME', 'ANALYTICS_DB_USER', 'ANALYTICS_DB_PWD', 'API_SERVER_ENDPOINT', 'INTERNAL_SERVICE_TOKEN'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Required configuration is missing: ${missing.join(', ')}`);
  if (['prod', 'staging'].includes(process.env.APP_ENV || '')) sentryInitialize();

  const app = express();
  app.use(cors());
  app.use(express.urlencoded({ extended: false, limit: '1mb', verify: (req, res, buffer) => {
    (req as Request).rawBody = buffer;
  } }));
  app.use(express.json({ limit: '2mb', verify: (req, res, buffer) => { (req as Request).rawBody = buffer; } }));
  app.use(pino({ redact: ['req.headers', 'res.headers', 'req.url'], level: 'warn' }));
  app.use('/v1/f', authenticateUser);
  app.get('/health', (req: Request, res: Response) => { res.json({ status: 'up' }); });

  if (process.env.ANTHORIPC_KEY) (await import('./http/llm-ops')).default(app);
  else app.use('/v1/f/llmops', (req, res) => { res.status(503).json({ message: 'AI is not configured; manual editing is available' }); });
  if (process.env.OPENAI_KEY) (await import('./http/audio-ops')).default(app);
  else app.use('/v1/f/aud', (req, res) => { res.status(503).json({ message: 'Speech generation is not configured' }); });
  if (process.env.SLACK_SIGNING_SECRET) {
    app.use('/v1/slack', verifySlackRequest);
    (await import('./http/slack')).default(app);
  }
  app.use(globalErrorHandler);

  const server = app.listen(Number(process.env.PORT || 8081), process.env.HOST || '0.0.0.0');
  const worker = mainMsgLoop();
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    log.info('Stopping new requests and draining active queue work');
    const deadline = setTimeout(() => {
      log.warn('Shutdown deadline reached; unacknowledged work remains in the queue');
      server.closeAllConnections();
      process.exit(1);
    }, 30000);
    deadline.unref();
    const httpClosed = new Promise<void>(resolve => server.close(() => resolve()));
    try {
      await Promise.all([worker.stop(), httpClosed]);
    } finally {
      try { await Promise.all([apiConnectionPool.end(), clientAnalytics.end()]); }
      finally { clearTimeout(deadline); }
    }
  };
  const requestShutdown = () => { shutdown().catch(() => { process.exitCode = 1; }); };
  process.once('SIGTERM', requestShutdown);
  process.once('SIGINT', requestShutdown);
  worker.done.catch(error => { log.err(error.message); process.exitCode = 1; requestShutdown(); });
}

start().catch(error => { log.err(error.message); process.exitCode = 1; });

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      house: { iam: { id: string; orgId: number } };
      relay: { rawToken: string; orgId: number };
    }
  }
}
