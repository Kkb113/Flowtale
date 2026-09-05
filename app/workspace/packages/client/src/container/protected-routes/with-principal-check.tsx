import React from 'react';
import { Alert, Button, Space } from 'antd';
import { connect } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
import { RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import { setSec } from '@fable/common/dist/fsec';
import { resetProductAnalytics, setProductAnalyticsUserId } from '@fable/common/dist/amplitude';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { fetchOrg, iam } from '../../action/creator';
import { setEventCommonState } from '../../utils';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { OnboardingSteps, USER_ONBOARDING_ROUTE } from '../user-onboarding';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../../constants';
import WithPlanCheck from './with-plan-check';
import { shutdownSupportWidget, updateSupportWidget } from '../../support-widget';

export const ENV = process.env.REACT_APP_ENVIRONMENT;

interface IDispatchProps {
  iam: () => Promise<void>;
  fetchOrg: () => Promise<void>;
}

const mapDispatchToProps = (dispatch: any) => ({
  iam: () => dispatch(iam()),
  fetchOrg: () => dispatch(fetchOrg()),
});

interface IAppStateProps {
  isPrincipalLoaded: boolean;
  principal: RespUser | null;
  lcOrgId: number | null;
  org: RespOrg | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isPrincipalLoaded: state.default.principalLoadingStatus === LoadingStatus.Done,
  principal: state.default.principal,
  lcOrgId: state.default.lcOrgId,
  org: state.default.org
});

interface IOwnProps { }
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props & WithRouterProps;

interface IOwnStateProps {
  error: string | null;
  failedOperation: 'account' | 'workspace' | null;
}

class WithPrincipalCheck extends React.PureComponent<IProps, IOwnStateProps> {
  private mounted = false;

  constructor(props: IProps) {
    super(props);
    const { getAccessTokenSilently } = this.props.auth0;
    setSec('getAccessToken', async () => {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUD,
          scope: 'openid profile email',
        }
      });
      return accessToken;
    });

    this.state = { error: null, failedOperation: null };
  }

  componentDidMount(): void {
    this.mounted = true;
    if (this.props.auth0.isAuthenticated) {
      this.load('account');
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
    if (prevProps.auth0.isAuthenticated !== this.props.auth0.isAuthenticated && this.props.auth0.isAuthenticated) {
      this.load('account');
    }

    if (prevProps.auth0.isAuthenticated && !this.props.auth0.isAuthenticated) {
      resetProductAnalytics();
      shutdownSupportWidget();
    }

    if (prevProps.lcOrgId !== this.props.lcOrgId && this.props.lcOrgId && (
      !this.props.org || (this.props.org.id !== this.props.lcOrgId)
    )) {
      this.load('workspace');
    }

    if (prevProps.principal !== this.props.principal && this.props.principal) {
      setEventCommonState(CmnEvtProp.EMAIL, this.props.principal.email);
      setEventCommonState(CmnEvtProp.FIRST_NAME, this.props.principal.firstName);
      setEventCommonState(CmnEvtProp.LAST_NAME, this.props.principal.lastName);

      try {
        setProductAnalyticsUserId(this.props.principal.email);
        if (ENV === 'prod') updateSupportWidget(this.props.principal.firstName, this.props.principal.email, this.props.principal.createdAt);
      } catch (e) {
        raiseDeferredError(e as Error);
      }
    }
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  private load = async (operation: 'account' | 'workspace'): Promise<void> => {
    if (this.mounted) this.setState({ error: null, failedOperation: null });
    try {
      if (operation === 'account') await this.props.iam();
      else await this.props.fetchOrg();
    } catch (error) {
      if (this.mounted) {
        this.setState({
          error: error instanceof Error ? error.message : 'The service could not be reached.',
          failedOperation: operation,
        });
      }
    }
  };

  getQueryParmsStrWithQuestionMark = () => {
    const queryParamStr = this.props.searchParams.toString();
    return queryParamStr ? `?${queryParamStr}` : '';
  };

  render(): JSX.Element {
    const inviteCode = this.props.searchParams.get('ic');
    const pathname = this.props.location.pathname.toLowerCase();
    const shouldCheckPlan = !(pathname.startsWith('/billing') || pathname.startsWith('/welcome'));

    if (this.state.error) {
      return (
        <Space direction="vertical" style={{ padding: 32 }}>
          <Alert type="error" showIcon message="Your account could not be loaded" description={this.state.error} />
          <Button onClick={() => this.load(this.state.failedOperation || 'account')}>Retry</Button>
          <Button href="/logout">Sign in again</Button>
        </Space>
      );
    }

    if (this.props.auth0.isLoading) {
      return <FullPageTopLoader showLogo />;
    }
    if (!this.props.auth0.isAuthenticated) {
      return <Navigate to={`/login${this.getQueryParmsStrWithQuestionMark()}`} />;
    }
    if (!this.props.isPrincipalLoaded) {
      return <FullPageTopLoader showLogo />;
    }
    if (!this.props.principal) {
      return <Navigate to={`/login${this.getQueryParmsStrWithQuestionMark()}`} />;
    }

    // TODO no side effect here
    const localStorageOrgId = localStorage.getItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
    if (!this.props.principal.firstName) {
      // If user details are not yet completed
      if (!document.location.pathname.startsWith(`/${USER_ONBOARDING_ROUTE}`)) {
        return <Navigate to={`/${USER_ONBOARDING_ROUTE}${this.getQueryParmsStrWithQuestionMark()}#${OnboardingSteps.USER_DETAILS}`} />;
      }
    } else if (!localStorageOrgId || inviteCode) {
      // User has entered details, but hasnt selected org
      if (!document.location.pathname.startsWith(`/${USER_ONBOARDING_ROUTE}`)) {
        return <Navigate to={`/${USER_ONBOARDING_ROUTE}${this.getQueryParmsStrWithQuestionMark()}#${OnboardingSteps.ORGANIZATION_DETAILS}`} />;
      }
    }

    if (localStorageOrgId && (!this.props.org || this.props.org.id !== Number(localStorageOrgId))) {
      return <FullPageTopLoader showLogo />;
    }
    return shouldCheckPlan ? <WithPlanCheck key={this.props.org?.id} /> : <Outlet />;
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(withAuth0(WithPrincipalCheck)));
