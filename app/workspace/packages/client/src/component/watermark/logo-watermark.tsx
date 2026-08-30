import React from 'react';
import * as Tags from './styled';
import FableQuillLogo from '../../assets/fable-logo-2.svg';

interface Props {
  watermarkRef: React.MutableRefObject<HTMLAnchorElement | null>;
  isHidden: boolean;
}

export default function LogoWatermark(props: Props): JSX.Element {
  return (
    <Tags.LogoWatermark
      style={{ display: props.isHidden ? 'none' : 'block' }}
      ref={props.watermarkRef}
      target="_blank"
      rel="noopener noreferrer"
      href="https://sharefable.com"
    >
      <img src={FableQuillLogo} alt="Fable logo" />
    </Tags.LogoWatermark>
  );
}
