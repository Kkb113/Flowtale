import React from 'react';
import { CheckCircleFilled, Loading3QuartersOutlined, LockOutlined, SendOutlined } from '@ant-design/icons';
import Cta from '../demo-hub-editor/cta';
import { useDemoHubQlfcnCtx } from './ctx';
import { SidepanelLinks, StepInfo, } from './type';

interface Props {
  sidepanelLinks: SidepanelLinks[];
}

function Sidepanel(props: Props): JSX.Element {
  const { navigateToStep, qualificationConfig, config, stepInfoMap } = useDemoHubQlfcnCtx();

  if (!qualificationConfig) {
    return <></>;
  }

  return (
    <div className="sidepanel-con">
      {
        props.sidepanelLinks.map(step => (
          <div
            className="sidepanel-card"
            key={step.id}
            onClick={() => {
              const status = stepInfoMap[`${step.slug}`];
              if (status.disabled) return;
              navigateToStep(step.slug);
            }}
          >
            <div className="card-title typ-reg">
              <StepStatus stepInfoMap={stepInfoMap} slug={step.slug} />
              <div>{step.title}</div>
            </div>
            <div>
              {
                step.substeps.map(demo => {
                  const stepStatus = stepInfoMap[`${step.slug}**${demo.slug}`];
                  const isDone = stepStatus && stepStatus.done;

                  return (
                    <div
                      key={demo.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const status = stepInfoMap[`${step.slug}**${demo.slug}`];
                        if (status.disabled) return;

                        navigateToStep(step.slug, demo.slug);
                      }}
                      className={`substep ${isDone ? 'completed' : ''}`}
                    >
                      <div className="sidepanel-card-title">
                        <StepStatus stepInfoMap={stepInfoMap} slug={`${step.slug}**${demo.slug}`} />
                        <div>{demo.title}</div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        ))
      }
    </div>
  );
}

export default Sidepanel;

function StepStatus(props: {stepInfoMap: Record<string, StepInfo>, slug: string}): JSX.Element {
  const status = props.stepInfoMap[props.slug];

  if (!status) return <></>;

  if (status.disabled) {
    return (
      <LockOutlined style={{ opacity: 0.6 }} />
    );
  }

  if (status.done) {
    return (
      <CheckCircleFilled style={{ opacity: 0.6 }} />
    );
  }

  if (status.skipped) {
    return (
      <Loading3QuartersOutlined style={{ opacity: 0.6 }} />
    );
  }

  return (
    <SendOutlined style={{ opacity: 0.6 }} />
  );
}
