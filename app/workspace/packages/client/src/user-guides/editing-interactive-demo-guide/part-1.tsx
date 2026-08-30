import React, { useState } from 'react';
import Tour, { NextBtnPropChildren, PrevBtnPropChildren } from '../../component/user-guide-tour';
import {
  closeUserGuide,
  completeUserGuide,
  getDOMElement,
  skipUserGuide,
  updateStepsTaken,
  UserGuideHotspotManager
} from '../utils';
import { Guide, GuideInfo, GuideProps, UserGuideMsg } from '../types';
import IntroCard from '../../component/user-guide-tour/intro-card';
import { useUserNickname } from '../../hooks/useUserNickname';

export const guide: Guide = {
  id: 'editing-interactive-demo-guide-part-1',
  name: 'Editing the interactive demo that you have captured',
  desc: {
    toursCreated: 'After you have captured an interactive demo, you can customize everything from messaging to the order of the flow of the demo',
    toursNotCreated: 'Create a demo to see this guide'
  },
  serialId: 2,
  steps: [
    {
      title: 'The auto-stitched flow of your interactive demo',
      description: 'Fable auto-magically stitches together the entire flow of your interactive demo based on the actions carried out by you at the time of capture and presents it in the canvas as shown.',
      target: null,
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
      width: '25rem',
      customPosition: 'bottom-left'
    },
    {
      title: 'Click on a screen to open up the annotation',
      description: 'When you click on an individual screen in the flow, you open up the annotation associated with it and will be able to make all the changes that you’d like.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('node').item(0) as HTMLElement)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 2);
          window.parent.postMessage({ type: UserGuideMsg.OPEN_ANNOTATION }, '*');
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      width: '20rem',
      hotspot: true
    },
  ]
};

function EditingInteractiveDemoGuidePart1(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);
  const [showIntroCard, setShowIntroCard] = useState<boolean>(true);
  const nickname = useUserNickname();
  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      <IntroCard
        title={
          <>
            Hey{nickname} 👋🏻, <br />
            In this guide, we’ll see how you can edit every single aspect of your interactive demo
          </>
        }
        description="Fable has a plethora of editing options that you can make use of to perfect the flow of your interactive demo."
        acceptButtonProps={{
          children: 'Let’s go',
          onClick() {
            window.parent.postMessage({ type: UserGuideMsg.RESET_ZOOM }, '*');
            setShowIntroCard(false);
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
        show={props.isVisible && showIntroCard}
        width="20rem"
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
          completeUserGuide(guide.id);
          hotspotManager.cleanupHotspot();
        }}
        indicatorsRender={(current, total) => `${current + 1}/10`}
        arrow={false}
        onChange={(current) => hotspotManager.updateHotspot(current)}
        scrollIntoViewOptions={false}
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

export default { guideInfo, component: EditingInteractiveDemoGuidePart1 };
