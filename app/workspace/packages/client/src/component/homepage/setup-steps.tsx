import { CheckOutlined } from '@ant-design/icons';
import React from 'react';

interface Props {
  isStepComplete: boolean;
  title: string;
  description: JSX.Element;
  footer?: JSX.Element;
  index: number;
}

export default function SetupStep(props : Props):JSX.Element {
  return (
    <div className={props.isStepComplete ? 'setup-step complete' : 'setup-step'}>
      <div className="left-items">
        <div className={props.isStepComplete ? 'setup-index setup-index-complete' : 'setup-index'}>
          {props.index}
        </div>
        {props.isStepComplete && <CheckOutlined style={{ color: '#7567ff', fontWeight: 'bold' }} />}
      </div>
      <div className="step-root">
        <div className="step-body">
          <div className="typ-h2 setup-title">{props.title}</div>
          <div className="typ-reg">
            {props.description}
          </div>
        </div>
        {props.footer && (
          <div className="step-footer">
            {props.footer}
          </div>
        )}
      </div>
    </div>
  );
}
