import React, { useMemo } from 'react';
import { Auth0Context, Auth0ContextInterface, initialContext } from '@auth0/auth0-react';
import { Button, Space } from 'antd';
import FableLogo from '../../assets/fableLogo.svg';
import { isLocalDevelopment } from '../../local-development';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../../constants';

const ACCOUNT_KEY = 'fable/local-fixture-account';
const WORKSPACE_LOGIN_KEY = 'fable/local-workspace-signed-in';
const ACCOUNTS = ['workspace', 'user-a', 'user-b'] as const;

export function LocalAuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  if (!isLocalDevelopment) throw new Error('Local authentication is disabled');
  const tabAccount = sessionStorage.getItem(ACCOUNT_KEY);
  // Normal local sign-in follows new recording tabs; test identities remain tab-specific.
  if (tabAccount === 'workspace') localStorage.setItem(WORKSPACE_LOGIN_KEY, '1');
  const account = tabAccount || (localStorage.getItem(WORKSPACE_LOGIN_KEY) === '1' ? 'workspace' : null);
  const authenticated = ACCOUNTS.some(candidate => candidate === account);
  const token = `fable-local-${account}-development-token-v1`;
  const context = useMemo<Auth0ContextInterface>(() => ({
    ...initialContext,
    isAuthenticated: authenticated,
    isLoading: false,
    user: authenticated ? { sub: `local|${account}`, email: `${account}@fable.local`, email_verified: true } : undefined,
    getAccessTokenSilently: (async (options?: { detailedResponse?: boolean }) => {
      if (!authenticated) throw new Error('Select a local fixture account');
      return options?.detailedResponse ? { access_token: token, expires_in: 3600, id_token: '', token_type: 'Bearer' } : token;
    }) as Auth0ContextInterface['getAccessTokenSilently'],
    loginWithRedirect: async () => { window.location.assign('/login'); },
    logout: () => {
      sessionStorage.removeItem(ACCOUNT_KEY);
      localStorage.removeItem(WORKSPACE_LOGIN_KEY);
      localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
      window.location.replace('/login');
    },
  }), [account, authenticated, token]);
  return (
    <Auth0Context.Provider value={context}>
      {children}
    </Auth0Context.Provider>
  );
}

export function LocalLogin(): JSX.Element {
  if (!isLocalDevelopment) throw new Error('Local authentication is disabled');
  const testing = new URLSearchParams(window.location.search).get('testing') === '1';
  const select = (account: typeof ACCOUNTS[number]): void => {
    const previous = sessionStorage.getItem(ACCOUNT_KEY)
      || (localStorage.getItem(WORKSPACE_LOGIN_KEY) === '1' ? 'workspace' : null);
    sessionStorage.setItem(ACCOUNT_KEY, account);
    if (account === 'workspace') localStorage.setItem(WORKSPACE_LOGIN_KEY, '1');
    if (previous !== account) localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
    const invitation = new URLSearchParams(window.location.search).get('ic');
    const capture = new URLSearchParams(window.location.search).get('capture');
    window.location.replace(invitation ? `/join/org?ic=${encodeURIComponent(invitation)}`
      : capture ? `/create-interactive-demo?capture=${encodeURIComponent(capture)}` : '/demos');
  };
  return (
    <Space direction="vertical" align="center" style={{ display: 'flex', padding: 64, gap: 24 }}>
      <img src={FableLogo} alt="Fable" style={{ width: 140, background: '#16023e', padding: 16, borderRadius: 12 }} />
      <h1>Welcome to Fable</h1>
      <Button type="primary" size="large" onClick={() => select('workspace')}>Continue to Fable</Button>
      {testing && ACCOUNTS.filter(account => account !== 'workspace').map(account => (
        <Button key={account} onClick={() => select(account)}>{account}@fable.local</Button>
      ))}
    </Space>
  );
}
