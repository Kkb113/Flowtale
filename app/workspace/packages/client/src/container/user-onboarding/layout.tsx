import React, { ReactNode } from 'react';
import * as Tags from './styled';
import FableLogo from '../../assets/fable_logo_light_bg.png';

interface Props {
  children: ReactNode;
  footer?: ReactNode;
  style?: React.CSSProperties;
}

export default function Layout(props: Props) {
  return (
    <Tags.Con>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css" />
      <Tags.FableLogoImg
        src={FableLogo}
        alt=""
        height={30}
      />
      <div style={{
        display: 'flex',
        width: '100%',
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...props.style
      }}
      >
        {props.children}
      </div>
      {props.footer}
    </Tags.Con>
  );
}
