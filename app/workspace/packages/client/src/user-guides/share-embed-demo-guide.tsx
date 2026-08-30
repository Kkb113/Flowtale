import React, { useState } from 'react';
import Tour, { NextBtnPropChildren, PrevBtnPropChildren } from '../component/user-guide-tour';
import {
  closeUserGuide,
  completeUserGuide,
  emulateHotspotClick,
  getDOMElement,
  skipUserGuide,
  updateStepsTaken,
  UserGuideHotspotManager
} from './utils';
import { Guide, GuideInfo, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';
import { useUserNickname } from '../hooks/useUserNickname';

export const guide: Guide = {
  id: 'share-embed-demo-guide',
  name: 'Sharing or embedding your interactive demo',
  serialId: 4,
  desc: {
    toursCreated: 'You can share an interactive demo as a unique link or embed it on any webpage as an iframe',
    toursNotCreated: 'Create a demo to see this guide'
  },
  steps: [
    {
      title: 'The final flow of your interactive demo',
      description: 'After you have made all the edits to your demo, you can see the entire flow in the canvas.',
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
      width: '20rem',
      customPosition: 'bottom-left'
    },
    {
      title: 'Preview of an interactive demo',
      description: 'You can check the preview of the demo that you have created by clicking on the preview button. This essentially shows you the final output that your buyers will experience.',
      target: () => getDOMElement(guide, () => document.getElementById('step-1'))!,
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
      width: '25rem'
    },
    {
      title: 'Sharing your interactive demo',
      description: 'The sharing options of your interactive demo can be accessed by clicking on the share button that you see in the top right corner of your canvas.',
      target: () => getDOMElement(guide, () => document.getElementById('step-2'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 3);
          emulateHotspotClick(document.getElementById('step-2')!);
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
      title: 'Sharing options for your interactive demo',
      description: 'This is the embed code as well as the unique URL for the interactive demo that you have created. You can either embed it on a landing page or share it as a link with your buyer.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('ant-modal-content').item(0) as HTMLElement)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 4);
          getDOMElement(guide, () => document.getElementsByClassName('ant-modal-close').item(0) as HTMLElement)?.click();
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'right',
      width: '14rem'
    },
  ]
};

function ShareEmbedDemoGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);
  const nickname = useUserNickname();
  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      <IntroCard
        title={
          <>
            Hey{nickname} 👋🏻 <br /> In this guide, we’ll see how you can share/embed your interactive demo
          </>
        }
        description="You can share your interactive demos with your buyers as a unique URL or embed it as an iframe on a landing page for them to experience it."
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
          hotspotManager.cleanupHotspot();
          props.goToNextUserGuide();
        }}
        indicatorsRender={(current, total) => `${current + 1}/${total}`}
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

export default { guideInfo, component: ShareEmbedDemoGuide };
