import { RespOrg, RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { Alert, Button } from 'antd';
import { connect } from 'react-redux';
import CompanyCarousel from '../../component/company-carousel';
import ExtensionDownload from '../../component/user-onboarding/extension-download';
import NameCard from '../../component/user-onboarding/name-card';
import OrgCreate from '../../component/user-onboarding/org-create';
import Usecase from '../../component/user-onboarding/usecase';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { isExtensionInstalled } from '../../utils';
import * as Tags from './styled';
import { assignOrgToUser, createOrg, getAllUserOrgs, updateUseCasesForOrg, updateUser } from '../../action/creator';
import Layout from './layout';

const reactanimated = require('react-animated-css');

export const USER_ONBOARDING_ROUTE = 'welcome';

export enum OnboardingSteps {
  USER_DETAILS = 'user-details',
  ORGANIZATION_DETAILS = 'organization-details',
  USECASES = 'usecases',
  INSTALL_EXTENSION = 'install-extension',
}

const mapDispatchToProps = (dispatch: any) => ({
  createNewOrg: (orgName: string) => dispatch(createOrg(orgName)),
  getAllUserOrgs: () => dispatch(getAllUserOrgs()),
  updateUser: (firstName: string, lastName: string) => dispatch(updateUser(firstName, lastName)),
  assignOrgToUser: (orgId: number, isJoinViaInvite?: boolean, inviteCode?: string) => dispatch(assignOrgToUser(orgId, isJoinViaInvite, inviteCode)),
  updateUseCasesForOrg: (useCases: string[], othersText: string) => dispatch(updateUseCasesForOrg(useCases, othersText))
});

const mapStateToProps = (state: TState) => ({
  principal: state.default.principal as RespUser,
  allUserOrgs: state.default.allUserOrgs,
  org: state.default.org
});

interface IOwnProps {

}

type IProps = IOwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  WithRouterProps<{
  }>;

type IOwnStateProps = {
  inviteError: string | null;
  workspaceError: string | null;
  extInstalled: boolean | null;
  currentSlideIdx: number;
}

const SLIDE_IDX_USER_DETAILS = 0;
const SLIDE_IDX_ONBOARDING = 1;
const SLIDE_IDX_USECASE = 2;
const SLIDE_IDX_EXT_INSTALL = 3;

class NewOnboarding extends React.PureComponent<IProps, IOwnStateProps> {
  private mounted = false;

  orgCreateInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      inviteError: null,
      workspaceError: null,
      extInstalled: null,
      currentSlideIdx: -1,
    };
  }

  componentDidMount(): void {
    this.mounted = true;
    isExtensionInstalled().then((isInstalled) => {
      if (this.mounted) this.setState({ extInstalled: isInstalled });
    }).catch(() => {
      if (this.mounted) this.setState({ extInstalled: false });
    });

    this.loadWorkspaces();
    this.goToSlideBasedOnUrlFragment();
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  private loadWorkspaces = async (): Promise<void> => {
    this.setState({ workspaceError: null });
    try {
      await this.props.getAllUserOrgs();
    } catch (error) {
      if (this.mounted) {
        this.setState({ workspaceError: error instanceof Error
          ? error.message : 'Your workspaces could not be loaded.' });
      }
    }
  };

  goToSlideBasedOnUrlFragment = (): void => {
    switch (this.props.location.hash.slice(1) as OnboardingSteps) {
      case OnboardingSteps.USER_DETAILS:
        this.setState({ currentSlideIdx: 0 });
        break;
      case OnboardingSteps.ORGANIZATION_DETAILS:
        this.setState({ currentSlideIdx: 1 });
        break;
      case OnboardingSteps.USECASES:
        this.setState({ currentSlideIdx: 2 });
        break;
      case OnboardingSteps.INSTALL_EXTENSION:
        this.setState({ currentSlideIdx: 3 });
        break;
      default:
        break;
    }
  };

  getQueryParmsStrWithQuestionMark = () => {
    const queryParamStr = this.props.searchParams.toString();
    return queryParamStr ? `?${queryParamStr}` : '';
  };

  navOrgNext = (org: RespOrg) => {
    if (!org.info) this.props.navigate(`/${USER_ONBOARDING_ROUTE}#${OnboardingSteps.USECASES}`, { replace: true });
    else if (!this.state.extInstalled) this.props.navigate(`/${USER_ONBOARDING_ROUTE}#${OnboardingSteps.INSTALL_EXTENSION}`, { replace: true });
    else this.props.navigate('/demos', { replace: true });
  };

  navUsecaseNext = () => {
    if (!this.state.extInstalled) this.props.navigate(`/${USER_ONBOARDING_ROUTE}#${OnboardingSteps.INSTALL_EXTENSION}`, { replace: true });
    else this.props.navigate('/demos', { replace: true });
  };

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.location.hash !== this.props.location.hash) this.goToSlideBasedOnUrlFragment();

    if (!this.props.principal.firstName && this.state.currentSlideIdx !== SLIDE_IDX_USER_DETAILS) {
      this.props.navigate(`/${USER_ONBOARDING_ROUTE}${this.getQueryParmsStrWithQuestionMark()}#${OnboardingSteps.USER_DETAILS}`);
      return;
    }

    if (prevState.currentSlideIdx !== this.state.currentSlideIdx) {
      if (this.state.currentSlideIdx === SLIDE_IDX_USER_DETAILS) {
        if (this.props.principal.firstName) { this.props.navigate(`/${USER_ONBOARDING_ROUTE}${this.getQueryParmsStrWithQuestionMark()}#${OnboardingSteps.ORGANIZATION_DETAILS}`); }
      } else if (this.state.currentSlideIdx === SLIDE_IDX_ONBOARDING) {
        // for onboarding route
        const inviteCode = this.props.searchParams.get('ic');
        if (inviteCode) {
          this.props.assignOrgToUser(0, true, inviteCode).then((org: RespOrg) => {
            if (this.mounted) this.navOrgNext(org);
          }).catch((error: unknown) => {
            if (this.mounted) {
              this.setState({ inviteError: error instanceof Error
                ? error.message : 'The invitation could not be accepted. Please ask for a new invitation.' });
            }
          });
        }
      } else if (this.state.currentSlideIdx === SLIDE_IDX_USECASE) {
        if (this.props.org && this.props.org.info) {
          this.navUsecaseNext();
        }
      } else if (this.state.currentSlideIdx === SLIDE_IDX_EXT_INSTALL) {
        if (this.state.extInstalled) this.props.navigate('/demos', { replace: true });
      }
    }

    if (this.state.extInstalled && prevState.extInstalled !== this.state.extInstalled && this.state.currentSlideIdx === SLIDE_IDX_EXT_INSTALL) {
      this.props.navigate('/demos', { replace: true });
    }
  }

  render(): JSX.Element {
    return (
      <Layout
        footer={(
          <Tags.CompanyCarouselWrapper>
            <CompanyCarousel />
          </Tags.CompanyCarouselWrapper>
        )}
      >
        {this.state.workspaceError && <Alert
          style={{ zIndex: 10, alignSelf: 'flex-start' }}
          type="error"
          showIcon
          message="Your workspaces could not be loaded"
          description={this.state.workspaceError}
          action={<Button onClick={this.loadWorkspaces}>Retry</Button>}
        />}
        {this.state.inviteError && <Alert
          type="error"
          showIcon
          message="Invitation could not be accepted"
          description={this.state.inviteError}
        />}
        <reactanimated.Animated
          animationIn="fadeInRight"
          animationOut="fadeOutLeft"
          animationInDuration={300}
          animationOutDuration={300}
          animateOnMount={false}
          style={{
            zIndex: this.state.currentSlideIdx === SLIDE_IDX_USER_DETAILS ? 5 : 1
          }}
          isVisible={this.state.currentSlideIdx === SLIDE_IDX_USER_DETAILS}
        >
          <Tags.OnboardingCardCon className="typ-reg">
            <NameCard
              updateUser={this.props.updateUser}
              principal={this.props.principal}
            />
          </Tags.OnboardingCardCon>
        </reactanimated.Animated>

        <reactanimated.Animated
          animationIn="fadeInRight"
          animationOut="fadeOutLeft"
          animationInDuration={300}
          animationOutDuration={300}
          animateOnMount={false}
          style={{
            zIndex: this.state.currentSlideIdx === SLIDE_IDX_ONBOARDING ? 5 : 1
          }}
          isVisible={this.state.currentSlideIdx === SLIDE_IDX_ONBOARDING}
        >
          <Tags.OnboardingCardCon className="typ-reg">
            <OrgCreate
              userOrgs={this.props.allUserOrgs}
              assignOrgToUser={this.props.assignOrgToUser}
              orgCreateInputRef={this.orgCreateInputRef}
              createNewOrg={this.props.createNewOrg}
              onSelect={org => this.navOrgNext(org)}
            />
          </Tags.OnboardingCardCon>
        </reactanimated.Animated>

        <reactanimated.Animated
          animationIn="fadeInRight"
          animationOut="fadeOutLeft"
          animationInDuration={300}
          animationOutDuration={300}
          animateOnMount={false}
          style={{
            zIndex: this.state.currentSlideIdx === SLIDE_IDX_USECASE ? 5 : 1
          }}
          isVisible={this.state.currentSlideIdx === SLIDE_IDX_USECASE}
        >
          <Tags.OnboardingCardCon className="typ-reg">
            <Usecase
              updateUseCasesForOrg={this.props.updateUseCasesForOrg}
              onSubmit={this.navUsecaseNext}
            />
          </Tags.OnboardingCardCon>
        </reactanimated.Animated>

        <reactanimated.Animated
          animationIn="fadeInRight"
          animationOut="fadeOutLeft"
          animationInDuration={300}
          animationOutDuration={300}
          animateOnMount={false}
          style={{
            zIndex: this.state.currentSlideIdx === SLIDE_IDX_EXT_INSTALL ? 5 : 1
          }}
          isVisible={this.state.currentSlideIdx === SLIDE_IDX_EXT_INSTALL}
        >
          <Tags.OnboardingCardCon className="typ-reg">
            <ExtensionDownload />
          </Tags.OnboardingCardCon>
        </reactanimated.Animated>
      </Layout>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(NewOnboarding));
