import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import { Link } from 'react-router-dom';
import { Button as AntButton, } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  clearCurrentDemoHubSelection,
  getAllDemoHubs,
  getSubscriptionOrCheckoutNew,
  loadDemoHubAndData,
  loadDemoHubConfig,
  publishDemoHub,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { IDemoHubConfig, P_RespDemoHub, } from '../../types';
import DemoHubPreview from '../../component/preview-demo-hub';
import Header from '../../component/header';
import PreviewHeaderOptions from '../../component/preview-demo-hub/preview-header-options';
import {
  DESKTOP_MEDIUM_SRN_HEIGHT,
  DESKTOP_MEDIUM_SRN_WIDTH,
  DisplaySize,
  RESP_MOBILE_SRN_HEIGHT,
  RESP_MOBILE_SRN_WIDTH,
} from '../../utils';
import { TOP_LOADER_DURATION } from '../../constants';
import TopLoader from '../../component/loader/top-loader';
import DemoHubShareModal from '../../component/demo-hubs-list/share-modal';
import { amplitudeDemoHubEditorOpened, amplitudeDemoHubPublished } from '../../amplitude';
import { P_RespSubscription } from '../../entity-processor';

interface IDispatchProps {
  getAllDemoHubs: () => void;
  loadDemoHubAndData: (demoHubRid: string) => void;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>,
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>,
  clearCurrentDemoHubSelection: ()=> void,
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllDemoHubs: () => dispatch(getAllDemoHubs()),
  loadDemoHubAndData: (demoHubRid) => dispatch(loadDemoHubAndData(demoHubRid)),
  publishDemoHub: (demoHub) => dispatch(publishDemoHub(demoHub)),
  loadDemoHubConfig: (demoHub) => dispatch(loadDemoHubConfig(demoHub)),
  clearCurrentDemoHubSelection: () => dispatch(clearCurrentDemoHubSelection()),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

interface IAppStateProps {
  org: RespOrg | null;
  principal: RespUser | null;
  demoHub: P_RespDemoHub | null;
  demoHubConfig: IDemoHubConfig | null;
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  org: state.default.org,
  principal: state.default.principal,
  demoHub: state.default.currentDemoHub,
  demoHubConfig: state.default.currentDemoHubConfig,
  subs: state.default.subs
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{ demoHubId: string; }>;
interface IOwnStateProps {
  showShareModal: boolean;
  previewUrl: string;
  activeSlug: string;
  isPublishing: boolean;
}

export const SEE_ALL_SLUG = 'seeall';

class DemoHubsPreviewCon extends React.PureComponent<IProps, IOwnStateProps> {
  private frameConRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showShareModal: false,
      previewUrl: '',
      activeSlug: SEE_ALL_SLUG,
      isPublishing: false,
    };
  }

  componentDidMount(): void {
    this.props.getAllDemoHubs();
    document.title = this.props.title;
    this.props.loadDemoHubAndData(this.props.match.params.demoHubId);
    const activeSlug = this.props.searchParams.get('q');
    this.setState({ activeSlug: activeSlug || SEE_ALL_SLUG });
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if ((this.props.demoHub !== prevProps.demoHub
      || this.props.searchParams.get('q') !== prevProps.searchParams.get('q'))
      && this.props.demoHub) {
      const qualificationSlug = this.props.searchParams.get('q');
      let slug = SEE_ALL_SLUG;
      let prevURL = `seeall/${this.props.demoHub.rid}`;
      if (qualificationSlug !== SEE_ALL_SLUG && qualificationSlug) {
        const validQual = this.props.demoHubConfig?.qualification_page.qualifications.find(
          qualification => qualification.slug === qualificationSlug
        );
        if (validQual) {
          slug = qualificationSlug;
          prevURL = `q/${this.props.demoHub.rid}/${qualificationSlug}`;
        }
      }
      this.setState({ activeSlug: slug, previewUrl: prevURL });
    }

    if (this.props.searchParams.get('s') === '3') {
      this.handleDisplaySizeChange(RESP_MOBILE_SRN_WIDTH, RESP_MOBILE_SRN_HEIGHT, 0);
    } else if (this.props.searchParams.get('s') === '1' || !this.props.searchParams.get('s')) {
      this.handleDisplaySizeChange(DESKTOP_MEDIUM_SRN_WIDTH, DESKTOP_MEDIUM_SRN_HEIGHT, 60);
    }
  }

