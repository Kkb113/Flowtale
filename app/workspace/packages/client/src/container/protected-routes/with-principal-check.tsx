import React from 'react';
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

export const ENV = process.env.REACT_APP_ENVIRONMENT;

function addSupportBot(name: string, email: string, createdAt: Date): void {
  const id = 'fable-support-bot';

  let script = document.getElementById(id);
  if (script) return;

  script = document.createElement('script');
  script.setAttribute('id', id);
  script.innerHTML = `
  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: "btay1o4i",
    user_id: "${email}",
    name: "${name}",
    email: "${email}",
    created_at: "${createdAt}",
    custom_launcher_selector:'.support-bot-open'
  };


 // We pre-filled your app ID in the widget URL: 'https://widget.intercom.io/widget/btay1o4i'
  (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/btay1o4i';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
  `;
  document.body.appendChild(script);
}

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

interface IOwnStateProps {}

class WithPrincipalCheck extends React.PureComponent<IProps, IOwnStateProps> {
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

    this.state = {};
  }

  componentDidMount(): void {
    if (this.props.auth0.isAuthenticated) {
      this.props.iam();
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
    if (prevProps.auth0.isAuthenticated !== this.props.auth0.isAuthenticated && this.props.auth0.isAuthenticated) {
      this.props.iam();
    }

    if (prevProps.lcOrgId !== this.props.lcOrgId && this.props.lcOrgId && (
      !this.props.org || (this.props.org.id !== this.props.lcOrgId)
    )) {
      this.props.fetchOrg();
    }

    if (prevProps.principal !== this.props.principal && this.props.principal) {
      setEventCommonState(CmnEvtProp.EMAIL, this.props.principal.email);
      setEventCommonState(CmnEvtProp.FIRST_NAME, this.props.principal.firstName);
      setEventCommonState(CmnEvtProp.LAST_NAME, this.props.principal.lastName);

      try {
        setProductAnalyticsUserId(this.props.principal.email);
        if (ENV === 'prod') addSupportBot(this.props.principal.firstName, this.props.principal.email, this.props.principal.createdAt);
        if (!this.props.auth0.isAuthenticated) {
          resetProductAnalytics();
        }
      } catch (e) {
        raiseDeferredError(e as Error);
      }
    }
  }

  getQueryParmsStrWithQuestionMark = () => {
    const queryParamStr = this.props.searchParams.toString();
    return queryParamStr ? `?${queryParamStr}` : '';
  };

  render(): JSX.Element {
    const inviteCode = this.props.searchParams.get('ic');
    const pathname = this.props.location.pathname.toLowerCase();
    const shouldCheckPlan = !(pathname.startsWith('/billing') || pathname.startsWith('/welcome'));

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

    return shouldCheckPlan ? <WithPlanCheck /> : <Outlet />;
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(withAuth0(WithPrincipalCheck)));
