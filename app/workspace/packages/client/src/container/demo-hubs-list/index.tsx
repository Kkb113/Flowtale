import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import {
  getAllDemoHubs,
  createDemoHub,
  renameDemoHub,
  publishDemoHub,
  deleteDemoHub,
  loadDemoHubConfig,
  getSubscriptionOrCheckoutNew,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { IDemoHubConfig, P_RespDemoHub, RenameDemoHubFn, } from '../../types';
import DemoHubsListing from '../../component/demo-hubs-list';
import TopLoader from '../../component/loader/top-loader';
import Header from '../../component/header';
import SkipLink from '../../component/skip-link';
import SidePanel from '../../component/side-panel';
import { TOP_LOADER_DURATION } from '../../constants';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { FeatureForPlan } from '../../plans';

interface IDispatchProps {
  getAllDemoHubs: () => void;
  createNewDemoHub: (name: string) => Promise<P_RespDemoHub>;
  renameDemoHub: RenameDemoHubFn;
  deleteDemoHub: (demoHubRid: string) => void;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>;
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>;
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>;
}

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllDemoHubs: () => dispatch(getAllDemoHubs()),
  createNewDemoHub: (name: string) => dispatch(createDemoHub(name)),
  renameDemoHub: (demoHub: P_RespDemoHub, name: string) => dispatch(
    renameDemoHub(demoHub, name)
  ),
  deleteDemoHub: (demoHubRid: string) => dispatch(deleteDemoHub(demoHubRid)),
  publishDemoHub: (demoHub) => dispatch(publishDemoHub(demoHub)),
  loadDemoHubConfig: (demoHub) => dispatch(loadDemoHubConfig(demoHub)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

interface IAppStateProps {
  demoHubs: P_RespDemoHub[] | null,
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  vanityDomains: P_RespVanityDomain[] | null;
  org: RespOrg | null;
  featurePlan: FeatureForPlan | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  demoHubs: state.default.demoHubs,
  subs: state.default.subs,
  principal: state.default.principal,
  vanityDomains: state.default.vanityDomains,
  org: state.default.org,
  featurePlan: state.default.featureForPlan,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;
interface IOwnStateProps {
}

class DemoHubsList extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.getAllDemoHubs();
    document.title = this.props.title;
  }

  navigateToDemoHub = (demoHubRid: string): void => {
    const url = `/hub/${demoHubRid}`;
    this.props.navigate(url);
  };

  render(): ReactElement {
    return (
      <GTags.ColCon className="tour-con">
        {!this.props.demoHubs && (
          <TopLoader
            duration={TOP_LOADER_DURATION}
            showLogo={false}
            showOverlay
          />
        )}
        <SkipLink />
        <div style={{ height: '48px' }}>
          <Header
            subs={this.props.subs}
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            org={this.props.org}
            leftElGroups={[]}
            vanityDomains={this.props.vanityDomains}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon flat={this.props.searchParams.get('c') === '1'}>
            <SidePanel
              selected="demo-hub"
              subs={this.props.subs}
              compact={this.props.searchParams.get('c') === '1'}
            />
          </GTags.SidePanelCon>
          {/* hello */}

          {this.props.demoHubs && (
            <DemoHubsListing
              demoHubsList={this.props.demoHubs!}
              createNewDemoHub={this.props.createNewDemoHub}
              renameDemoHub={this.props.renameDemoHub}
              deleteDemoHub={this.props.deleteDemoHub}
              publishDemoHub={this.props.publishDemoHub}
              loadDemoHubConfig={this.props.loadDemoHubConfig}
              navigateToDemoHub={this.navigateToDemoHub}
              featurePlan={this.props.featurePlan}
            />
          )}
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DemoHubsList));
