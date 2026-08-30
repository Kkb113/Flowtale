import { Progress } from 'antd';
import React from 'react';
import CircleGreenFilledIcon from '../../assets/icons/circle-check-green.svg';

interface Props {
    completedModules: number;
    totalmodules: number;
    progressCircleSize: number;
}

export function ProgressCircle(props: Props): React.ReactElement {
  return (
    <div>
      {props.completedModules === props.totalmodules ? (
        <img
          src={CircleGreenFilledIcon}
          alt="Green checked outline"
          style={{ aspectRatio: '1/1', width: props.progressCircleSize }}
        />
      ) : (
        <Progress
          type="circle"
          percent={(props.completedModules / props.totalmodules) * 100}
          size={props.progressCircleSize}
          strokeWidth={14}
          format={() => `${props.completedModules}`}
          strokeColor="#2bd46f"
          trailColor="#D9D9D9"
          showInfo={false}
          strokeLinecap="square"
          style={{
            transform: 'scaleX(-1)',
          }}
        />
      )}
    </div>
  );
}
