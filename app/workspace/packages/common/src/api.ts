import { fsec } from './fsec';
import { LogoutType } from './constants';
import { UnauthorizedReason } from './api-contract';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const LOG_ENDPOINT = process.env.REACT_APP_LOG_ENDPOINT as string;
const JOB_ENDPOINT = process.env.REACT_APP_JOB_ENDPOINT as string;
const API_VERSION = '/v1';
const BEHIND_AUTH = '/f';

export class ApiRequestError extends Error {
  readonly status: number;

  readonly responseBody: unknown;

  constructor(status: number, message: string, responseBody: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

export function isApiConflict(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 409;
}

export default async function api<T, M>(
  url: string,
  payload?: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: T;
    auth?: boolean;
    noRespExpected?: boolean;
    isLogEndpoint?: boolean;
    isJobEndpoint?: boolean;
  }
): Promise<M> {
  let auth = payload?.auth;
  let method = payload?.body ? 'POST' : 'GET';
  if (payload?.method) {
    method = payload.method;
  }
  if (method === 'POST' && auth === undefined) {
    auth = true;
  }
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(payload?.headers || {}),
  };

  if (auth) {
    // TODO error handling in case the user is not logged in or there is a token invalidation exception
    try {
      const token = await fsec.getAccessToken();
      const orgId = localStorage.getItem('fable/oid');
      const prefix = orgId ? `${orgId}:` : '';
      (headers as any).Authorization = `Bearer ${prefix}${token}`;
    } catch (e) {
      // TODO
      console.log('>> login again. msg', (e as Error).message);
      window.location.replace(`/logout?t=${LogoutType.AccessTokenInvalidated}`);
    }
  }

  let path = '';
  let endpoint = API_ENDPOINT;
  if (payload) {
    if (payload.isLogEndpoint) endpoint = LOG_ENDPOINT;
    else if (payload.isJobEndpoint) endpoint = JOB_ENDPOINT;
  }
  const apiPath = endpoint + API_VERSION + (auth ? BEHIND_AUTH : '');
  try {
    const _ = new URL(url);
  } catch (e) {
    path = apiPath;
  }

  let resp;
  if (payload === null || payload === undefined) {
    resp = await fetch(`${path}${url}`);
  } else {
    let body = null;
    if (payload?.body) {
      body = JSON.stringify(payload.body);
    }
    resp = await fetch(`${path}${url}`, {
      method,
      headers,
      body,
    });
  }

  if (!resp.ok) {
    let responseBody: unknown = null;
    let message = `Request failed with status ${resp.status}`;
    try {
      const textBody = await resp.text();
      if (textBody) {
        try {
          responseBody = JSON.parse(textBody);
        } catch (e) {
          responseBody = textBody;
        }
      }
      if (typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody) {
        message = String((responseBody as {message: unknown}).message);
      }
    } catch (e) {
      /* keep the status-based message */
    }

    if ((resp.status === 401 || resp.status === 403) && path.startsWith(apiPath)) {
      // take user to logout page
      let reason: UnauthorizedReason | undefined;
      try {
        const rawMessage = (responseBody as {message?: string})?.message;
        reason = rawMessage ? JSON.parse(rawMessage).r : undefined;
      } catch (e) {
        /* noop */
      }
      console.log('>> reason', reason);
      window.location.replace(`/logout?t=${LogoutType.APINotAutorized}&r=${reason || ''}`);
    }

    throw new ApiRequestError(resp.status, message, responseBody);
  }

  if (payload?.noRespExpected) {
    return {} as M;
  }

  const json = await resp.json();
  return json as M;
}
