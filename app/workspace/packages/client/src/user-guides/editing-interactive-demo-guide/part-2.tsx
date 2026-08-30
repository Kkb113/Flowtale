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
import { Guide, GuideInfo, GuideProps } from '../types';
import ReordingGif from '../../assets/user-guide/reordering.gif';
import PanningGif from '../../assets/user-guide/panning.gif';

export const guide: Guide = {
  id: 'editing-interactive-demo-guide-part-2',
  name: 'Editing the interactive demo that you have captured',
  desc: {
    toursCreated: 'After you have captured an interactive demo, you can customize everything from messaging to the order of the flow of the demo',
    toursNotCreated: 'Create a demo to see this guide'
  },
  serialId: 2,
  steps: [
    {
      title: 'Editing the message of the annotation',
      description: 'This text box is where you can set the message that is shown in the annotation box. You can include images and gifs as a part of the annotation along with text. You can even replace the text annotation box with a video annotation which you can either record within Fable or upload a recorded video file.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('annotation-rte').item(0) as HTMLElement)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 1);
          getDOMElement(guide, () => document.getElementById('branding-tab'))?.click();
          getDOMElement(guide, () => document.getElementById('ann-creator-panel'))?.scroll({ top: 400, behavior: 'smooth' });
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      width: '35rem',
      placement: 'left'
    },
    {
      title: 'Modify the look and feel of the interactive demo',
      description: 'You don’t have to limit the look and feel of the demo to what you selected at the time of capture. These options under branding will help you modify it any way you want.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('branding-tab').item(0) as HTMLElement)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          getDOMElement(guide, () => document.getElementById('branding-tab'))?.click();
          getDOMElement(guide, () => document.getElementById('buttons-panel'))?.click();
          getDOMElement(guide, () => document.getElementById('ann-creator-panel'))?.scroll({ top: 800, behavior: 'smooth' });
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
      width: '25rem',
      placement: 'left'
    },
    {
      title: 'Modify the buttons in the annotation',
      description: 'The default ‘Back’ and ‘Next’ buttons let you move between two annotations and can be either displayed or hidden (and the text of those can also be set to something else if you prefer). You can even add custom buttons with a specific URL.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('buttons-panel').item(0) as HTMLElement)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 3);
          getDOMElement(guide, () => document.getElementById('branding-tab'))?.click();
          getDOMElement(guide, () => document.getElementById('hotspot-panel'), false, false)?.click();
          getDOMElement(guide, () => document.getElementById('ann-creator-panel'))?.scroll({ top: 800, behavior: 'smooth' });
        },
      },
      prevButtonProps: {
        children: <PrevBtnPropChildren />,
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'left'
    },
    {
      title: 'Control the interactivity of the element that is highlighted',
      description: 'The highlighted element of each annotation is interactive and you can move through the demo by clicking on it (instead of the ‘Next’ button). The hotspot section allows you to make advanced changes like hiding the annotation box, focusing on the interactive element by adding a hotspot marker on it, etc.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('hotspot-panel').item(0) as HTMLElement, false, false)!,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 4);
          getDOMElement(guide, () => document.getElementById('advanced-creator-panel'))?.click();
          getDOMElement(guide, () => document.getElementById('ann-creator-panel'))?.scroll({ top: 800, behavior: 'smooth' });
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
      placement: 'left'
    },
    {
      title: 'Set the first step of the interactive demo',
      description: 'It is important that you don’t miss out on setting the first step of your interactive demo. By default, it is set to the first annotation which was created at the time of recording but you can change the flow of the interactive demo and set any step as the first step.',
      target: () => getDOMElement(guide, () => document.getElementsByClassName('advanced-creator-panel').item(0) as HTMLElement)!,
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
      placement: 'left'
    },
    {
      title: 'Adjusting the highlighted element selection',
      description: 'This advanced element picker enables you to change the highlighted element selection on which the annotation is applied. This will give you a greater degree of control over how an individual annotation is applied on the screen.',
      target: () => getDOMElement(guide, () => document.getElementById('AEP-wrapper') as HTMLElement, false, false)!,
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
      placement: 'top',
      width: '30rem'
    },
    {
      title: 'Navigate around the interactive demo',
      description: (
        <>
          <p>
            Drag or pan horizontally on the canvas area to see and navigate to other annotations in the interactive demo.
          </p>
          <img src={PanningGif} alt="" width={420} />
        </>
      ),
      target: null,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          getDOMElement(guide, () => document.getElementById('advanced-creator-panel'))?.click();
          updateStepsTaken(guide.id, 7);
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
      title: 'Drag annotation to reorder',
      description: (
        <>
          <p>
            You can change the flow of your demo by dragging and dropping the annotation box to reorder. You can even close the annotation box by clicking on ‘X’ and then reorder the flow of the demo in the full canvas mode.
          </p>
          <img src={ReordingGif} alt="" width={420} />
        </>
      ),
      target: null,
      nextButtonProps: {
        children: <NextBtnPropChildren />,
        onClick() {
          updateStepsTaken(guide.id, 8);
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
  ]
};

function EditingInteractiveDemoGuidePart2(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(props.isVisible);
  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      {startTour && <Tour
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
          props.goToNextUserGuide();
        }}
        indicatorsRender={(current, total) => `${current + 1 + 2}/10`}
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
  partId: 1,
  serialId: guide.serialId
};

export default { guideInfo, component: EditingInteractiveDemoGuidePart2 };
