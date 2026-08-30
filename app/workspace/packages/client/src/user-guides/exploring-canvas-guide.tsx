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
import ReordingGif from '../assets/user-guide/reordering-2.gif';

export const guide: Guide = {
  id: 'exploring-canvas-guide',
  name: 'Exploring Fable’s canvas',
  serialId: 1,
  desc: {
    toursCreated: 'Fable’s canvas is the playground where the magic sauce is added to an interactive demo after capturing it.',
    toursNotCreated: 'Create a demo to see this guide'
  },
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
      width: '20rem',
      customPosition: 'bottom-left'
    },
    {
      title: 'Drag annotation to reorder',
      description: (
        <>
          <p>
            You can change the flow of an interactive demo by dragging and dropping the annotation box to reorder.
          </p>
          <img src={ReordingGif} alt="" width={420} />
        </>
      ),
      target: null,
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
      width: '480px'
    },
    {
      title: 'Add a new screen',
      description: 'You can add an existing screen that was captured as a part of a different interactive demo or upload an image to add it to this interactive demo.',
      target: () => getDOMElement(guide, () => document.getElementById('new-screen-btn'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 4);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
    },
    {
      title: 'Design your loader',
      description: (
        <>
          <p>
            A loader is shown when an interactive demo is being readied to display. You can upload your brand assets to customize the loader.
          </p>
        </>
      ),
      target: () => getDOMElement(guide, () => document.getElementById('loader-btn'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 5);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
      width: '20rem'
    },
    {
      title: 'Create a module',
      description: 'When you have multiple flows within the same interactive demo to showcase different modules, you can use the module feature so that your buyers can navigate between different flows/modules very easily. Think of it like the index of a book where there are multiple chapters. 😉',
      target: () => getDOMElement(guide, () => document.getElementById('journey-btn'))!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 6);
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
    },
  ]
};

function PreviewAndEmbedGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);
  const nickname = useUserNickname();
  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      <IntroCard
        title={
          <>
            Hey{nickname} 👋🏻 <br />
            In this guide, we’ll see what Fable’s playground is all about
          </>
        }
        description="Fable’s canvas is where you can sprinkle the magic sauce that will make your interactive demo awesome. Let’s dive into this guide to see what the canvas is all about."
        acceptButtonProps={{
          children: 'Let’s go',
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

      {startTour && <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          hotspotManager.cleanupHotspot();
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
      />}
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

export default { guideInfo, component: PreviewAndEmbedGuide };
