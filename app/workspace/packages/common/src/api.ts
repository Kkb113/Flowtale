import { fsec } from './fsec';
import { LogoutType } from './constants';
import { UnauthorizedReason } from './api-contract';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const LOG_ENDPOINT = process.env.REACT_APP_LOG_ENDPOINT as string;
const JOB_ENDPOINT = process.env.REACT_APP_JOB_ENDPOINT as string;
const API_VERSION = '/v1';
const BEHIND_AUTH = '/f';

// TODO handle common error here like 500, 403, 401 etc
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

  if ((resp.status === 401 || resp.status === 403) && path.startsWith(apiPath)) {
    // take user to logout page
    let reason: UnauthorizedReason | undefined;
    try {
      const data = await resp.json();
      const msg = JSON.parse(data.message);
      reason = msg.r;
    } catch (e) {
      /* noop */
    }
    console.log('>> reason', reason);
    window.location.replace(`/logout?t=${LogoutType.APINotAutorized}&r=${reason || ''}`);
  }

  if (resp.status >= 500) {
    throw new Error('Probable server error');
  }

  if (payload?.noRespExpected) {
    return {} as M;
  }

  const json = await resp.json();
  return json as M;
}
