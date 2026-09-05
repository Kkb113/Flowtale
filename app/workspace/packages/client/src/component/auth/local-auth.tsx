import React, { useMemo } from 'react';
import { Auth0Context, Auth0ContextInterface, initialContext } from '@auth0/auth0-react';
import { Button, Alert, Space } from 'antd';
import { isLocalDevelopment } from '../../local-development';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../../constants';

const ACCOUNT_KEY = 'fable/local-fixture-account';
const ACCOUNTS = ['user-a', 'user-b'] as const;

export function LocalAuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  if (!isLocalDevelopment) throw new Error('Local authentication is disabled');
  const account = sessionStorage.getItem(ACCOUNT_KEY);
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
      localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
      window.location.replace('/login');
    },
  }), [account, authenticated, token]);
  return (
    <Auth0Context.Provider value={context}>
      <Alert type="info" banner message="Local development · Fixture accounts and entitlements · Billing is disabled" />
      {children}
    </Auth0Context.Provider>
  );
}

export function LocalLogin(): JSX.Element {
  if (!isLocalDevelopment) throw new Error('Local authentication is disabled');
  const select = (account: typeof ACCOUNTS[number]): void => {
    sessionStorage.setItem(ACCOUNT_KEY, account);
    localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
    const invitation = new URLSearchParams(window.location.search).get('ic');
    window.location.replace(invitation ? `/join/org?ic=${encodeURIComponent(invitation)}` : '/demos');
  };
  return (
    <Space direction="vertical" style={{ padding: 32 }}>
      <h1>Choose a local fixture account</h1>
      <p>These accounts access only the local development databases.</p>
      {ACCOUNTS.map(account => <Button key={account} onClick={() => select(account)}>{account}@fable.local</Button>)}
    </Space>
  );
}