  componentWillUnmount(): void {
    this.props.clearCurrentDemoHubSelection();
  }

  handleDisplaySizeChange = (vpdW: number, vpdH: number, paddingSpace: number): void => {
    const timer = setTimeout(() => {
      const headerHeight = 76;
      const buttonCon = document.getElementById('button-con');
      const buttonConHeight = buttonCon?.getBoundingClientRect().height || 80;
      const frameConRect = this.frameConRef.current?.getBoundingClientRect();

      clearTimeout(timer);
    }, 50);
  };

  updateDisplaySize = (displaySize: DisplaySize): void => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.set('s', displaySize.toString());
    const updatedUrl = url.pathname + url.search;
    this.props.navigate(updatedUrl);
  };

  publishDemoHub = async (demoHub: P_RespDemoHub): Promise<boolean> => {
    if (!this.props.demoHub) return false;
    const res = await this.props.publishDemoHub(demoHub);
    amplitudeDemoHubPublished({ clicked_from: 'preview', demo_hub_rid: this.props.demoHub!.rid });
    return res;
  };

  render(): ReactElement {
    const displaySize = this.props.searchParams.get('s') || '1';

    const demoHubsLoaded = this.props.demoHubConfig !== null && this.props.demoHub !== null;
    return (
      <>
        {!demoHubsLoaded
          ? <TopLoader
              duration={TOP_LOADER_DURATION}
              showLogo={false}
              showOverlay
          />
          : (
            <GTags.ColCon
              className="tour-con"
              ref={this.frameConRef}
              style={{
                background: 'linear-gradient(177.9deg, rgb(58, 62, 88) 3.6%, rgb(119, 127, 148) 105.8%)',
                alignItems: 'center'
              }}
            >
              <GTags.DemoHeaderCon>
                <Header
                  subs={this.props.subs}
                  tour={null}
                  demoHub={this.props.demoHub}
                  org={this.props.org}
                  principal={this.props.principal}
                  showCalendar
                  showOnboardingGuides
                  navigateToWhenLogoIsClicked="/demo-hubs"
                  rightElGroups={[(
                    <Link
                      to={`/hub/${this.props.match.params.demoHubId}`}
                      style={{ color: 'black' }}
                      onClick={() => amplitudeDemoHubEditorOpened({
                        clicked_from: 'preview',
                        demo_hub_rid: this.props.match.params.demoHubId
                      })}
                    >
                      <AntButton
                        size="small"
                        className="edit-btn"
                        type="default"
                        icon={<EditOutlined />}
                      >
                        &nbsp;Edit
                      </AntButton>
                    </Link>
                  )]}
                  publishOptions={<PreviewHeaderOptions
                    showShareModal={this.state.showShareModal}
                    setShowShareModal={(showShareModal: boolean) => this.setState({ showShareModal })}
                    publishDemoHub={async (demoHub) => {
                      this.setState({ isPublishing: true });
                      const res = await this.publishDemoHub(demoHub);
                      this.setState({ isPublishing: false });
                      return res;
                    }}
                    demoHub={this.props.demoHub}
                    selectedDisplaySize={+displaySize}
                    setSelectedDisplaySize={(selectedDisplaySize: DisplaySize) => this.updateDisplaySize(selectedDisplaySize)}
                    isPublishing={this.state.isPublishing}
                    setIsPublishing={(val) => this.setState({ isPublishing: val })}
                    renderedIn="preview"
                  />}
                  checkCredit={this.props.getSubscriptionOrCheckoutNew}
                />
              </GTags.DemoHeaderCon>
              <DemoHubPreview
                demoHubConfig={this.props.demoHubConfig!}
                width="90%"
                height="90vh"
                previewUrl={this.state.previewUrl}
                activeSlug={this.state.activeSlug}
              />
              <DemoHubShareModal
                demoHub={this.props.demoHub!}
                isModalOpen={this.state.showShareModal}
                closeModal={() => this.setState({ showShareModal: false })}
                openModal={() => this.setState({ showShareModal: true })}
                isPublishing={this.state.isPublishing}
                setIsPublishing={(val) => this.setState({ isPublishing: val })}
                publishDemoHub={this.publishDemoHub}
                loadDemoHubConfig={this.props.loadDemoHubConfig}
              />
            </GTags.ColCon>
          )}
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DemoHubsPreviewCon));
