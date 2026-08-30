import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightOutlined, UndoOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { getDimensionsBasedOnDisplaySize, isEventValid, objectToSearchParams } from '../../utils';
import Button from '../button';

interface Params {
  key: string,
  value: string
}

interface Props {
  demoRid : string;
  onClose : () => void;
  maskBg: string;
  demoName : string;
  embedSrc : string;
  goToNext : () => void;
  showNextBtn : boolean
}

function EmbeddedDemoIframe(props : Props): JSX.Element {
  const [demoIframeKey, setDemoIframeKey] = useState(0);
  const [isDemoCompleted, setIsDemoCompleted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation', demoRid: string }>): void => {
    if (isEventValid(e) && e.data.type === 'lastAnnotation' && e.data.demoRid === props.demoRid) {
      setIsDemoCompleted(true);
    } else {
      setIsDemoCompleted(false);
    }
  };

  useEffect(() => {
    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, [props.demoRid]);

  return (
    <div>
      <Tags.DemoModal
        className="demo-display-modal-con"
        title={
          <span
            className="typ-h2"
            style={{
              fontWeight: 600
            }}
          >
            {props.demoName}
          </span>
          }
        open={Boolean(props.demoRid)}
        destroyOnClose
        footer={null}
        onCancel={() => {
          props.onClose();
        }}
        width="80vw"
        centered
        maskStyle={{
          background: props.maskBg,
          backdropFilter: 'blur(3px)'
        }}
      >
        <div
          style={{
            height: '80vh'
          }}
        >
          <Tags.PreviewFrameWrapper
            showOverlay={isDemoCompleted}
          >
            {
              isDemoCompleted && (
                <div
                  className="replay-overlay"
                >
                  {props.showNextBtn && (
                    <Button
                      intent="secondary"
                      icon={<ArrowRightOutlined />}
                      iconPlacement="left"
                      style={{ background: '#fff' }}
                      onClick={() => {
                        props.goToNext();
                        setIsDemoCompleted(false);
                      }}
                    >
                      Next Demo
                    </Button>
                  )}
                  <Button
                    intent="secondary"
                    icon={<UndoOutlined />}
                    iconPlacement="left"
                    color="white"
                    borderColor="white"
                    onClick={
                      () => {
                        setDemoIframeKey(Math.random());
                        setIsDemoCompleted(false);
                      }
                    }
                  >
                    Replay
                  </Button>
                </div>
              )
            }
            <iframe
              ref={iframeRef}
              width="100%"
              height="100%"
              src={props.embedSrc}
              allowFullScreen
              title={props.demoRid}
              style={{ border: 'none' }}
              key={demoIframeKey}

            />
          </Tags.PreviewFrameWrapper>
        </div>
      </Tags.DemoModal>
    </div>
  );
}

export default EmbeddedDemoIframe;
