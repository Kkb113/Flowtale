import React, { useState } from 'react';
import Tour, { NextBtnPropChildren, PrevBtnPropChildren } from '../component/user-guide-tour';
import {
  closeUserGuide,
  completeUserGuide,
  getDOMElement,
  skipUserGuide,
  updateStepsTaken,
  UserGuideHotspotManager
} from './utils';
import { Guide, GuideInfo, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';
import { useUserNickname } from '../hooks/useUserNickname';

export const guide: Guide = {
  id: 'tour-card-guide',
  name: 'Managing your interactive demos',
  desc: {
    toursCreated: 'Tips on how to manage your entire library of interactive demos',
    toursNotCreated: 'Create a demo to see this guide'
  },
  serialId: 5,
  steps: [
    {
      title: 'Preview of an interactive demo',
      description: 'You can check out the preview of the interactive demo that you have created by clicking on the card. This essentially shows you the final output that your buyers will experience.',
      target: () => getDOMElement(guide, () => document.getElementById('TG-1'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 1);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
    },
    {
      title: 'Analytics of an interactive demo',
      description: 'You can dig into the analytics of the demo you have created by clicking on the analytics icon. You can find all the details of how an interactive demo has performed here.',
      target: () => getDOMElement(guide, () => document.getElementById('TG-2'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 2);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
    },
    {
      title: 'Additional actions available here',
      description: 'You can rename, duplicate, or delete a demo by using the options available under this icon. These options will help you manage your library of interactive demos the way you want.',
      target: () => getDOMElement(guide, () => document.getElementById('TG-3'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 3);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      hotspot: false,
      width: '20rem'
    },
  ]
};

function TourCardGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);
  const nickname = useUserNickname();
  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      <IntroCard
        title={
          <>
            Hey{nickname} 👋🏻 <br />
            In this guide, we’ll see how you can manage all your interactive demos in the library
          </>
        }
        description="All your interactive demos will be displayed under the ‘Interactive demos’ tab. You can create as many interactive demos as you want and find them all here."
        acceptButtonProps={{
          children: 'Let\'s go',
          onClick() {
            setStartTour(true);
            hotspotManager.updateHotspot(0);
          },
        }}
        rejectButtonProps={{
          children: 'I’ll figure this out on my own',
          onClick() {
            skipUserGuide(guide);
            props.goToNextUserGuide();
          },
        }}
        show={props.isVisible && !startTour}
        width="25rem"
      />

      <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          completeUserGuide(guide.id);
          setStartTour(false);
          props.goToNextUserGuide();
        }}
        onFinish={() => {
          hotspotManager.cleanupHotspot();
          props.goToNextUserGuide();
        }}
        indicatorsRender={(current, total) => `${current + 1}/${total}`}
        arrow={false}
        onChange={(current) => hotspotManager.updateHotspot(current)}
      />
    </>
  );
}

const guideInfo: GuideInfo = {
  stepsTaken: 0,
  totalSteps: guide.steps.length,
  isCompleted: false,
  // TODO skipped temporarily
  // isSkipped: false,
  isSkipped: true,
  name: guide.name,
  id: guide.id,
  groupId: guide.name,
  desc: guide.desc,
  partId: 0,
  serialId: guide.serialId
};

export default { guideInfo, component: TourCardGuide };
