import { v4 as uuidv4 } from 'uuid';
import {
  EventLog,
  FlattendEventLog,
  FableAnalyticsLocalStoreKeys,
} from './types';

export const getUUID = (): string => uuidv4().replace(/\W+/g, '');

export const getAnonymousUserId = (): string => {
  const aid = localStorage.getItem(FableAnalyticsLocalStoreKeys.AnonymousUserId);
  if (!aid) {
    const newAid = getUUID();
    localStorage.setItem(FableAnalyticsLocalStoreKeys.AnonymousUserId, newAid);
    return newAid;
  }
  return aid;
};

// Generate a new session id after 10mins of inactivity
// WARN Use this sessionId only for analytics as session gets invalidated after expiry
export const getSessionId = (): string => {
  const sid = sessionStorage.getItem(FableAnalyticsLocalStoreKeys.SessionId);
  const expiry = sessionStorage.getItem(FableAnalyticsLocalStoreKeys.SessionIdExpireAt);
  // set session id expiry 10mins in future
  const expireAfterSeconds = 10 * 60;
  sessionStorage.setItem(
    FableAnalyticsLocalStoreKeys.SessionIdExpireAt,
    String(Math.floor((+new Date() / 1000) + expireAfterSeconds))
  );

  let sessionIdExpired = false;
  let expiryNum;
  if (expiry && Number.isFinite(expiryNum = +expiry) && expiryNum < Math.floor((+new Date() / 1000))) {
    sessionIdExpired = true;
  }

  if (!sid || sessionIdExpired) {
    const newSid = getUUID();
    sessionStorage.setItem(FableAnalyticsLocalStoreKeys.SessionId, newSid);
    return newSid;
  }

  return sid;
};

export const getUtcUnixTimestamp = (date: Date): number => (+date / 1000) | 0;

export const getTimezoneOffset = (date: Date): string => `${date.getTimezoneOffset()}`;

export const removeSessionId = (): void => {
  sessionStorage.removeItem(FableAnalyticsLocalStoreKeys.SessionId);
};

export const flattenLogEvent = (logs: EventLog): FlattendEventLog => {
  const { payload, ...rest } = logs;
  const flattenedPayload = Object.keys(payload).reduce((acc, key) => {
    acc[`payload_${key}` as keyof typeof acc] = payload[key as keyof typeof payload];
    return acc;
  }, {} as Record<string, string | number>);
  return { ...rest, ...flattenedPayload };
};
