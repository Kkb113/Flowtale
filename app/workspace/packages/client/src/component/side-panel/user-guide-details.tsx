import React, { useState } from 'react';
import { LinkOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import {
  resetSkippedOrCompletedStatus,
  LocalStoreUserGuideProps,
  getUserGuidesInArray
} from '../../user-guides/utils';
import { getTourGuideCardColor, getUserGuideType } from './utils';
import UserGuideCard from './user-guide-card';
import * as GTags from '../../common-styled';
import UserGuideProgress from './user-guide-progess';

interface Props {
  close: () => void;
  show: boolean;
  tourAvailable: boolean;
  firstTourRid: string;
  inDropdown?: boolean
}

export type GuideStatus = 'skipped' | 'completed' | 'remaining';

export default function UserGuideDetails(props: Props): JSX.Element {
  const [userGuides, setUserGuides] = useState<LocalStoreUserGuideProps[]>(getUserGuidesInArray());

  const resetCompletedOrSkippedStatus = (guideId: string, type: GuideStatus): void => {
    resetSkippedOrCompletedStatus(guideId);

    setUserGuides(prvGuide => {
      const newGuide = [...prvGuide];
      const currentGuide = newGuide.find(guide => guide.groupId === guideId) as LocalStoreUserGuideProps;
      currentGuide!.isCompleted = false;
      currentGuide!.isSkipped = false;
      currentGuide!.stepsTaken = 0;
      return newGuide;
    });
  };

  return props.show ? (
    <Tags.UserGuideDetailsCon
      inDropdown={props.inDropdown as boolean}
      style={{ display: props.show ? 'flex' : 'none' }}
    >
      <Tags.StyledCloseOutlined onClick={props.close} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          {userGuides.filter(Boolean).map((userGuide, idx) => (
            <UserGuideCard
              key={userGuide.id}
              type={getUserGuideType(userGuide)}
              guide={userGuide}
              tourAvailable={props.tourAvailable}
              bgColor={getTourGuideCardColor(idx)}
              resetStatus={resetCompletedOrSkippedStatus}
              firstTourRid={props.firstTourRid}
              inDropdown={props.inDropdown}
            />
          ))}
        </div>
      </div>
      <div>
        <GTags.HelpCenterLink
          className="typ-reg"
          href="https://help.sharefable.com"
          target="_blank"
          rel="noreferrer"
        >
          <LinkOutlined /> Get help from our help center
        </GTags.HelpCenterLink>
        <GTags.HelpCenterLink
          className="typ-reg"
          href="https://www.sharefable.com/contact-support"
          target="_blank"
          rel="noreferrer"
        >
          <LinkOutlined /> Contact us
        </GTags.HelpCenterLink>
      </div>
      {/* TODO: add these later */}
      {/* <IntroFableGuides /> */}

    </Tags.UserGuideDetailsCon>
  ) : (<></>);
}

function IntroFableGuides(): JSX.Element {
  return (

    <Tags.IntroFableGuidesCon>
      <Tags.FlexRow>
        <Tags.GridCard>
          card 1
        </Tags.GridCard>
        <Tags.GridCard>
          card 2
        </Tags.GridCard>
      </Tags.FlexRow>

      <Tags.FlexRow>
        <Tags.GridCard>
          card 3
        </Tags.GridCard>
        <Tags.GridCard>
          card 4
        </Tags.GridCard>
      </Tags.FlexRow>

      <Tags.GridCard>
        card 5
      </Tags.GridCard>
    </Tags.IntroFableGuidesCon>
  );
}
