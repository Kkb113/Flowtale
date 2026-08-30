/* eslint-disable no-mixed-operators */
import { DeviceAndGeoInfo, RespHouseLead, Activity } from '@fable/common/dist/api-contract';
import React, { useEffect, useState } from 'react';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import { LoadingOutlined } from '@ant-design/icons';
import { Timeline, Tooltip } from 'antd';
import { IAnnotationOriginConfig } from '@fable/common/dist/types';
import { SHORT_MONTHS } from '@fable/common/dist/utils';
import Card from './card';
import * as Tags from './styled';
import { P_RespHouseLead } from '../../action/creator';
import Bubble from './bubble';

export function getFormattedDate(d: Date): { date: string, time: string } {
  const date = `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  return {
    date,
    time
  };
}

export function formatTimeFromSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds} ${seconds === 1 ? 'Sec' : 'Secs'}`;
  } if (remainingSeconds === 0) {
    return `${minutes} ${minutes === 1 ? 'Min' : 'Mins'}`;
  }
  return `${minutes} ${minutes === 1 ? 'Min' : 'Mins'} ${remainingSeconds} ${remainingSeconds === 1 ? 'Sec' : 'Secs'}`;
}

interface Props {
  leads: P_RespHouseLead[];
  isLoaded: boolean;
  leadsByDate: {
    date: Date;
    count: number;
  }[];
  selectedLeadAid?: string;
  navigateToAid: (aid: string) => void;
  getActivityDataByAid: (aid: string) => Promise<Array<Activity>>;
  annMap: Record<string, IAnnotationOriginConfigWithModule>;
}

export interface IAnnotationOriginConfigWithModule extends IAnnotationOriginConfig {
  moduleName: string;
  moduleIndex: number;
  moduleLength: number;
  stepNumber: number;
  isPhony: boolean;
}

function getEventDisplayNameAndNormalizedEventPayload(activity: P_Activity): {
  displayName: string;
  payload: Record<string, string>
} {
  let eventDisplayName = activity.event;
  const payloadData: Record<string, string> = {};
  if (activity.event === 'demo_opened') {
    eventDisplayName = 'Demo Opened';
  } else if (activity.event === 'nav_to_ann') {
    eventDisplayName = 'Navigate to step';
    if (activity.payload.annType === 'leadform') payloadData['Leadform submitted'] = '';
  } else if (activity.event === 'cta_clicked') {
    eventDisplayName = 'Clicked CTA';
    payloadData['Button Text'] = activity.payload.btnTxt;
    payloadData['Button URL'] = activity.payload.url;
    if (activity.payload.source === 'ann-btn') payloadData['Clicked from: '] = 'CTA on annotation';
    if (activity.payload.source === 'module-cta') payloadData['Clicked from: '] = 'CTA on module';
    if (activity.payload.source === 'site-header-cta') payloadData['Clicked from: '] = 'CTA on site header';
    if (activity.payload.source === 'demo-hub') payloadData['Clicked from: '] = 'CTA on demo hub';
  }

  return {
    displayName: eventDisplayName,
    payload: payloadData
  };
}

export function readableTimeUnit(ts: number) {
  if (ts >= 3600) {
    const m = Math.round(ts / 3600);
    return [m, m <= 1 ? 'hour' : 'hours'];
  }
  if (ts >= 60) {
    const m = Math.round(ts / 60);
    return [m, m <= 1 ? 'min' : 'mins'];
  }
  return [ts, ts <= 1 ? 'sec' : 'secs'];
}

export function readableFormKey(key:string) {
  return key.replace(/_+/g, ' ').split(/\s+/)
    .filter(w => w)
    .map(word => word.substring(0, 1).toUpperCase() + word.substring(1))
    .join(' ');
}

function LeadItem(props: {
lead: P_RespHouseLead,
sel?: boolean,
nav: (aid: string) => void
}) {
  let uniIcon = '';
  if (props.lead.pkField === 'email') uniIcon = '📧';
  if (props.lead.pkField === 'phone') uniIcon = '📞';
  return (
    <Tags.LeadItem
      className={`typ-reg ${props.sel ? 'selected' : ''}`}
      onClick={() => props.nav(props.lead.aid)}
    >
      <div className="type-reg line1">
        <span className="typ-sm">{uniIcon}</span>&nbsp;{props.lead.pkVal}
      </div>
      <div className="line2">
        {props.lead.richInfo && (
          <div className="typ-sm">
            <span>
              {getUnicodeFlagIcon(props.lead.richInfo.country) }
              &nbsp;
              {props.lead.richInfo.countryName}
            </span>
            <span>
              {props.lead.richInfo.countryRegionName}
            </span>
          </div>
        )}
      </div>
      <div className="line3 typ-sm">
        <span>
          🔂 {props.lead.sessionCreated}
        </span>
        <span>
          🕑 {readableTimeUnit(props.lead.timeSpentSec).join(' ')}
        </span>
        <span>
          🏁 {props.lead.completionPercentage}%
        </span>
      </div>
    </Tags.LeadItem>
  );
}

