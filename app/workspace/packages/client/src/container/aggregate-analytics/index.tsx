import React from 'react';
import { connect } from 'react-redux';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import { BarChartOutlined, LoadingOutlined } from '@ant-design/icons';
import { LoadingStatus } from '@fable/common/dist/types';
import { Tooltip } from 'antd';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import SkipLink from '../../component/skip-link';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import * as Tags from './styled';
import * as AnalyticsTags from '../insight-dashboard/styled';
import { fetchOrgWideAnalytics, getSubscriptionOrCheckoutNew } from '../../action/creator';
import Card from '../insight-dashboard/card';
import Bubble from '../insight-dashboard/bubble';
import { getFormattedDate, readableFormKey, readableTimeUnit } from '../insight-dashboard/leads-tab';
import FableLogo from '../../assets/fable-rounded-icon.svg';
import { isFeatureAvailable } from '../../utils';
import Upgrade from '../../component/upgrade';

const mapDispatchToProps = (dispatch: any) => ({
  fetchOrgWideAnalytics: () => dispatch(fetchOrgWideAnalytics()),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

const mapStateToProps = (state: TState) => ({
  org: state.default.org,
  principal: state.default.principal,
  subs: state.default.subs,
  orgWideRespHouseLeadLoadingStatus: state.default.orgWideRespHouseLeadLoadingStatus,
  orgWideRespHouseLead: state.default.orgWideRespHouseLead,
  featurePlan: state.default.featureForPlan,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps {
  loading: boolean;
  isLeadsFeatureAvailable: boolean;
}

class AggregateAnalytics extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      loading: true,
      isLeadsFeatureAvailable: true
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;
    if (this.props.org) this.initAnalytics();
    if (this.props.orgWideRespHouseLead.leads.length) this.setState({ loading: false });
    if (this.props.featurePlan) this.checkIfLeadsFeatureAvailable();
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
    if (prevProps.org !== this.props.org && this.props.org) this.initAnalytics();

    if (prevProps.orgWideRespHouseLeadLoadingStatus !== this.props.orgWideRespHouseLeadLoadingStatus) {
      this.setState({ loading: this.props.orgWideRespHouseLeadLoadingStatus !== LoadingStatus.Done });
    }

    if (prevProps.orgWideRespHouseLead.leads.length !== this.props.orgWideRespHouseLead.leads.length) {
      this.setState({ loading: false });
    }

    if (this.props.featurePlan !== prevProps.featurePlan) {
      this.checkIfLeadsFeatureAvailable();
    }
  }

  checkIfLeadsFeatureAvailable(): void {
    const isAvailable = isFeatureAvailable(this.props.featurePlan, 'aggregate_analytics').isAvailable;
    this.setState({ isLeadsFeatureAvailable: isAvailable });
  }

  initAnalytics() {
    this.props.fetchOrgWideAnalytics();
  }

  render() {
    return (
      <GTags.ColCon className="tour-con">
        {!this.props.org && (
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
            vanityDomains={[]}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon flat={this.props.searchParams.get('c') === '1'}>
            <SidePanel
              selected="leads"
              subs={this.props.subs}
              compact={this.props.searchParams.get('c') === '1'}
            />

          </GTags.SidePanelCon>
          <Tags.BodyCon>
            <div style={{ marginTop: '1rem' }}>
              <div className="typ-h1">
                Leads captured
              </div>
              {this.state.isLeadsFeatureAvailable && (
                <div className="typ-sm">
                  <br />
                  Leads captured via lead forms across all your demos are shown here. To access demo analytics, click on <BarChartOutlined /> icon on demo / demo hub card.
                  <br />
                  <br />
                </div>
              )}
            </div>
            {this.state.loading ? (
              <div>
                <LoadingOutlined style={{ fontSize: '2rem' }} />
              </div>
            ) : this.state.isLeadsFeatureAvailable
              ? (
                <Tags.MainCon>
                  <AnalyticsTags.Row style={{
                    width: '100%',
                    minWidth: 'unset',
                    maxWidth: 'unset',
                    margin: '1rem 0',
                    alignItems: 'center'
                  }}
                  >
                    <Card contentStyle={{ gap: '0.5rem' }}>
                      <div className="c-head">
                        Leads
                        <br />
                        Captured
                        <span className="typ-sm" style={{ display: 'block', whiteSpace: 'nowrap' }}>
                          across all demos
                        </span>
                      </div>
                      <div className="c-metric">
                        {this.props.orgWideRespHouseLead.leads.length}
                      </div>
                    </Card>
                    <Card>
                      <div className="c-head">
                        Leads captured per day
                      </div>
                      <div className="c-metric">
                        <Bubble
                          data={this.props.orgWideRespHouseLead.leadsByDate.map(d => ({
                            date: d.date,
                            value: d.count,
                            value2: 1
                          }))}
                          concepts={{
                            value: {
                              singular: 'Lead',
                              plural: 'Leads'
                            }
                          }}
                        />
                      </div>
                    </Card>
                  </AnalyticsTags.Row>
                  <Tags.LeadCardCon>
                    {this.props.orgWideRespHouseLead.leads.map((lead, i) => (
                      <div className="lead-card" key={i}>
                        <div>
                          <div className="lead-info-l">
                            {this.getLeadCardDisplayBlock(lead.info)}
                          </div>
                          {lead.richInfo && (
                          <div className="lead-loc-l typ-sm">
                            <div>
                              <span>
                                First seen
                                &nbsp;
                                {Object.values(getFormattedDate(lead.nCreatedAt)).join(' : ')}
                              </span>
                              &nbsp;
                              &nbsp;
                              &nbsp;
                              <span>
                                Last seen
                                &nbsp;
                                {Object.values(getFormattedDate(lead.nLastInteractedAt)).join(' : ')}
                              </span>
                            </div>
                            <div>
                              <span>
                                From
                                &nbsp;
                                {getUnicodeFlagIcon(lead.richInfo.country)}
                              &nbsp;
                                {lead.richInfo.countryName}
                                ,&nbsp;
                                {lead.richInfo.countryRegionName}
                              </span>
                            </div>
                          </div>
                          )}
                          <div className="lead-src-l typ-sm">
                            Sourced from:
                            {lead.aggOwners.map(owner => (
                              <span key={owner.rid} className="link-con">
                                <img src={FableLogo} height={14} alt="Fable logo" />
                                <Tooltip
                                  title={
                                    <Tags.TooltipCon>
                                      Click to checkout lead activity on this demo
                                    </Tags.TooltipCon>
                              }
                                  placement="bottom"
                                >
                                  <GTags.OurLink
                                    href={`/analytics/demo/${owner.rid}/leads/${lead.aid}`}
                                    target="_blank"
                                    style={{
                                      display: 'inline-block',
                                      margin: 0
                                    }}
                                  >
                                    {owner.displayName}
                                  </GTags.OurLink>
                                </Tooltip>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="typ-sm">
                          <Tooltip
                            title={
                              <Tags.TooltipCon>
                                <p><b><u>Legend</u></b></p>
                                <p>
                                  🔂 <em>Sessions</em>: Number of sessions created by a lead across all demos.
                                </p>
                                <p>
                                  🕑 <em>Time spent</em>: Time spent by the a lead on all the demos that they have seen.
                                </p>
                                <p>
                                  🏁 <em>Completion</em>: Average completion of a lead across all the demos that they have seen.
                                </p>
                                <p>
                                  🚀 <em>CTA click rate</em>: Rate of CTA click across all demos. If a lead clicks 1 CTA across 2 demos, CTA click rate is 50%. If a lead clicks 2 CTA across 2 demos, CTA click rate is 100%.
                                </p>
                              </Tags.TooltipCon>
                        }
                            placement="right"
                          >
                            <table>
                              <tbody>
                                <tr>
                                  <td>🔂</td>
                                  <td>{lead.sessionCreated}</td>
                                </tr>
                                <tr>
                                  <td>🕑</td>
                                  <td>{readableTimeUnit(lead.timeSpentSec).join(' ')}</td>
                                </tr>
                                <tr>
                                  <td>🏁</td>
                                  <td>{Math.floor(lead.completionPercentage)}%</td>
                                </tr>
                                <tr>
                                  <td>🚀</td>
                                  <td>{Math.floor(lead.ctaClickRate * 100)}%</td>
                                </tr>
                              </tbody>
                            </table>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </Tags.LeadCardCon>
                </Tags.MainCon>
              )
              : (
                <div>
                  <p className="typ-reg">Leads captured via lead forms across all your demos are shown here.
                    To access lead forms, please upgrade your account!
                  </p>
                  <Upgrade subs={this.props.subs} inline clickedFrom="aggregate_analytics" />
                </div>
              )}
          </Tags.BodyCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }

  private static LEAD_FORM_FIELD_DISPLAY_ORDER = ['first_name', 'last_name', 'email', 'phone', 'company'].reverse();

  // eslint-disable-next-line class-methods-use-this
  getLeadCardDisplayBlock = (info: Record<string, string>) => (
    <>
      {info.pk_field && (
        <div className="info-item">
          <div className="fk typ-sm">{readableFormKey(info.pk_field)}</div>
          <div className="fv typ-reg">{info[info.pk_field]}</div>
        </div>
      )}
      {Object.entries(info)
        .filter(([key]) => !(key === info.pk_field || key.startsWith('pk_')))
        .sort((m, n) => AggregateAnalytics.LEAD_FORM_FIELD_DISPLAY_ORDER.indexOf(m[0]) - AggregateAnalytics.LEAD_FORM_FIELD_DISPLAY_ORDER.indexOf(n[0])).reverse()
        .map(([key, value]) => (
          <div className="info-item" key={key}>
            <div className="fk typ-sm">{readableFormKey(key)}</div>
            <div className="fv typ-reg">{value}</div>
          </div>
        ))}
    </>
  );
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AggregateAnalytics));
