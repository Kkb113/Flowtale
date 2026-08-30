import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { SiteData } from '../../types';
import FableLogo from '../../assets/fable-logo-2.svg';
import { getColorContrast } from '../../utils';

interface Props {
  site: SiteData;
  captureConversion: () => void;
  showFullScreenOption: boolean;
  makeEmbedFrameFullScreen: () => void;
}

export default function Header(props: Props): JSX.Element {
  const [color, setColor] = useState('#fff');

  useEffect(() => {
    const bgColor = props.site.headerBg === 'auto' ? props.site.bg1 : props.site.headerBg;
    const textColor = getColorContrast(bgColor) === 'dark' ? '#fff' : '#000';
    setColor(textColor);
  }, [props.site]);
  return (
    <Tags.HeaderCon
      color={color}
      style={{
        backgroundColor: props.site.headerBg === 'auto' ? props.site.bg1 : props.site.headerBg,
        filter: `hue-rotate(${props.site.headerBg === 'auto' ? 45 : 0}deg)`,
        boxShadow: '0px 0px 2px -1px #424242',
        height: '60px'
      }}
    >
      <div
        className="lg-t"
        style={{
          filter: `hue-rotate(${props.site.headerBg === 'auto' ? -45 : 0}deg)`,
        }}
      >
        <a
          href={props.site.navLink._val || 'https://sharefable.com'}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          target="_blank"
          rel="noreferrer"
        >
          <img src={props.site.logo._val || FableLogo} alt="" height={35} />
        </a>
        <div className="typ-h2" style={{ fontWeight: 600, color }}>
          {props.site.title}
        </div>
      </div>
      {props.site.ctaText && (
        <div>
          {props.showFullScreenOption && <FullscreenOutlined
            onClick={props.makeEmbedFrameFullScreen}
            style={{
              margin: '0 1rem'
            }}
          />}
          {props.site.ctaLink._val && props.site.ctaText._val && (
            <a
              href={props.site.ctaLink._val}
              onClick={props.captureConversion}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="small"
                className="sec-btn"
                type="default"
                style={{
                  padding: '0 0.8rem',
                  height: '30px',
                  borderRadius: '16px',
                  backgroundColor: 'transparent',
                }}
              >
                {props.site.ctaText._val}
              </Button>
            </a>)}
        </div>
      )}
    </Tags.HeaderCon>
  );
}