function getDeviceBlock(richInfo: DeviceAndGeoInfo) {
  let icon = '';
  let name;
  if (richInfo.isMobile || richInfo.isTablet || richInfo.isSmartTv) {
    icon = '📱';
    if (richInfo.isIosViewer) name = 'iOS';
    else if (richInfo.isAndroidViewer) name = 'Android';
    else name = 'Mobile';
  } else {
    icon = '🖥️';
    name = 'Desktop';
  }

  return (
    <tr>
      <td>{icon}</td>
      <td>Device</td>
      <td>{name}</td>
    </tr>
  );
}

function getTimelineAndAnnData(activity: P_Activity, map: Record<string, IAnnotationOriginConfigWithModule>) {
  if (!(activity.payload && activity.payload.annId && activity.payload.annId in map)) {
    return {
      hueRotation: 0,
      label: '',
      step: '',
      journeyName: '',
      annDisplayText: '',
      href: ''
    };
  }
  const annId = activity.payload.annId;

  return {
    hueRotation: map[annId].moduleIndex / map[annId].moduleLength * 360,
    label: `${map[annId].moduleName ? `${map[annId].moduleName} /` : ''} Step ${map[annId].stepNumber}`,
    journeyName: map[annId].moduleName,
    step: `Step ${map[annId].stepNumber}`,
    annDisplayText: map[annId].displayText,
    // href: map[annId].ann.location // todo
    href: ''
  };
}

interface P_Activity extends Activity {
  relOffset: number;
  nCreatedAt: Date;
}

type MetaMap = Record<string, {
    idx: number;
    sessionDurationInSec: number;
    sessionStartTime: Date;
    maxTimeSpent: number;
    shouldSkip: boolean;
  }>;

// this data is sorted in descending order
function processLeadActivityData(rawData: Activity[]): {
  metaMap: MetaMap,
  gropedActivity: Array<P_Activity[]>,
} {
  const groupBySidMeta: MetaMap = {};
  const groupBySid: Array<P_Activity[]> = [];

  // group data by sessions
  for (const data of rawData) {
    const tData = data as P_Activity;

    // WARN some port because of messup
    if (tData.payload.ann_id) tData.payload.annId = tData.payload.ann_id;
    if (tData.payload.ann_type) tData.payload.annType = tData.payload.ann_type;

    tData.nCreatedAt = new Date(tData.createdAt);
    if (data.sid in groupBySidMeta) {
      groupBySid[groupBySidMeta[data.sid].idx].push(tData);
    } else {
      const idx = groupBySid.push([tData]);
      groupBySidMeta[data.sid] = {
        idx: idx - 1,
        sessionDurationInSec: 0,
        sessionStartTime: new Date(),
        maxTimeSpent: 0,
        shouldSkip: false
      };
    }
  }

  // calculate stats for each group
  for (const [sid, meta] of Object.entries(groupBySidMeta)) {
    const activityForSession = groupBySid[meta.idx];
    meta.sessionStartTime = activityForSession.at(-1)!.nCreatedAt;
    meta.sessionDurationInSec = Math.ceil((+activityForSession[0]!.nCreatedAt - +activityForSession.at(-1)!.nCreatedAt) / 1000);

    let maxOffset = Number.NEGATIVE_INFINITY;
    // Since this event is not shown to the user as this is an internal event, we skip sessions only having this
    // Normally demo opened would have been fired when this event is fired, but during migaration there might be
    // user_assign event but not demo_opened event
    let numberOfEventForUserAssign = 0;
    let swapIndex = 0;
    for (let i = activityForSession.length - 1; i >= 0; i--) {
      if (activityForSession[i].event === 'user_assign') numberOfEventForUserAssign++;
      let curr;
      if (i === activityForSession.length - 1) {
        curr = activityForSession[i].relOffset = activityForSession[i].metric1;
      } else {
        curr = activityForSession[i].relOffset = Math.abs(activityForSession[i].metric1 - activityForSession[i + 1].metric1);
      }
      maxOffset = Math.max(maxOffset, curr);

      // sometimes demo_opened might not be the first events as event capturing is async and buffered
      // we adjust that value here
      if (activityForSession[i].event === 'demo_opened') swapIndex = i;
    }

    // move the demo opened event at the beginning and push all the other events to the left (since the events are in
    // descending order).
    const [evt] = activityForSession.splice(swapIndex, 1);
    activityForSession.push(evt);

    if (numberOfEventForUserAssign === activityForSession.length) meta.shouldSkip = true;
    meta.maxTimeSpent = maxOffset;
  }

  return {
    metaMap: groupBySidMeta,
    gropedActivity: groupBySid,
  };
}

