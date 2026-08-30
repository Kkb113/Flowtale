/* eslint-disable react/jsx-no-target-blank */
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PlayCircleFilled } from '@ant-design/icons';
import * as Tags from './styled';
import { ScreenSizeData } from '../../types';
import { getBorderRadiusOfFrame, getBorderWidthOfFrame } from '../../component/screen-editor/preview-styled';
import ViewDemoAnim from '../../assets/view-demo.json';
import FableQuillLogo from '../../assets/fable-logo-2.svg';

interface Props {
  screenSizeData: ScreenSizeData;
  onViewDemoClick: ()=>void;
  showWatermark: boolean;
}

const LottiePlayer = lazy(() => import('@lottiefiles/react-lottie-player').then(({ Player }) => ({
  default: Player
})));

function ViewDemoOverlay(props: Props): JSX.Element {
  const [width, setWidth] = useState<null | number>(null);
  const [height, setHeight] = useState<null | number>(null);
  const [top, setTop] = useState<number | undefined>();
  const [left, setLeft] = useState<number | undefined>();
  const [borderRadius, setBorderRadius] = useState<string | undefined>();

  useEffect(() => {
    if (props.screenSizeData) {
      const borderWidth = getBorderWidthOfFrame(props.screenSizeData.iframePos.heightOffset);
      setWidth(props.screenSizeData.iframePos.width - (2 * borderWidth));
      setHeight(props.screenSizeData.iframePos.height - (2 * borderWidth));
      setLeft(props.screenSizeData.iframePos.left + borderWidth);
      setTop(props.screenSizeData.iframePos.top + borderWidth);
      setBorderRadius(getBorderRadiusOfFrame(props.screenSizeData.iframePos.heightOffset));
    }
  }, [props.screenSizeData]);

  return (
    <Tags.ViewDemoOverlayCon
      iframePos={props.screenSizeData.iframePos}
      width={width}
      height={height}
      top={top}
      left={left}
      borderRadius={borderRadius}
    >
      <div className="con">
        <Suspense fallback={
          <PlayCircleFilled
            style={{
              fontSize: '2rem',
              color: '#fafafa'
            }}
          />
      }
        >
          <div onClick={props.onViewDemoClick}>
            <LottiePlayer
              style={{ height: '100px', cursor: 'pointer' }}
              src={ViewDemoAnim}
              autoplay
              loop
            />
          </div>
        </Suspense>
      </div>
      {props.showWatermark && (
        <div className="wm">
          <a href="https://www.sharefable.com?ref=exdm" target="_blank">
            Create interactive demos in 5 minutes with
            <img src={FableQuillLogo} alt="Fable logo" />
            Fable
          </a>
        </div>
      )}
    </Tags.ViewDemoOverlayCon>
  );
}

export default ViewDemoOverlay;
