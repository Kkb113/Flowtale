/* eslint-disable class-methods-use-this */
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Segmented } from 'antd';
import { ReqTourPropUpdate, RespEntityMetrics, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, IAnnotationOriginConfig, TourData, TourScreenEntity } from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { getDefaultLiteralTourOpts, getDefaultTourOpts } from '@fable/common/dist/utils';
import { traceEvent } from '@fable/common/dist/amplitude';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import Card from './card';
import Header from '../../component/header';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import {
  P_MEntityMetricsDaily,
  getDailySessionsAndConversion,
  getEntityMetrics,
  getLeads,
  loadTourAndData,
  getEntitySubEntityDistribution,
  P_EntitySubEntityDistMetrics,
  HistogramData,
  P_RespHouseLead,
  getActivityData,
  getSubscriptionOrCheckoutNew,
  publishTour,
  getCustomDomains,
  updateTourProp
} from '../../action/creator';
import Bar from './bar';
import Line from './line';
import Funnel from './funnel';
import Leads, { IAnnotationOriginConfigWithModule } from './leads-tab';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { createIframeSrc, getAnnotationsPerScreen, getTourMainValidity, setEventCommonState } from '../../utils';
import { SiteData, TourMainValidity } from '../../types';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

const mapDispatchToProps = (dispatch: any) => ({
  publishTour: (tour: P_RespTour) => dispatch(publishTour(tour)),
  loadTourWithData: (rid: string) => dispatch(loadTourAndData(rid, true)),
  getEntityMetrics: (tourId: string) => dispatch(getEntityMetrics(tourId)),
  getDailySessionsAndConversion: (tourId: string) => dispatch(getDailySessionsAndConversion(tourId)),
  getLeads: (tourId: string) => dispatch(getLeads(tourId)),
  getEntitySubEntityDistMetrics: (tourId: string) => dispatch(getEntitySubEntityDistribution(tourId)),
  getActivityData: (rid: string, aid: string) => dispatch(getActivityData(rid, aid)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
  getVanityDomains: () => dispatch(getCustomDomains()),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  principal: RespUser | null;
  org: RespOrg | null;
  subs: P_RespSubscription | null;
  // allAnnotationsForTour: AnnotationPerScreen[];
  // journey: JourneyData | null;
  // isTourLoaded: boolean;
  // opts: ITourDataOpts | null;
  tourMainVailidity: TourMainValidity;
  // featureForPlan: FeatureForPlan | null;
  vanityDomains: P_RespVanityDomain[] | null;
}
const mapStateToProps = (state: TState): IAppStateProps => {
  const allAnnotationsForTour = getAnnotationsPerScreen(state);

  const tourOpts = state.default.localTourOpts
  || state.default.remoteTourOpts
  || (state.default.globalConfig ? getDefaultTourOpts(state.default.globalConfig!) : getDefaultLiteralTourOpts());

  let tourMainVailidity: TourMainValidity = TourMainValidity.Valid;
  if (state.default.tourLoaded) {
    tourMainVailidity = getTourMainValidity(tourOpts, state.default.journey, allAnnotationsForTour);
  }

  return ({
    tour: state.default.currentTour,
    org: state.default.org,
    principal: state.default.principal,
    subs: state.default.subs,
    tourMainVailidity,
    vanityDomains: state.default.vanityDomains,
  });
};

interface IOwnProps {
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
  tourId: string;
  module?: string;
  aid?: string;
}>;

interface LazyValue<T> {
  val: T;
  isLoaded: boolean;
}

interface P_EntitySubEntityDistMetricsWithFunnelData extends P_EntitySubEntityDistMetrics {
  annFunnelData: Array<{
    x: string;
    y: number;
    hist?: HistogramData
  }>
}

interface IOwnStateProps {
  annMap: Record<string, IAnnotationOriginConfigWithModule>;
  selectedModule: 'Overview' | 'Leads';
  totalSession: LazyValue<number>;
  uniqueImpression: LazyValue<number>;
  leadsCaptured: LazyValue<P_RespHouseLead[]>;
  leadsByDate: LazyValue<{
    date: Date,
    count: number,
  }[]>;
  conversionRate: LazyValue<number>;
  dailyMetrics: LazyValue<P_MEntityMetricsDaily[]>;
  entitySubEntityDistMetrics: LazyValue<P_EntitySubEntityDistMetricsWithFunnelData>;
}

class ComponentClassName extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      annMap: {},
      selectedModule: 'Overview',
      totalSession: { val: 0, isLoaded: false },
      uniqueImpression: { val: 0, isLoaded: false },
      leadsCaptured: { val: [], isLoaded: false },
      leadsByDate: { val: [], isLoaded: false },
      conversionRate: { val: 0, isLoaded: false },
      dailyMetrics: { val: [], isLoaded: false },
      entitySubEntityDistMetrics: { val: {
        sessionTimeBucket: {
          bins: [],
          freq: [],
          bucketCount: 0,
          bucketMin: 0,
          bucketMax: 0,
        },
        completionBucket: {
          bins: [],
          freq: [],
          bucketCount: 0,
          bucketMin: 0,
          bucketMax: 0,
        },
        avgCompletionPercentage: 0,
        avgSessionTimeInSec: 0,
        perAnnotationStat: {},
        annFunnelData: [],
      },
      isLoaded: false },
    };
  }

  // eslint-disable-next-line class-methods-use-this
  traverse(start: {
    main: string,
    moduleName: string,
    moduleIndex: number;
    moduleLength: number;
    offset: number;
    isPhony: boolean;
  }, annMap: Record<string, IAnnotationOriginConfig>): IAnnotationOriginConfigWithModule[] {
    const startingPoint = start.main;
    if (!(startingPoint in annMap)) {
      return [];
    }

    const traversed = [];
    let ptr = annMap[startingPoint];
    const maxItr = Object.keys(annMap).length;
    let itr = 0;
    let i = 0;
    while (true) {
      const tPtr = ptr as IAnnotationOriginConfigWithModule;
      tPtr.moduleName = start.moduleName;
      tPtr.moduleIndex = start.moduleIndex;
      tPtr.moduleLength = start.moduleLength;
      tPtr.stepNumber = start.offset + ++i;
      tPtr.isPhony = start.isPhony;

      traversed.push(tPtr);
      const btns = tPtr.buttons;
      const next = btns.find(btn => btn.type === 'next');
      if (!next) break;
      if (!next.hotspot) break;
      if (next.hotspot.actionType !== 'navigate') break;
      const nextAnnId = typeof next.hotspot.actionValue === 'string' ? next.hotspot.actionValue : next.hotspot.actionValue._val;
      ptr = annMap[nextAnnId];
      if (!ptr) {
        raiseDeferredError(new Error('Broken linked list. Is file corrupted?'));
      }

      if (itr++ > maxItr) {
        raiseDeferredError(new Error('Max itr exhausted'));
        break;
      }
    }

    return traversed;
  }

  getFlatOrderedAnn(data: TourData): IAnnotationOriginConfigWithModule[] {
    const modules = ((data.journey || {}).flows) || [];
    const main = (data.opts || {}).main;

    if (modules.length === 0 && !main) return [];
    const nItr = modules.length ? modules : [{ main, header1: '', isPhony: true }];

    const annMap: Record<string, IAnnotationOriginConfig> = {};
    for (const [screenId, anns] of Object.entries(data.entities)) {
      for (const ann of Object.values((anns as TourScreenEntity).annotations)) {
        annMap[`${screenId}/${ann.refId}`] = ann;
      }
    }

    const orderedAnn = [];
    let i = 0;
    let offset = 0;
    for (const itr of nItr) {
      const arr = this.traverse({
        main: itr.main,
        moduleName: itr.header1,
        isPhony: !!(itr as any).isPhony,
        moduleIndex: i++,
        moduleLength: nItr.length,
        offset
      }, annMap);
      offset += arr.length;
      orderedAnn.push(...arr);
    }
    return orderedAnn;
  }

  navigateToTab(tab: 'Overview' | 'Leads') {
    this.props.navigate(`/analytics/demo/${this.props.match.params.tourId}/${tab.toLowerCase()}`);
  }

  navigateToAid = (aid: string) => {
    const pathname = this.props.location.pathname;
    const frag = pathname.split('/');
    const pathWithoutAid = frag.slice(0, 5).join('/');
    this.props.navigate(`${pathWithoutAid}/${aid}`);
  };

  switchModuleFromUrl() {
    let mod: 'Overview' | 'Leads' = 'Overview';
    switch ((this.props.match.params.module || '').toLowerCase()) {
      case 'overview':
        mod = 'Overview';
        break;
      case 'leads':
        mod = 'Leads';
        break;
      default: break;
    }
    this.setState({
      selectedModule: mod
    });
  }

  checkTabNavigation() {
    const mod = this.props.match.params.module;
    if (!mod
      || !(mod.toLowerCase() === 'overview' || mod.toLowerCase() === 'leads')) {
      this.navigateToTab('Overview');
    } else {
      this.switchModuleFromUrl();
    }
  }

  componentDidUpdate(prevProps: IProps) {
    this.checkTabNavigation();
    if (prevProps.match.params.module !== this.props.match.params.module) {
      this.switchModuleFromUrl();
      // set state
    }
  }

  async componentDidMount(): Promise<void> {
    this.checkTabNavigation();
    this.props.getVanityDomains();

    const tourId = this.props.match.params.tourId;
    this.props.getEntityMetrics(tourId)
      .then((metric: RespEntityMetrics) => {
        const converstionRate = metric.viewsAll > 0 ? Math.ceil((metric.conversion / metric.viewsUnique) * 100) : 0;
        this.setState({
          totalSession: { val: metric.viewsAll, isLoaded: true },
          uniqueImpression: { val: metric.viewsUnique, isLoaded: true },
          conversionRate: { val: converstionRate, isLoaded: true },
        });
      });

    this.props.getLeads(tourId)
      .then((leads: {
        leads: P_RespHouseLead[];
        leadsByDate: {
          date: Date,
          count: number,
        }[]
      }) => this.setState({
        leadsCaptured: { val: leads.leads, isLoaded: true },
        leadsByDate: { val: leads.leadsByDate, isLoaded: true }
      }));

    this.props.getDailySessionsAndConversion(tourId)
      .then((dailyMetrics: P_MEntityMetricsDaily[]) => this.setState({ dailyMetrics: { val: dailyMetrics, isLoaded: true } }));

    Promise.all([
      this.props.loadTourWithData(tourId),
      this.props.getEntitySubEntityDistMetrics(tourId)
    ]).then(([[, tour], dist]: [[number, TourData], P_EntitySubEntityDistMetrics]) => {
      const orderedAnns = this.getFlatOrderedAnn(tour);
      this.setState({ annMap: orderedAnns.reduce((ob, ann) => {
        ob[ann.refId] = ann;
        return ob;
      }, {} as Record<string, IAnnotationOriginConfigWithModule>) });

      let prevValue = Number.POSITIVE_INFINITY;
      const funnelData = [];
      let i = 0;
      for (const an of orderedAnns) {
        i++;
        if (!(an.refId in dist.perAnnotationStat)) {
          console.warn(`${an.refId} is not present in the stat object. Moving on.`);
          continue;
        }
        // This is done becuase demos with module would have non linear access pattern
        const viewAll = Math.min(prevValue, dist.perAnnotationStat[an.refId].viewsAll);
        prevValue = viewAll;
        const label = an.moduleName ? `${an.moduleName} / Step ${i}` : `Step ${i}`;
        funnelData.push({ x: label, y: viewAll, hist: dist.perAnnotationStat[an.refId].timeSpentBucket });
      }

      const tDist = dist as P_EntitySubEntityDistMetricsWithFunnelData;
      tDist.annFunnelData = funnelData;
      this.setState({
        entitySubEntityDistMetrics: { val: tDist, isLoaded: true },
      });
    });
    setEventCommonState(CmnEvtProp.TOUR_URL, createIframeSrc(`/demo/${this.props.match.params.tourId}`));
  }

  loadActivityData = (rid: string) => (aid: string) => this.props.getActivityData(rid, aid);

  private onSiteDataChange = (site: SiteData): void => {
    this.props.updateTourProp(this.props.tour!.rid, 'site', site);
  };

  render() {
    if (!this.props.tour) {
      return (
        <div>
          <FullPageTopLoader showLogo text="Loading demo" />
        </div>
      );
    }

    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          {this.props.tour && <Header
            subs={this.props.subs}
            showOnboardingGuides
            tour={this.props.tour}
            navigateToWhenLogoIsClicked="/demos"
            org={this.props.org}
            tourMainValidity={this.props.tourMainVailidity}
            minimalHeader
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour.rid}`} style={{ color: 'white' }}>
                <Button
                  size="small"
                  className="edit-btn"
                  type="default"
                  onClick={() => {
                    traceEvent(
                      AMPLITUDE_EVENTS.EDIT_DEMO,
                      {
                        edit_clicked_from: 'analytics'
                      },
                      [CmnEvtProp.EMAIL]
                    );
                  }}
                >
                  Edit demo
                </Button>
              </Link>
            )]}
            titleElOnLeft={
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <GTags.Txt className="subsubhead">Insight for</GTags.Txt>
                <GTags.Txt
                  className="overflow-ellipsis"
                  style={{ fontWeight: 500 }}
                >{this.props.tour.displayName}
                </GTags.Txt>
              </div>
            }
            principal={this.props.principal}
            showCalendar
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
            publishTour={this.props.publishTour}
            vanityDomains={this.props.vanityDomains}
            onSiteDataChange={this.onSiteDataChange}
            clickedFrom="analytics"
          />}
        </GTags.HeaderCon>
        <GTags.BodyCon style={{
          height: 'calc(100% - 72px)',
          background: 'linear-gradient(to top, #e6e9f0 0%, #eef1f5 100%)',
          overflowY: 'scroll',
          alignItems: 'center',
          padding: '1rem 0'
        }}
        >
          <Tags.Ctrl>
            <Segmented
              style={{ marginBottom: 8 }}
              onChange={(value) => this.navigateToTab(value as ('Overview' | 'Leads'))}
              value={this.state.selectedModule}
              options={['Overview', 'Leads']}
            />
          </Tags.Ctrl>
          {this.state.selectedModule === 'Overview' && (
            <>
              <Tags.Row>
                <Card loading={!this.state.totalSession.isLoaded}>
                  <div className="c-head">
                    Total<br />
                    Sessions
                  </div>
                  <div className="c-metric">
                    {this.state.totalSession.val}
                  </div>
                </Card>
                <Card loading={!this.state.uniqueImpression.isLoaded}>
                  <div className="c-head">
                    Unique
                    <br />
                    Impressions
                  </div>
                  <div className="c-metric">
                    {this.state.uniqueImpression.val}
                  </div>
                </Card>
                <Card loading={!this.state.leadsCaptured.isLoaded}>
                  <div className="c-head">
                    Leads
                    <br />
                    Captured
                  </div>
                  <div className="c-metric">
                    {this.state.leadsCaptured.val.length}
                  </div>
                </Card>
                <Card loading={!this.state.conversionRate.isLoaded}>
                  <div className="c-head">
                    Conversion
                    <br />
                    Rate
                  </div>
                  <div className="c-metric">
                    {this.state.conversionRate.val}<span className="subtitle">&nbsp;%</span>
                  </div>
                </Card>
              </Tags.Row>
              <Tags.Row>
                <Card loading={!this.state.conversionRate.isLoaded}>
                  <div className="c-head">
                    Session time
                  </div>
                  <div className="sbs-con">
                    <div>
                      <div className="c-metric">
                        {this.state.entitySubEntityDistMetrics.val.avgSessionTimeInSec}<span className="subtitle">&nbsp;secs</span>
                      </div>
                      <div className="subsubtitle">Median</div>
                    </div>
                    <div style={{ minWidth: '200px' }}>
                      <Bar
                        xs={this.state.entitySubEntityDistMetrics.val.sessionTimeBucket.bins}
                        ys={this.state.entitySubEntityDistMetrics.val.sessionTimeBucket.freq}
                        conceptY="sessions spent"
                        conceptX="seconds"
                        noPad
                      />
                    </div>
                  </div>
                </Card>
                <Card loading={!this.state.conversionRate.isLoaded}>
                  <div className="c-head">
                    Completion
                  </div>
                  <div className="sbs-con">
                    <div>
                      <div className="c-metric">
                        {this.state.entitySubEntityDistMetrics.val.avgCompletionPercentage}<span className="subtitle">&nbsp;%</span>
                      </div>
                      <div className="subsubtitle">Median</div>
                    </div>
                    <div style={{ minWidth: '200px' }}>
                      <Bar
                        xs={this.state.entitySubEntityDistMetrics.val.completionBucket.bins}
                        ys={this.state.entitySubEntityDistMetrics.val.completionBucket.freq}
                        conceptY="sessions completed"
                        conceptX="%"
                        noPad
                      />
                    </div>
                  </div>
                </Card>
              </Tags.Row>
              <Tags.Row>
                <Card loading={!this.state.dailyMetrics.isLoaded} style={{ width: '100%' }}>
                  <div className="c-head">
                    Sessions & conversions per day for past 60days
                  </div>
                  <div style={{ height: '148px', marginTop: '1rem' }}>
                    <Line
                      concepts={{
                        value: {
                          singular: 'Session',
                          plural: 'Sessions'
                        },
                        value2: {
                          singular: 'Conversion',
                          plural: 'Conversions'
                        }
                      }}
                      data={this.state.dailyMetrics.val.map(item => ({
                        date: item.nDate,
                        value: item.viewsAll,
                        value2: item.conversion,
                        value3: 0,
                      })).reverse()}
                    />
                  </div>
                </Card>
              </Tags.Row>
              <Tags.Row>
                <Card loading={false} style={{ width: '100%' }}>
                  <div className="c-head">
                    Session dropoff per demo step
                  </div>
                  <div className="help-text" style={{ width: '80%' }}>
                    As your buyers progresses through the demo, they drop off at different steps.
                    This chart captures the dropoff rate at each step for past 6 months.
                  </div>
                  <div style={{ height: '240px', overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ height: '100%', minWidth: '100%', width: `${this.state.entitySubEntityDistMetrics.val.annFunnelData.length * 90}px` }}>
                      <Funnel data={this.state.entitySubEntityDistMetrics.val.annFunnelData} />
                    </div>
                  </div>
                </Card>
              </Tags.Row>
            </>
          )}
          {this.state.selectedModule === 'Leads' && (
            <Leads
              isLoaded={this.state.leadsCaptured.isLoaded}
              leads={this.state.leadsCaptured.val}
              leadsByDate={this.state.leadsByDate.val}
              selectedLeadAid={this.props.match.params.aid}
              navigateToAid={this.navigateToAid}
              getActivityDataByAid={this.loadActivityData(this.props.tour!.rid)}
              annMap={this.state.annMap}
            />
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ComponentClassName));