export default function Leads(props: Props) {
  const [selectedLead, setSelectedLead] = useState<P_RespHouseLead | undefined | null>(undefined);
  const [activityDataLoading, setActivityDataLoading] = useState(false);
  const [activityData, setActivityData] = useState<{
  metaMap: MetaMap,
  gropedActivity: Array<P_Activity[]>,
} | null>(null);

  useEffect(() => {
    if (props.selectedLeadAid) {
      const lead = props.leads.filter(l => l.aid === props.selectedLeadAid)[0];
      setSelectedLead(lead || null);
      if (lead) {
        setActivityDataLoading(true);
        props.getActivityDataByAid(lead.aid).then(data => {
          setActivityData(processLeadActivityData(data));
          setActivityDataLoading(false);
        });
      }
    }
  }, [props.selectedLeadAid, props.leads]);

  return (
    <>
      <Tags.Row style={{
        alignItems: 'center',
        width: '85%',
        maxWidth: '85%',
      }}
      >
        <Card loading={!props.isLoaded}>
          <div className="c-head">
            Leads
            <br />
            Captured
          </div>
          <div className="c-metric">
            {props.leads.length}
          </div>
        </Card>
        <Card loading={!props.isLoaded}>
          <div className="c-head">
            Leads captured per day
          </div>
          <div className="c-metric">
            <Bubble
              data={props.leadsByDate.map(d => ({
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
      </Tags.Row>
      <Tags.Row style={{
        width: '85%',
        maxWidth: '85%',
        height: '100%'
      }}
      >
        <Card
          loading={!props.isLoaded}
          style={{
            width: '100%',
            height: '90%'
          }}
          contentStyle={{
            height: '90%'
          }}
        >
          <div className="c-head" style={{ fontWeight: 500 }}>
            Lead activity
          </div>
          <Tags.LeadActivity>
            <div className="lead-list">
              {props.leads.map((lead, i) => (
                <LeadItem
                  key={i}
                  lead={lead}
                  sel={lead.aid === props.selectedLeadAid}
                  nav={props.navigateToAid}
                />))}
            </div>
            <div className={`activity-history ${props.selectedLeadAid ? '' : 'empty'}`}>
              {props.selectedLeadAid ? (
                <div className="con">
                  {!props.isLoaded ? (<LoadingOutlined style={{ fontSize: '2rem' }} />) : (
                    selectedLead ? (
                      <>
                        <div className="timeline">
                          {activityDataLoading && (<LoadingOutlined style={{ fontSize: '2rem', marginBottom: '2rem' }} />)}
                          {activityData && (
                            activityData.gropedActivity.map((activities, i) => {
                              const meta = activityData.metaMap[activities[0].sid];
                              if (meta.shouldSkip) return undefined;
                              const maxTimeInGroup = meta.maxTimeSpent;
                              const formattedDate = getFormattedDate(meta.sessionStartTime);
                              const duration = formatTimeFromSeconds(meta.sessionDurationInSec);
                              return (
                                <div key={i}>
                                  <div className="session-header">
                                    <span>
                                      {formattedDate.date} : {formattedDate.time}
                                    </span>
                                    <span>-</span>
                                    <span>
                                      Session for {duration}
                                    </span>
                                  </div>
                                  <Timeline
                                    key={i}
                                    style={{ paddingTop: '10px' }}
                                    mode="left"
                                    items={activities.filter(activity => activity.event !== 'user_assign').map((activity, k) => {
                                      const data = getTimelineAndAnnData(activity, props.annMap);
                                      const displayData = getEventDisplayNameAndNormalizedEventPayload(activity);
                                      return {
                                        color: 'blue',
                                        label: (
                                          <Tooltip
                                            placement="left"
                                            title={(
                                              <Tags.TimelineLabelTooltip>
                                                {data.step && (
                                                <div className="step"><b>{data.step}</b> of Module &nbsp;
                                                  <Tags.Colored hueRotation={data.hueRotation}>{data.journeyName}</Tags.Colored>
                                                </div>)}
                                                {data.annDisplayText && (<div className="dtxt">{data.annDisplayText}</div>)}
                                              </Tags.TimelineLabelTooltip>
                                            )}
                                          >
                                            <a href={data.href} target="_blank" rel="noreferrer">{data.label}</a>
                                          </Tooltip>
                                        ),
                                        children: (
                                          <div key={k}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Tooltip
                                                placement="right"
                                                title={(
                                                  <Tags.TimelineLabelTooltip>
                                                    <div className="step">
                                                      {data.step && (
                                                        <>
                                                          <b>{data.step}</b><br />{data.journeyName ? (<>Module &nbsp;<Tags.Colored hueRotation={data.hueRotation}>{data.journeyName}</Tags.Colored></>) : undefined}
                                                        </>
                                                      )}
                                                      <div className="step">Time spent&nbsp;<b>{activity.relOffset} Seconds</b></div>
                                                    </div>
                                                  </Tags.TimelineLabelTooltip>
                                                )}
                                              >
                                                <div className="activity-details-con">
                                                  <div className="activity-title">
                                                    <span>
                                                      {displayData.displayName}
                                                    </span>
                                                  </div>
                                                  <div className="activity-desc-con">
                                                    <>
                                                      {Object.entries(displayData.payload).map(([title, value]: [string, string], kk: number) => (
                                                        <div key={kk} className="activity-desc">
                                                          <span>{title}</span>
                                                          <span>{value}</span>
                                                        </div>
                                                      ))}
                                                    </>
                                                    <div>
                                                      <Tags.AnnTimeSpent
                                                        val={activity.relOffset}
                                                        maxVal={maxTimeInGroup}
                                                        hueRotation={data.hueRotation}
                                                      >
                                                        {`${activity.relOffset} second${activity.relOffset > 1 ? 's' : ''}`}
                                                      </Tags.AnnTimeSpent>
                                                    </div>
                                                  </div>
                                                </div>
                                              </Tooltip>
                                            </div>
                                          </div>
                                        )
                                      };
                                    })}
                                  />
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="side-panel-info">
                          <table>
                            <thead>
                              <tr>
                                <td
                                  colSpan={3}
                                  style={{
                                    borderBottom: '1px solid lightgray'
                                  }}
                                >Lead form fields
                                </td>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(selectedLead.info || {}).map(([key, value]: [string, any], i) => {
                                if (key.startsWith('pk_')) return undefined;
                                return (
                                  <tr key={i}>
                                    <td>
                                      {key === 'email' && <span>📧</span>}
                                      {key === 'phone' && <span>📞</span>}
                                    </td>
                                    <td>
                                      {readableFormKey(key)}
                                    </td>
                                    <td>{value}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <table>
                            <thead>
                              <tr>
                                <td
                                  colSpan={3}
                                  style={{
                                    borderBottom: '1px solid lightgray'
                                  }}
                                >Lead metrics
                                </td>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>🔂</td>
                                <td>Sessions</td>
                                <td>{selectedLead.sessionCreated}</td>
                              </tr>
                              <tr>
                                <td>🕑</td>
                                <td>Time spent</td>
                                <td>{readableTimeUnit(selectedLead.timeSpentSec).join(' ')}</td>
                              </tr>
                              <tr>
                                <td>🏁</td>
                                <td>Completion</td>
                                <td>{selectedLead.completionPercentage}%</td>
                              </tr>
                              <tr>
                                <td>🚀</td>
                                <td>Clicked CTA?</td>
                                <td>{selectedLead.ctaClickRate ? 'Yes' : 'No'}</td>
                              </tr>
                            </tbody>
                          </table>
                          {selectedLead.richInfo && (
                            <table>
                              <thead>
                                <tr>
                                  <td
                                    colSpan={3}
                                    style={{
                                      borderBottom: '1px solid lightgray'
                                    }}
                                  >Device & location
                                  </td>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>🌍</td>
                                  <td>Country</td>
                                  <td>{selectedLead.richInfo.countryName} ({selectedLead.richInfo.country})</td>
                                </tr>
                                <tr>
                                  <td>🗺️</td>
                                  <td>Region</td>
                                  <td>{selectedLead.richInfo.countryRegionName} ({selectedLead.richInfo.countryRegion})</td>
                                </tr>
                                <tr>
                                  <td>🌆</td>
                                  <td>City</td>
                                  <td>{decodeURIComponent(selectedLead.richInfo.city)}</td>
                                </tr>
                                {getDeviceBlock(selectedLead.richInfo)}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </>
                    ) : (
                      selectedLead === null && (
                        <p>
                          Lead info not found.
                          <br />
                          This should not happen unless you change the url manually.
                          <br />
                          Please contact support, if you think this is an issue.
                        </p>
                      )
                    )
                  )}

                </div>
              ) : (
                <div>
                  Select a lead from the left to see activity history
                </div>
              )}
            </div>
          </Tags.LeadActivity>
        </Card>
      </Tags.Row>
    </>

  );
}
