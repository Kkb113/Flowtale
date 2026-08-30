import { RespOrg, RespUser } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import React from 'react';
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
  assignOrgToUser: (orgId: number, isJoinViaInvite?: boolean) => dispatch(assignOrgToUser(orgId, isJoinViaInvite)),
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
  extInstalled: boolean | null;
  currentSlideIdx: number;
}

const SLIDE_IDX_USER_DETAILS = 0;
const SLIDE_IDX_ONBOARDING = 1;
const SLIDE_IDX_USECASE = 2;
const SLIDE_IDX_EXT_INSTALL = 3;

class NewOnboarding extends React.PureComponent<IProps, IOwnStateProps> {
  orgCreateInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      extInstalled: null,
      currentSlideIdx: -1,
    };
  }

  async componentDidMount(): Promise<void> {
    isExtensionInstalled().then((isInstalled) => {
      this.setState({ extInstalled: isInstalled });
    });

    this.props.getAllUserOrgs();
    this.goToSlideBasedOnUrlFragment();
  }

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
    this.goToSlideBasedOnUrlFragment();

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
          try {
            const { orgId, invitedEmail } = JSON.parse(atob(inviteCode));
            if (invitedEmail === this.props.principal!.email) {
              this.props.assignOrgToUser(orgId, true).then((org: RespOrg) => {
                this.navOrgNext(org);
              });
            }
          } catch (e) {
            raiseDeferredError(e as Error);
          }
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
