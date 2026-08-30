import React, { useEffect, useState } from 'react';
import { CaretLeftOutlined, PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import * as Tags from './styled';
import { ScreenSizeData } from '../../types';

interface Props {
  screenSizeData: ScreenSizeData;
  replayScreen: ()=> void;
  isWatermarkPresent: boolean;
  playPauseVideo: ()=> void;
  isVoiceoverPlaying: boolean;
}

const Gutter = 16;
export default function VoiceoverControl(props: Props): JSX.Element {
  const [top, setTop] = useState<number>(props.screenSizeData.iframePos.top);
  const [left, setLeft] = useState<number>(props.screenSizeData.iframePos.left);

  useEffect(() => {
    const xAdjustmentForWatermark = props.isWatermarkPresent ? 48 : 0;
    setLeft((props.screenSizeData.iframePos.left + props.screenSizeData.iframePos.width) - 72 - xAdjustmentForWatermark - Gutter);
    setTop((props.screenSizeData.iframePos.top + props.screenSizeData.iframePos.height) - 36 - Gutter);
  }, [props.screenSizeData]);

  return (
    <Tags.VoiceControlCon
      style={{
        top: `${top}px`,
        left: `${left}px`
      }}
    >
      <Tooltip title="Replay this step" placement="topRight">
        <CaretLeftOutlined
          onClick={props.replayScreen}
          className="voice-control-icon"
          style={{
            opacity: 0.65
          }}
        />
      </Tooltip>
      {props.isVoiceoverPlaying
        ? (
          <Tooltip title="Click here or anywhere on the screen to pause this demo" placement="topRight">
            <PauseCircleFilled
              onClick={props.playPauseVideo}
              className="voice-control-icon"
            />
          </Tooltip>
        )
        : (
          <Tooltip title="Click here or anywhere on the screen to play this demo">
            <PlayCircleFilled
              onClick={props.playPauseVideo}
              className="voice-control-icon"
            />
          </Tooltip>
        )}

    </Tags.VoiceControlCon>
  );
}
