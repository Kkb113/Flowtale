import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { openDb } from '@fable/common/dist/db-utils';
import { readCapture } from '@fable/common/dist/capture-storage';
import LogIn from './login';
import { ProtectedRoutes } from '../../container/protected-routes';
import { AuthCallback } from '../../container/auth-cb';

jest.mock('../../local-development', () => ({ isLocalDevelopment: false }));
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('../../container/protected-routes/with-principal-check', () => () => null);
jest.mock('@auth0/auth0-react', () => ({ useAuth0: jest.fn(), Auth0Provider: () => null }));
jest.mock('@fable/common/dist/db-utils', () => ({ openDb: jest.fn() }));
jest.mock('@fable/common/dist/capture-storage', () => ({ readCapture: jest.fn() }));

const navigate = jest.fn();
const close = jest.fn();
const loginWithRedirect = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/');
  (useAuth0 as jest.Mock).mockReturnValue({ loginWithRedirect });
  (openDb as jest.Mock).mockResolvedValue({ close });
  (readCapture as jest.Mock).mockResolvedValue(undefined);
});
afterEach(cleanup);

it('carries the recording ID into the remote login transaction', async () => {
  render(<MemoryRouter initialEntries={['/login?capture=recording%2Fone']}><LogIn title="Login" /></MemoryRouter>);
  await waitFor(() => expect(loginWithRedirect).toHaveBeenCalledWith(expect.objectContaining({
    appState: { capture: 'recording/one' },
  })));
});

it.each([
  [{ capture: 'recording/one' }, '/create-interactive-demo?capture=recording%2Fone'],
  [{ ic: 'invite', capture: 'recording/one' }, '/join/org?ic=invite'],
  [{}, '/'],
])('restores the intended destination after remote login: %s', (appState, destination) => {
  const provider = new ProtectedRoutes({ location: { pathname: '/login' }, navigate } as any).render();
  provider.props.onRedirectCallback(appState);
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith(destination, { replace: true });
});

it('opens the selected capture once without a later dashboard redirect', async () => {
  window.history.replaceState({}, '', '/cb/auth?capture=recording%2Ftwo');
  (readCapture as jest.Mock).mockResolvedValue({ captureSessionId: 'recording/two' });
  const callback = new AuthCallback({ navigate } as any);
  callback.componentDidMount();
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(readCapture).toHaveBeenCalledWith(expect.anything(), 'recording/two');
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('/create-interactive-demo?capture=recording%2Ftwo');
  callback.componentWillUnmount();
});

it('closes late database connections without navigating after unmount', async () => {
  let finishOpen: (value: unknown) => void = () => {};
  (openDb as jest.Mock).mockImplementation(() => new Promise(resolve => { finishOpen = resolve; }));
  const callback = new AuthCallback({ navigate } as any);
  callback.componentDidMount();
  callback.componentWillUnmount();
  finishOpen({ close });
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(readCapture).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

it('opens the dashboard once when there is no pending capture', async () => {
  const callback = new AuthCallback({ navigate } as any);
  callback.componentDidMount();
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('/demos');
  callback.componentWillUnmount();
});
