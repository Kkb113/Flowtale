import React, { useEffect, useState } from 'react';
import * as Tags from './styled';
import FableLogoWithQuill from '../../assets/fableLogo.svg';
import { AnimEntryDir, Positions } from '../../types';

interface Props {
  borderRadius: number;
  isMediaAnn: boolean;
  bgColor: string;
  fontColor: string;
  top: number;
  left: number;
  height: number;
  width: number;
  arrowDir: AnimEntryDir;
  isCoverAnn: boolean;
  positioning: Positions;
}

const MARGIN_FACTOR = 6;

const calculateBorderRadius = (
  positioning: Positions,
  isCoverAnn: boolean,
  arrowDir: AnimEntryDir,
  borderRadius: number
): string => {
  if (arrowDir === 't') {
    if ((isCoverAnn && positioning === 'auto') || positioning === 'center') return `0px 0px ${borderRadius}px ${borderRadius}px`;
    return `${borderRadius}px ${borderRadius}px 0px 0px`;
  }

  return `0px 0px ${borderRadius}px ${borderRadius}px`;
};

const calculateTop = (
  arrowDir: AnimEntryDir,
  marginFactor: number,
  top: number,
  height: number,
  isCoverAnn: boolean,
  positioning: Positions
): number => {
  if (arrowDir === 't') {
    if ((isCoverAnn && positioning === 'auto') || positioning === 'center') return top + height + marginFactor;
    return top - marginFactor;
  }

  return top + height + marginFactor;
};

const calculateTransform = (
  isMediaAnn: boolean,
  arrowDir: AnimEntryDir,
  isCoverAnn: boolean,
  positioning: Positions
): string => {
  if (arrowDir === 't') {
    if ((isCoverAnn && positioning === 'auto') || positioning === 'center') {
      if (isMediaAnn) return 'translate(-100%, -28%)';
      return 'translate(-100%, -25%)';
    }
    return 'translate(-100%, -75%)';
  }

  if (isMediaAnn) return 'translate(-100%, -28%)';

  return 'translate(-100%, -25%)';
};

export default function AnnotationWatermark(props: Props): JSX.Element {
  const [top, setTop] = useState(props.top);
  const [transform, setTransform] = useState('');
  const [borderRadius, setBorderRadius] = useState(`${props.borderRadius}px`);

  useEffect(() => {
    setTop(calculateTop(
      props.arrowDir,
      MARGIN_FACTOR,
      props.top,
      props.height,
      props.isCoverAnn,
      props.positioning
    ));

    setTransform(calculateTransform(
      props.isMediaAnn,
      props.arrowDir,
      props.isCoverAnn,
      props.positioning
    ));

    setBorderRadius(calculateBorderRadius(
      props.positioning,
      props.isCoverAnn,
      props.arrowDir,
      props.borderRadius
    ));
  }, [props.arrowDir, props.top, props.height, props.isCoverAnn, props.positioning, props.borderRadius]);

  return (
    <Tags.WatermarkCon
      className="fable-watermark-con"
      style={{
        padding: '4px 0',
        position: 'absolute',
        width: props.width,
        backgroundColor: props.bgColor,
        color: props.fontColor,
        top,
        left: props.left + props.width,
        transform,
        borderRadius
      }}
      target="_blank"
      rel="noopener noreferrer"
      href="https://sharefable.com"
    >
      <WatermarkText />
    </Tags.WatermarkCon>
  );
}

export function WatermarkText(): JSX.Element {
  return (
    <>
      <span>
        Powered by
      </span>
      <div
        style={{
          display: 'flex',
          placeItems: 'center',
          background: '#170545',
          margin: '0.25rem 0',
          borderRadius: '4px',
          marginRight: '16px',
          padding: '2px'
        }}
      >
        <img
          src={FableLogoWithQuill}
          style={{
            maxHeight: '18px'
          }}
          alt=""
          height={18}
        />
      </div>
    </>
  );
}
