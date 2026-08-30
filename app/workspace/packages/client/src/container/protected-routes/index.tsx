import React from 'react';
import { connect } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import WithPrincipalCheck from './with-principal-check';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps { }

const mapDispatchToProps = (dispatch: any) => ({ });

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps { }

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps { }

// Auth0Provider needs to be installed in this component not any component upstream
// Auth0 in it's free version use cross domain cookie that is blocked by some browser
// If we add the provider on the upstream component the Auth0Provider executes code that throws error.
// Since during the /p or /form route does not need any auth we don't even initialize the auth0 for those

class ProtectedRoutes extends React.PureComponent<IProps, IOwnStateProps> {
  render(): JSX.Element {
    const pathname = this.props.location.pathname.toLowerCase();
    const shouldResolvePrincipal = !(pathname === '/login' || pathname === '/logout');

    return (
      <Auth0Provider
        domain={process.env.REACT_APP_AUTH0_DOMAIN as string}
        clientId={process.env.REACT_APP_AUTH0_CLIENT_ID as string}
        useRefreshTokens
        cacheLocation="localstorage"
        authorizationParams={{
          audience: process.env.REACT_APP_AUTH0_AUD,
          redirect_uri: `${APP_CLIENT_ENDPOINT}/cb/auth`,
          scope: 'openid profile email',

        }}
        onRedirectCallback={(appState) => {
          if (appState?.ic) {
            this.props.navigate(`/join/org?ic=${appState.ic}`, { replace: true });
          } else {
            this.props.navigate('/', { replace: true });
          }
        }}
      >
        {
          shouldResolvePrincipal ? (<WithPrincipalCheck />) : (<Outlet />)
        }
      </Auth0Provider>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ProtectedRoutes));
