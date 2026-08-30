import React, { useEffect, useState } from 'react';
import * as Tags from './top-loader-style';
import FableLogo from '../../assets/fable-logo-2.svg';
import * as GTags from '../../common-styled';

interface IProps {
  duration: number;
  showLogo: boolean;
  text?: string;
  showOverlay?: boolean;
}

function TopLoader({ duration, showLogo, text, showOverlay }: IProps): JSX.Element {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (progress < 100) {
      intervalId = setInterval(() => {
        setProgress(prevProgress => {
          if (prevProgress < 99) {
            return prevProgress + 1;
          }
          clearInterval(intervalId);
          return prevProgress;
        });
      }, (duration * 1000) / 99);
    }

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Tags.LoaderContainer showOverlay={showOverlay}>
      {showLogo
      && (
      <Tags.LoaderLogo>
        <img src={FableLogo} alt="fable loader" />
        {text ? <p>{text}...</p> : <p>Loading...</p>}
      </Tags.LoaderLogo>
      )}
      <GTags.LoaderBar>
        <GTags.LoaderProgress
          bwidth={progress}
          bcolor="#7567FF"
          bradius={10}
          bopacity={1}
        />
      </GTags.LoaderBar>
    </Tags.LoaderContainer>
  );
}

export default TopLoader;
