import React, { lazy, Suspense } from 'react';
import { TypeAnimation } from 'react-type-animation';
import QuillyJson from '../../assets/quilly.json';

const LottiePlayer = lazy(() => import('@lottiefiles/react-lottie-player').then(({ Player }) => ({
  default: Player
})));

function QuillyLoader(): JSX.Element {
  return (
    <div style={{ minHeight: '300px' }}>
      <TypeAnimation
        preRenderFirstString
        cursor={false}
        sequence={[
          500,
          'Please wait while Quilly creates content for your demo',
          500,
          'Please wait while Quilly creates content for your demo.',
          500,
          'Please wait while Quilly creates content for your demo..',
          500,
          'Please wait while Quilly creates content for your demo...',
          500,
        ]}
        speed={75}
        style={{ fontSize: '1.8rem' }}
        repeat={Infinity}
      />
      <div style={{
        display: 'flex',
        gap: '2rem'
      }}
      >
        <Suspense fallback={null}>
          <div>
            <LottiePlayer
              style={{ height: '120px' }}
              src={QuillyJson}
              autoplay
              loop
            />
            <p className="typ-sm">
              Meet <em>Quilly</em>, <br />Your AI Demo Copilot.
            </p>
          </div>
        </Suspense>
        <div className="typ-reg" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <TypeAnimation
            cursor={false}
            sequence={[
              500,
              'Quilly is\n  ● analyzing your product details & demo objective\n  ● getting annotations captured from your product\n  ● creating content for this demo',
              15000,
              '',
            ]}
            omitDeletionAnimation
            speed={68}
            style={{ fontSize: '1.25rem', whiteSpace: 'pre-line', display: 'block', minHeight: '48px' }}
            repeat={Infinity}
          />
        </div>
      </div>
    </div>
  );
}

export default QuillyLoader;
