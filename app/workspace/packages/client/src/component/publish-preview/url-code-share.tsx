import React, { useEffect } from 'react';
import { Tooltip } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import CopyHandler from './copy-handler';
import * as Tags from './styled';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface IProps {
  url: string;
  showOpenLinkButton?: boolean;
  openEventFrom?: 'cta_share' | 'internal_share';
}

export default function (props: IProps): JSX.Element {
  const scrollLeft = (): void => {
    const targetNode = document.getElementsByClassName('url-content');
    const element = targetNode[0];
    if (!element) return;

    element.scrollLeft = element.scrollWidth;
  };

  useEffect(() => {
    scrollLeft();
  }, []);

  return (
    <Tags.URLCon>
      <div className="url-content" style={{ marginRight: props.showOpenLinkButton ? '60px' : '30px' }}>
        <code>
          <span className="typ-ip">
            {props.url}
          </span>
        </code>
      </div>
      {props.showOpenLinkButton && (
      <Tooltip title="Open url">
        <div
          className="open-link-con"
          style={{ position: 'absolute', right: '40px' }}
          onClick={() => {
            if (props.openEventFrom) {
              traceEvent(AMPLITUDE_EVENTS.OPEN_CTA_LINK, { link: props.url }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
            }
            window.open(props.url, '_blank');
          }}
        >
          <ArrowRightOutlined
            style={{ transform: 'rotate(-45deg)' }}
          />
        </div>
      </Tooltip>
      )}
      <CopyHandler
        copyUrl={props.url}
        onCopyHandler={() => {
          if (props.openEventFrom) {
            traceEvent(
              AMPLITUDE_EVENTS.EMBED_TOUR,
              { embed_type: props.openEventFrom === 'cta_share' ? 'url' : 'internal_url' },
              [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
            );
          }
        }}
      />
    </Tags.URLCon>
  );
}
