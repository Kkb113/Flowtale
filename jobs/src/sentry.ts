import {init, captureCheckIn} from '@sentry/node';

export const sentryInitialize = () => {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV,
    tracesSampleRate: 1.0,
  });
};

export const sentrySuccess = (checkInId: string, jobName: string) => {
  captureCheckIn({
    checkInId,
    monitorSlug: jobName,
    status: 'ok',
  });
};

export const sentryProgress = (jobName: string) => {
  const checkInId = captureCheckIn({
    monitorSlug: jobName,
    status: 'in_progress',
  });
  return checkInId;
};