import React, { useState } from 'react';
import { LocalStoreUserGuideProps, shouldShowGuide } from './utils';
import { GuideProps } from './types';

interface Props {
  userGuides: { guideInfo: LocalStoreUserGuideProps, component: (props: GuideProps) => JSX.Element }[];
}

export default function SelectorComponent({ userGuides }: Props): JSX.Element {
  const [userGuide, setUserGuide] = useState(userGuides.find(guide => shouldShowGuide(guide.guideInfo.id)));

  const goToNextUserGuide = (): void => {
    setUserGuide(userGuides.find(guide => shouldShowGuide(guide.guideInfo.id)));
  };

  return (
    <>
      {userGuides.map(({ guideInfo, component: Component }) => (
        <React.Fragment key={guideInfo.id}>
          <Component
            goToNextUserGuide={goToNextUserGuide}
            isVisible={userGuide?.guideInfo.id === guideInfo.id}
          />
        </React.Fragment>
      ))}
    </>
  );
}
