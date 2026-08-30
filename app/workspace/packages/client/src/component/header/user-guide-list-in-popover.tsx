import React, { useState } from 'react';
import { P_RespTour } from '../../entity-processor';
import { LocalStoreUserGuideProps, getUserGuidesInArray, resetSkippedOrCompletedStatus } from '../../user-guides/utils';
import { GuideStatus } from '../side-panel/user-guide-details';
import { getUserGuideType, getTourGuideCardColor } from '../side-panel/utils';
import UserGuideCard from '../side-panel/user-guide-card';

interface UserGuideListInPopoverProps {
  userGuidesToShow: string[];
  tour: P_RespTour;
}

export default function UserGuideListInPopover(props: UserGuideListInPopoverProps): JSX.Element {
  const [userGuides, setUserGuides] = useState<LocalStoreUserGuideProps[]>(
    getUserGuidesInArray().filter(guide => Boolean(guide) && props.userGuidesToShow.includes(guide.groupId))
  );

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        {userGuides.filter(Boolean).map((userGuide, idx) => (
          <UserGuideCard
            key={userGuide.id}
            type={getUserGuideType(userGuide)}
            guide={userGuide}
            tourAvailable
            bgColor={getTourGuideCardColor(idx)}
            resetStatus={resetCompletedOrSkippedStatus}
            firstTourRid={props.tour.rid}
          />
        ))}
      </div>
    </div>
  );
}
