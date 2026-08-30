import React, { useState } from 'react';
import { BulbOutlined } from '@ant-design/icons';
import { Tooltip, Progress } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as Tags from './styled';
import { LocalStoreUserGuideProps } from '../../user-guides/utils';
import { GuideStatus } from './user-guide-details';
import CircleGreenFilledIcon from '../../assets/icons/circle-check-green.svg';
import * as GTags from '../../common-styled';
import { useUserNickname } from '../../hooks/useUserNickname';
import Button from '../button';

interface Props {
  type: GuideStatus;
  guide: LocalStoreUserGuideProps;
  resetStatus: (guideId: string, type: GuideStatus) => void;
  tourAvailable: boolean;
  bgColor: string;
  firstTourRid: string;
  inDropdown?: boolean
}

export default function UserGuideCard(props: Props): JSX.Element {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const nickname = useUserNickname();

  const closeModal = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(false);
  };

  const navigateToUserGuide = (serialId: number): void => {
    if (!props.tourAvailable) return;
    switch (serialId) {
      case 1:
        navigate(`/demo/${props.firstTourRid}`);
        break;
      case 2:
        navigate(`/demo/${props.firstTourRid}`);
        break;
      case 3:
        navigate(`/demo/${props.firstTourRid}`);
        break;
      case 4:
        navigate(`/demo/${props.firstTourRid}`);
        break;
      case 5:
        navigate('/');
        break;
      default:
        break;
    }
  };

  return (
    <Tags.UserGuideCard
      inDropdown={props.inDropdown}
      bgColor={props.tourAvailable ? props.bgColor : '#f5f5f5'}
      onClick={() => {
        if (props.tourAvailable) {
          props.resetStatus && props.resetStatus(props.guide.groupId, props.type);
          navigateToUserGuide(props.guide.serialId);
        } else {
          setShowModal(true);
        }
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '2rem',
            aspectRatio: '1/1',
            backgroundColor: 'white',
            borderRadius: '2rem',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1rem',
            border: '1px solid #ddd'
          }}
        >
          <BulbOutlined />
        </div>
        <Tags.UserGuideTextcon>
          <div className="typ-reg">
            {props.guide.name}
          </div>
          <div className="typ-sm">
            {props.guide.desc.toursCreated}
          </div>
        </Tags.UserGuideTextcon>
      </div>
      <Tooltip
        title={(props.type === 'completed' || props.type === 'skipped') ? 'You have watched this once' : 'Not watched completely'}
        arrow={false}
        placement={(props.type === 'completed' || props.type === 'skipped') ? 'bottomLeft' : 'bottomRight'}
      >
        {(props.type === 'completed' || props.type === 'skipped') ? (
          <img
            src={CircleGreenFilledIcon}
            alt="Green checked outline"
            style={{ aspectRatio: '1/1', width: 20 }}
          />
        ) : (
          <Progress
            type="circle"
            percent={(props.guide.stepsTaken / props.guide.totalSteps) * 100}
            size={20}
            strokeWidth={14}
            strokeColor="#2bd46f"
            trailColor="#D9D9D9"
            showInfo={false}
            strokeLinecap="square"
            style={{
              transform: 'scaleX(-1)',
            }}
          />
        )}
      </Tooltip>
      <GTags.BorderedModal
        open={showModal}
        centered
        onCancel={closeModal}
        title={`Hey${nickname}, we know you are super excited to explore Fable & how it all works. 😉`}
        footer={[
          <Button
            key={1}
            style={{ marginLeft: 'auto', padding: '8px 24px' }}
            onClick={closeModal}
          >
            Ok
          </Button>
        ]}
      >
        <div style={{ lineHeight: '36px', fontSize: '1rem' }}>
          Recording a new interactive demo has 3 simple steps:
          <br />
          Step 1: Open your product's webpage in Chrome
          <br />
          Step 2: Click on <strong>Start Recording</strong> in Fable extension
          <br />
          Step 3: Click on <strong>Stop Recording</strong> once you are done
          <br />
          Let's get cracking now, shall we?
        </div>

      </GTags.BorderedModal>
    </Tags.UserGuideCard>
  );
}
