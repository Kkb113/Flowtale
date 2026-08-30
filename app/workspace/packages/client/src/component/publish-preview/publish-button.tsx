import React, { useEffect, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { ShareAltOutlined } from '@ant-design/icons';
import Button from '../button';
import { P_RespTour } from '../../entity-processor';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespDemoHub } from '../../types';

interface Props {
  tour: P_RespTour | null;
  demoHub?: P_RespDemoHub | null;
  publishTour?: (data: P_RespTour) => Promise<boolean>;
  publishDemoHub?: (data: P_RespDemoHub) => Promise<boolean>;
  openShareModal: () => void;
  setIsPublishing: (isPublishing: boolean) => void;
  setIsPublishFailed: React.Dispatch<React.SetStateAction<boolean>>;
  size?: 'medium' | 'large';
  minWidth?: string;
  isPublishing?: boolean;
  disabled?: boolean;
  showWhiteBg?: boolean;
  title?: string;
  clickedFrom: 'demos' | 'analytics' | 'preview' | 'editor' | 'header' |
  'demos_share_modal' | 'analytics_share_modal' | 'preview_share_modal' | 'editor_share_modal'
}

export default function PublishButton(props: Props): JSX.Element {
  const [buttonTitle, setButtonTitle] = useState(props.title || 'Publish');

  const handleClick = async (): Promise<void> => {
    props.setIsPublishing(true);
    props.setIsPublishFailed(false);
    props.openShareModal();

    if (props.tour) {
      const res = await props.publishTour!(props.tour);
      props.setIsPublishing(false);

      traceEvent(AMPLITUDE_EVENTS.DEMO_PUBLISHED, {
        publish_clicked_from: props.clickedFrom
      }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);

      if (!res) {
        props.setIsPublishFailed(true);
      }
    }
    if (props.demoHub) {
      const res = await props.publishDemoHub!(props.demoHub);
      props.setIsPublishing(false);

      if (!res) {
        props.setIsPublishFailed(true);
      }
    }
  };

  useEffect(() => {
    if (props.isPublishing) {
      setButtonTitle('Publishing...');
    } else {
      setButtonTitle(props.title || 'Publish');
    }
  }, [props.isPublishing]);

  return (
    <Button
      size={props.size || 'large'}
      disabled={props.disabled || !(props.tour || props.demoHub)}
      style={{ height: '30px', paddingLeft: '1.2rem', paddingRight: '1.2rem', minWidth: props.minWidth }}
      onMouseUp={handleClick}
      bgColor={props.showWhiteBg ? 'white' : undefined}
      color={props.showWhiteBg ? 'black' : undefined}
      intent={props.title === 'Force publish' ? 'secondary' : 'primary'}
    >
      {buttonTitle === 'Share' && <ShareAltOutlined />}{buttonTitle}
    </Button>
  );
}
