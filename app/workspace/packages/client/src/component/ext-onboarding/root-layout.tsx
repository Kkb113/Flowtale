import React, { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FableLogo from '../../assets/onboarding/fable-logo.svg';
import Browser from '../../assets/onboarding/pin-ext-browser.png';
import * as Tags from './styled';

interface Props {
  dontShowIllustration?: boolean;
  equalSpaced?: boolean;
  abs?: boolean;
  children: React.ReactNode;
  stackedbarStyle?: CSSProperties;
  dontShowStackedBars?: boolean;
  fullheight?: boolean;
}

export function VerticalStackedBars(props: { style: CSSProperties}): JSX.Element {
  return (
    <div style={{
      height: '100vh',
      position: 'absolute',
      zIndex: -1,
      top: 0,
      right: '21%',
      ...props.style
    }}
    >
      <div style={{
        backgroundColor: '#FEDF64',
        width: '18rem',
        position: 'absolute',
        zIndex: '1',
        right: '7.625rem',
        height: '100vh'
      }}
      />
      <div style={{
        backgroundColor: '#7567FF',
        width: '18rem',
        position: 'absolute',
        right: '3.5rem',
        height: '100vh'
      }}
      />
      <div style={{
        backgroundColor: '#FF7450',
        width: '18rem',
        height: '100vh'
      }}
      />
    </div>
  );
}

export default function RootLayout(props: Props): JSX.Element {
  return (
    <Tags.RootLayoutCon equalSpaced={!!props.equalSpaced} abs={!!props.abs} fullheight={!!props.fullheight} id="frtlt">
      {!props.dontShowStackedBars && (
        <VerticalStackedBars style={props.stackedbarStyle || {}} />
      )}
      <Link to="/demos">
        <img
          style={{
            height: '2rem',
            position: 'absolute',
            top: '4.375rem'
          }}
          src={FableLogo}
          alt="fable logo"
        />
      </Link>
      {!props.dontShowIllustration && (
        <img
          src={Browser}
          alt="browser illustration"
          style={{
            position: 'absolute',
            right: '4.25%',
            width: '37rem',
            top: 'calc(50vh - 14rem)'
          }}
        />
      )}
      {props.children}
    </Tags.RootLayoutCon>
  );
}
