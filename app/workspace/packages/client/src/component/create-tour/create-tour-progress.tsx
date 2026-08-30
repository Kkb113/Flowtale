import { Progress } from 'antd';
import React from 'react';
import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  totalSteps: number | null;
  completedSteps: number;
  title: string;
  progressInfo: string;
  showCircularLoader?: boolean;
}

function CreateTourProgress(props: Props): JSX.Element {
  return (
    <Tags.ProgressCon>
      {!!props.totalSteps && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', margin: '0 10px' }}>
            <span className="typ-reg">{props.title}</span>
            {props.progressInfo
              && <span className="typ-sm" style={{ opacity: 0.5 }}>[{props.completedSteps}/{props.totalSteps}] {props.progressInfo}</span>}
          </div>
          {
            props.showCircularLoader
              ? <div style={{ textAlign: 'start' }}><LoadingOutlined /> </div>
              : (
                <>
                  <Progress
                    strokeWidth={8}
                    strokeColor="#8da1af"
                    trailColor="#c9d4db"
                    showInfo={false}
                    strokeLinecap="round"
                    percent={(props.completedSteps * 100) / props.totalSteps}
                    style={{ marginBottom: 0 }}
                  />
                  {props.completedSteps === props.totalSteps
                    && <CheckCircleFilled style={{ color: '#8da1af', fontSize: 10, marginLeft: '5px' }} />}
                </>)
          }
        </>
      )}
    </Tags.ProgressCon>
  );
}

export default CreateTourProgress;
