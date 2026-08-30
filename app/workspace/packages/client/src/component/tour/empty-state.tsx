import React, { lazy } from 'react';
import * as Tags from './styled';
import { StepContainer } from '../ext-download';
import Button from '../button';

interface IProps {
  extensionInstalled: boolean;
  isAtleastOneTourPublished: boolean;
  isAtleastOneDemoCreated: boolean;
  openOnboardingVideo: () => void;
}

const LottiePlayer = lazy(() => import('@lottiefiles/react-lottie-player').then(({ Player }) => ({
  default: Player
})));

function EmptyTourState({
  isAtleastOneDemoCreated,
  isAtleastOneTourPublished,
  extensionInstalled,
  openOnboardingVideo
}: IProps): JSX.Element {
  return (
    <Tags.EmptyToursContainer style={{
      justifyContent: isAtleastOneDemoCreated ? 'flex-start' : 'center'
    }}
    >
      <StepContainer
        extensionInstalled={extensionInstalled}
        isAtleastOneTourPublished={isAtleastOneTourPublished}
        isAtleastOneDemoCreated={isAtleastOneDemoCreated}
      />
      <Button
        intent="link"
        style={{
          color: '#757575'
        }}
        onClick={openOnboardingVideo}
      >
        🚀 Create your first demo in 60 seconds!
      </Button>
    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
