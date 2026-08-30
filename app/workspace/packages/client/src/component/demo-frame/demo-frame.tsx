import React, { useEffect, useState } from 'react';
import { AppstoreFilled, CaretDownFilled, CompassFilled, ContainerFilled, ReloadOutlined } from '@ant-design/icons';
import { FrameSettings } from '@fable/common/dist/api-contract';
import { Tooltip } from 'antd';
import { JourneyData } from '@fable/common/dist/types';
import { ScreenSizeData } from '../../types';
import { P_RespTour } from '../../entity-processor';
import * as Tags from './styled';

interface Props {
  mode: FrameSettings;
  showModule: boolean;
  isJourneyMenuOpen: boolean;
  setIsJourneyMenuOpen: () => void;
  JourneyMenuComponent: JSX.Element;
  tour: P_RespTour;
  replayHandler: () => void;
  makeEmbedFrameFullScreen: () => void;
  screenSizeData: ScreenSizeData;
  modules: JourneyData | null;
  currentModuleMain: string;
}
export default function DemoFrame(props : Props) : JSX.Element {
  const [title, setTitle] = useState(props.tour.displayName);

  useEffect(() => {
    if (!(props.modules && props.modules.flows.length)) return;
    if (!props.currentModuleMain) return;

    for (let i = 0; i < props.modules.flows.length; i++) {
      if (props.modules.flows[i].main === props.currentModuleMain) {
        setTitle(`${props.modules.title} / ${props.modules.flows[i].header1}`);
      }
    }
  }, [props.modules, props.currentModuleMain]);

  return (
    <Tags.Frame
      mode={props.mode}
      iframePos={props.screenSizeData.iframePos}
      scaleFactor={Math.min(props.screenSizeData.scaleFactor * 1.25, 1)}
      zIndex={props.isJourneyMenuOpen ? 10 : 8}
    >
      <div className="ctrl-btns">
        <div className="ctrl-btn" style={{ background: '#f87171' }} />
        <div className="ctrl-btn" style={{ background: '#facc15' }} />
        <div className="ctrl-btn" style={{ background: '#22c55e' }} />
      </div>
      <div className="central-options">
        <div className={`anim-con ${props.isJourneyMenuOpen ? 'show' : 'hide'}`}>
          {props.showModule && props.isJourneyMenuOpen && props.JourneyMenuComponent}
        </div>
        <div className="central-title">
          <button
            className="module-btn central-btn"
            onClick={() => {
              props.setIsJourneyMenuOpen();
            }}
            type="button"
          >
            {props.showModule && (<><ContainerFilled />&nbsp;&nbsp;</>)}
            <span>{title}</span>
            {props.showModule && (<>&nbsp;<CaretDownFilled style={{ opacity: 0.5, fontSize: '10px' }} /></>)}
          </button>
          <Tooltip trigger={['hover']} placement="bottom" title="Reload">
            <button
              className="central-btn"
              onClick={props.replayHandler}
              type="button"
            >
              <ReloadOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="right-btns">
        <Tooltip trigger={['hover']} placement="bottom" title="Fullscreen">
          <button
            onClick={props.makeEmbedFrameFullScreen}
            type="button"
          >
            <CompassFilled />
          </button>
        </Tooltip>

        {props.tour.site.ctaText._val && props.tour.site.ctaLink._val && (
          <Tooltip trigger={['hover']} placement="bottomLeft" title={props.tour.site.ctaText._val}>
            <a
              href={props.tour.site.ctaLink._val}
              target="_blank"
              rel="noreferrer"
            >
              <button
                type="button"
              >
                <AppstoreFilled />
              </button>
            </a>
          </Tooltip>
        )}
      </div>
    </Tags.Frame>
  );
}
