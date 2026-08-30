import React from 'react';
import { connect } from 'react-redux';
import { RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import { LoadingStatus } from '@fable/common/dist/types';
import { PlusOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Button as AntBtn, Tooltip } from 'antd';
import { getRandomId, SHORT_MONTHS } from '@fable/common/dist/utils';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import { getAllUsersForOrg, activateOrDeactivateUser, getSubscriptionOrCheckoutNew } from '../../action/creator';
import * as Tags from './styled';
import Button from '../../component/button';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import InviteUserForm from '../../component/user-management/invite-user-form';
import { FeatureForPlan } from '../../plans';
import { isFeatureAvailable } from '../../utils';
import Upgrade from '../../component/upgrade';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

function getReadableDate(d: Date): string {
  const msDiffs = +d - +new Date();
  const days = Math.ceil(msDiffs / (1000 * 60 * 60 * 24));
  if (days >= 1) return 'Tomorrow';
  if (days >= 0) return 'Today';

  const isCurrentYear = d.getFullYear() - new Date().getFullYear();
  const yearSuffix = isCurrentYear ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${yearSuffix}`;
}

interface IDispatchProps {
  getAllUsersForOrg: () => void;
  activateOrDeactivateUser: (id: number, shouldActivate: boolean) => void;
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllUsersForOrg: () => dispatch(getAllUsersForOrg()),
  activateOrDeactivateUser: (id: number, shouldActivate: boolean) => dispatch(activateOrDeactivateUser(id, shouldActivate)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew())
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  usersLoaded: boolean;
  users: RespUser[];
  org: RespOrg | null;
  featurePlan: FeatureForPlan | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  org: state.default.org,
  subs: state.default.subs,
  principal: state.default.principal,
  usersLoaded: state.default.allUsersLoadingStatus === LoadingStatus.Done,
  users: state.default.users,
  featurePlan: state.default.featureForPlan,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;

interface IOwnStateProps {
  showModal: boolean;
  isInviteUserFeatureAvailable: boolean;
}

class UserManagementAndSubscription extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      showModal: false,
      isInviteUserFeatureAvailable: true,
    };
  }

  componentDidMount(): void {
    this.props.getAllUsersForOrg();
    document.title = this.props.title;
    if (this.props.featurePlan) this.checkIfInviteUserFeatureAvailable();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.featurePlan !== prevProps.featurePlan || this.props.users !== prevProps.users) {
      this.checkIfInviteUserFeatureAvailable();
    }
  }

  checkIfInviteUserFeatureAvailable(): void {
    const isAvailable = isFeatureAvailable(
      this.props.featurePlan,
      'no_of_creator',
      this.props.users.length + 1
    ).isAvailable;
    this.setState({ isInviteUserFeatureAvailable: isAvailable });
  }

  render(): JSX.Element {
    const noOfUsers = this.props.users.length;
    const heading = `${noOfUsers} user${noOfUsers > 1 ? 's' : ''} in your org`;
    return (
      <GTags.ColCon>
        {this.props.loadingState === 'loading' && <TopLoader
          duration={TOP_LOADER_DURATION}
          showLogo={false}
          showOverlay
        />}
        <div style={{ height: '48px' }}>
          <Header
            subs={this.props.subs}
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            org={this.props.org}
            leftElGroups={[]}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon flat={this.props.searchParams.get('c') === '1'}>
            <SidePanel
              selected="user-management"
              subs={this.props.subs}
              compact={this.props.searchParams.get('c') === '1'}
            />
          </GTags.SidePanelCon>
          <GTags.MainCon>
            <GTags.BodyCon style={{ height: '100%', position: 'relative', overflowY: 'scroll', paddingLeft: '3%' }}>
              {this.props.usersLoaded ? (
                <div style={{ maxWidth: '43.5rem' }}>
                  <div style={{
                    margin: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  >
                    <Tags.Heading style={{ fontWeight: 400 }}>{heading}</Tags.Heading>
                    {this.state.isInviteUserFeatureAvailable
                      ? (
                        <Button
                          icon={<PlusOutlined />}
                          iconPlacement="left"
                          onClick={() => { this.setState({ showModal: true }); }}
                        >
                          Invite a user
                        </Button>
                      )
                      : <Upgrade inline subs={this.props.subs} clickedFrom="invite_user" />}
                  </div>
                  <GTags.BottomPanel style={{ overflow: 'auto' }}>
                    {this.props.users.map((user) => (
                      <Tags.UserCardCon key={user.id} active={user.active}>
                        <Tags.Avatar>
                          <img src={user.avatar} alt={`${user.firstName}'s dp`} />
                        </Tags.Avatar>
                        <Tags.CardDataCon>
                          <Tags.DisplayName>
                            {`${user.firstName} ${user.lastName}`}
                          </Tags.DisplayName>
                          <Tags.MetaDataCon>
                            Joined {getReadableDate(new Date(user.createdAt))}
                          </Tags.MetaDataCon>
                        </Tags.CardDataCon>
                        <Tags.ActionBtnCon>
                          {this.props.principal?.id !== user.id && (
                            <Tooltip
                              title={`${user.active ? 'Deactivate' : 'Activate'} user`}
                              overlayStyle={{ fontSize: '0.75rem' }}
                            >
                              <AntBtn
                                style={{ padding: 0, margin: 0 }}
                                size="small"
                                shape="circle"
                                type="text"
                                icon={user.active ? <UserDeleteOutlined /> : <UserAddOutlined />}
                                onClick={e => {
                                  this.props.activateOrDeactivateUser(user.id, !user.active);
                                }}
                              />
                            </Tooltip>
                          )}
                        </Tags.ActionBtnCon>
                      </Tags.UserCardCon>
                    ))}
                  </GTags.BottomPanel>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <TopLoader duration={TOP_LOADER_DURATION} showLogo text="Loading all users" />
                </div>
              )}
            </GTags.BodyCon>
          </GTags.MainCon>
        </GTags.RowCon>
        <GTags.BorderedModal
          destroyOnClose
          style={{ height: '10px' }}
          open={this.state.showModal}
          onOk={() => { this.setState({ showModal: false }); }}
          onCancel={() => { this.setState({ showModal: false }); }}
          footer={null}
        >
          <div className="modal-content-cont">
            <InviteUserForm />
          </div>
        </GTags.BorderedModal>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(UserManagementAndSubscription));
