import React, { useEffect, useState } from 'react';
import { ITourLoaderData } from '@fable/common/dist/types';
import { createPortal } from 'react-dom';
import { FrameSettings, TourSettings } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import Loader from './loader';
import * as Tags from './styled';
import { MAC_FRAME_HEIGHT } from '../../utils';
import { ScreenSizeData } from '../../types';
import { getBorderRadiusOfFrame, getBorderWidthOfFrame } from '../screen-editor/preview-styled';

interface Props {
  data: ITourLoaderData,
  vpd?: TourSettings;
  isResponsive: boolean;
  screenSizeData: ScreenSizeData | undefined;
}

function FullScreenLoader(props: Props): JSX.Element {
  const [width, setWidth] = useState<null | number>(null);
  const [height, setHeight] = useState<null | number>(null);
  const [top, setTop] = useState<string | undefined>();
  const [left, setLeft] = useState<string | undefined>();
  const [applyTransform, setApplyTransform] = useState(true);
  const [borderRadius, setBorderRadius] = useState<string | undefined>();

  useEffect(() => {
    if (!props.isResponsive && props.vpd) {
      try {
        const loaderCon = document.getElementById('fable-loader-con');
        const parent = loaderCon!.parentElement;
        const origFrameViewPort = parent!.getBoundingClientRect();

        const scaleX = origFrameViewPort.width / props.vpd.vpdWidth;
        const scaleY = origFrameViewPort.height / props.vpd.vpdHeight;
        const scale = Math.min(scaleX, scaleY);

        setWidth(scale * props.vpd.vpdWidth);
        setHeight(scale * props.vpd.vpdHeight);
      } catch (err) {
        raiseDeferredError(err as Error);
      }
    }
  }, [props.vpd, props.isResponsive]);

  useEffect(() => {
    if (props.screenSizeData) {
      const borderWidth = getBorderWidthOfFrame(props.screenSizeData.iframePos.heightOffset);
      setWidth(props.screenSizeData.iframePos.width - (2 * borderWidth));
      setHeight(props.screenSizeData.iframePos.height - (2 * borderWidth));
      setLeft(`${props.screenSizeData.iframePos.left + borderWidth}px`);
      setTop(`${props.screenSizeData.iframePos.top + borderWidth}px`);
      setApplyTransform(false);
      setBorderRadius(getBorderRadiusOfFrame(props.screenSizeData.iframePos.heightOffset));
    }
  }, [props.screenSizeData]);

  return createPortal(
    <Tags.FullScreenCon
      bg="#F5F5F5"
      width={width}
      height={height}
      id="fable-loader-con"
      top={top}
      left={left}
      applyTransform={applyTransform}
      borderRadius={borderRadius}
    >
      <Loader data={props.data} />
    </Tags.FullScreenCon>,
    document.body
  );
}

export default FullScreenLoader;
