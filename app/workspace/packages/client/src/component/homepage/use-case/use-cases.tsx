import React from 'react';
import { CaretRightOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { USE_CASE_DUMMY_DATA } from '../../../utils';
import Bar from '../../../container/insight-dashboard/bar';
import Funnel from '../../../container/insight-dashboard/funnel';
import { OurCollapse } from '../../../common-styled';
import Line from '../../../container/insight-dashboard/line';

interface Props {
  singleRow?: boolean
}

const d = +new Date((new Date()).toISOString().split('T')[0]);

export default function UseCases(props : Props) : JSX.Element {
  return (
    <Tags.UseCaseGraphs singleRow={props.singleRow}>
      <div
        className="dropdown"
      >
        {!props.singleRow && (
          <div className="typ-h1">
            See what you can do & analyze with Fable
          </div>
        )}
        <div className="typ-reg" style={{ marginTop: '0.5rem' }}>
          Fable helps you create interactive demos for marketing, sales, and customer success teams. Here are some insights you will get with Fable:
        </div>
        <OurCollapse
          expandIconPosition="start"
          // eslint-disable-next-line react/no-unstable-nested-components
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          size="small"
          bordered={false}
          style={{
            borderRadius: '4px',
            marginTop: '10px'
          }}
          items={[
            {
              key: '1',
              label: (
                <div className="typ-h2 collapse-header">
                  <span>Increase conversion</span>
                  <span className="typ-sm">Increase your conversion upwards of <span className="pill-up">18%</span></span>
                </div>
              ),
              children: (
                <div className="collapse-details">
                  <div className="bar-graph-con tiny-graph">
                    <Bar
                      xs={USE_CASE_DUMMY_DATA.map(dd => dd.x)}
                      ys={USE_CASE_DUMMY_DATA.map(dd => dd.y)}
                      conceptX="On this day"
                      conceptY="Conversions"
                      height={props.singleRow ? 160 : 240}
                    />
                    <p className="typ-sm" style={{ textAlign: 'center' }}>* The chart is populated with sample data</p>
                  </div>
                  <div>
                    <p className="typ-reg">
                      The number of people who chose to perform an action by clicking on the CTA you added in the Fable.
                    </p>
                    <p className="typ-reg">
                      These CTAs can be to start a free trial, book a demo, download your app, etc.
                    </p>
                  </div>
                </div>

              )
            }, {
              key: '2',
              label: (
                <div className="typ-h2 collapse-header">
                  <span>Capture more leads</span>
                  <span className="typ-sm">Capture upto <span className="pill-up">3x</span> more leads</span>
                </div>
              ),
              children: (
                <div className="collapse-details">
                  <div className="bar-graph-con tiny-graph">
                    <Line
                      data={new Array(90).fill(1).map((_, i, a) => ({
                        date: new Date(d - (86400000 * i)),
                        value: ((Math.random() * a.length) | 0) + ((a.length - i) * 2),
                        value2: 1
                      })).reverse()}
                      concepts={{
                        value: {
                          singular: 'Lead captured',
                          plural: 'Leads captured'
                        }
                      }}
                      height={props.singleRow ? 160 : 200}
                    />
                    <p className="typ-sm" style={{ textAlign: 'center' }}>* The chart is populated with sample data</p>
                  </div>
                  <div>
                    <p className="typ-reg">
                      Your fables can have a lead form included.
                    </p>
                    <p className="typ-reg">
                      You can use this to capture the details of people viewing the demo. These can be the email, phone number, etc.
                    </p>
                  </div>
                </div>
              )
            }, {
              key: '3',
              label: (
                <div className="typ-h2 collapse-header">
                  <span>Drive more engagement</span>
                  <span className="typ-sm">Increase engagement atleast <span className="pill-up">8x</span></span>
                </div>
              ),
              children: (
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
                >
                  <div className="secondary-graph">
                    <div>
                      <div className="c-head">
                        Completion
                      </div>
                      <div className="typ-sm">
                        The number of people who viewed your fable from start to finish.
                      </div>
                    </div>
                    <div className="sbs-con">
                      <div>
                        <div className="c-metric">
                          {52}<span className="subtitle">&nbsp;%</span>
                        </div>
                        <div className="subsubtitle">Median</div>
                      </div>
                      <div style={{ minWidth: '200px' }}>
                        <Bar
                          xs={['0-25', '25-50', '50-75', '75-100']}
                          ys={[56, 23, 34, 56]}
                          conceptY="completed"
                          conceptX="percent"
                          noPad
                        />
                      </div>
                    </div>
                  </div>
                  <div className="secondary-graph">
                    <div>
                      <div className="c-head">
                        Session time
                      </div>
                      <div className="typ-sm">
                        Shows distribution of session time per session over the last few days.
                      </div>
                    </div>
                    <div className="sbs-con">
                      <div>
                        <div className="c-metric">
                          {58}<span className="subtitle">&nbsp;secs</span>
                        </div>
                        <div className="subsubtitle">Median</div>
                      </div>
                      <div style={{ minWidth: '200px' }}>
                        <Bar
                          xs={['0-158', '158-316', '316-474', '474-632']}
                          ys={[56, 34, 23, 56]}
                          conceptY="sessions spent"
                          conceptX="seconds"
                          noPad
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            }, {
              key: '4',
              label: (
                <div className="typ-h2 collapse-header">
                  <span>Activate low intent buyers</span>
                  <span className="typ-sm"><span className="pill-up">4x</span> conversion by measuring drop off points and taking action</span>
                </div>
              ),
              children: (
                <div className="secondary-graph">
                  <div className="help-text">
                    As your buyers progresses through the demo, they drop off at different steps.
                    This chart captures the dropoff rate at each step for past 6 months.
                  </div>
                  <div style={{ height: props.singleRow ? '160px' : '240px', overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ height: '100%', minWidth: '90%' }}>
                      <Funnel data={
                  [
                    { x: 'Step 1', y: 17 },
                    { x: 'Step 2', y: 12 },
                    { x: 'Step 3', y: 10 },
                    { x: 'Step 4', y: 6 }
                  ]
                }
                      />
                    </div>
                  </div>
                </div>
              )
            }]}
        />
      </div>
    </Tags.UseCaseGraphs>
  );
}
