import React from 'react';
import TopLoader from './top-loader';
import { TOP_LOADER_DURATION } from '../../constants';

interface IOwnProps {
  showLogo?: boolean;
  text?: string;
}

function FullPageTopLoader({ showLogo, text }: IOwnProps): JSX.Element {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TopLoader duration={TOP_LOADER_DURATION} showLogo={showLogo || true} text={text} />
    </div>
  );
}

export default FullPageTopLoader;
