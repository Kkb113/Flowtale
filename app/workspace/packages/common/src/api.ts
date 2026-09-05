import { fsec } from './fsec';
import { LogoutType } from './constants';
import { UnauthorizedReason } from './api-contract';
import { isDraftAssetUrl } from './draft-assets';

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

function accessToken(timeoutMs: number, signal?: AbortSignal, getAccessToken = fsec.getAccessToken): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    };
    const cancel = (): void => {
      cleanup();
      const error = new Error('API request canceled or timed out');
      error.name = 'AbortError';
      reject(error);
    };
    const timer = setTimeout(cancel, timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    Promise.resolve().then(getAccessToken).then(token => {
      cleanup();
      if (typeof token !== 'string' || !token.trim()) reject(new Error('No access token was returned'));
      else resolve(token);
    }, error => { cleanup(); reject(error); });
  });
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
    signal?: AbortSignal;
    timeoutMs?: number;
    responseType?: 'blob';
  }
): Promise<M> {
  const startedAt = Date.now();
  const timeoutMs = payload?.timeoutMs ?? 120000;
  let auth = payload?.auth;
  if (auth === undefined && isDraftAssetUrl(url, API_ENDPOINT)) auth = true;
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
    // Bind authoring intent before the asynchronous identity lookup. A workspace switch
    // cannot retarget an already-started mutation to the newly selected workspace.
    const orgId = localStorage.getItem('fable/oid');
    const tokenProvider = fsec.getAccessToken;
    try {
      const token = await accessToken(timeoutMs, payload?.signal, tokenProvider);
      if (localStorage.getItem('fable/oid') !== orgId || fsec.getAccessToken !== tokenProvider) {
        const error = new Error('Your workspace or sign-in changed. Retry the action in the current workspace.');
        error.name = 'AbortError';
        throw error;
      }
      const prefix = orgId ? `${orgId}:` : '';
      (headers as any).Authorization = `Bearer ${prefix}${token}`;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
      window.location.replace(`/logout?t=${LogoutType.AccessTokenInvalidated}`);
      throw new ApiRequestError(401, 'Sign in again to continue', null);
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
    const absolute = new URL(url);
    if (auth && absolute.origin !== new URL(endpoint).origin) {
      throw new ApiRequestError(400, 'Authenticated requests must use the configured API', null);
    }
  } catch (e) {
    if (e instanceof ApiRequestError) throw e;
    path = apiPath;
  }

  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const timer = setTimeout(abort, Math.max(0, timeoutMs - (Date.now() - startedAt)));
  payload?.signal?.addEventListener('abort', abort, { once: true });
  if (payload?.signal?.aborted) abort();
  try {
    let resp;
    if (!auth && (payload === null || payload === undefined)) {
      resp = await fetch(`${path}${url}`, { signal: controller.signal });
    } else {
      let body = null;
      if (payload?.body) {
        body = JSON.stringify(payload.body);
      }
      resp = await fetch(`${path}${url}`, {
        method,
        headers,
        body,
        signal: controller.signal,
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

      if (resp.status === 401 && path.startsWith(apiPath)) {
      // take user to logout page
        let reason: UnauthorizedReason | undefined;
        try {
          const rawMessage = (responseBody as {message?: string})?.message;
          reason = rawMessage ? JSON.parse(rawMessage).r : undefined;
        } catch (e) {
        /* noop */
        }
        window.location.replace(`/logout?t=${LogoutType.APINotAutorized}&r=${reason || ''}`);
      }

      throw new ApiRequestError(resp.status, message, responseBody);
    }

    if (payload?.noRespExpected) {
      return {} as M;
    }

    if (payload?.responseType === 'blob') return await resp.blob() as M;
    const json = await resp.json();
    if (json && typeof json === 'object' && json.status === 'Failure') {
      throw new ApiRequestError(502, 'The operation was not acknowledged. Retry when the service is available.', json);
    }
    return json as M;
  } finally {
    clearTimeout(timer);
    payload?.signal?.removeEventListener('abort', abort);
  }
}
