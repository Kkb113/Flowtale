import React, { ReactNode } from 'react';
import * as Tags from './styled';

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface Props {
  acceptButtonProps: ButtonProps;
  rejectButtonProps: ButtonProps;
  title: ReactNode;
  description?: ReactNode;
  show: boolean;
  width?: string;
}

export default function IntroCard(props: Props): JSX.Element {
  return props.show ? (
    <Tags.IntroCardCon width={props.width}>
      <div className="intro-title">
        {props.title}
      </div>
      {props.description && (
        <div className="intro-description">
          {props.description}
        </div>
      )}
      <div className="button-con">
        <button
          style={props.acceptButtonProps.style}
          className={`btn-primary ${props.acceptButtonProps.className}`}
          type="button"
          onClick={props.acceptButtonProps.onClick}
        >
          {props.acceptButtonProps.children}
        </button>
        <button
          className={`btn-secondary ${props.rejectButtonProps.className}`}
          type="button"
          onClick={props.rejectButtonProps.onClick}
        >
          {props.rejectButtonProps.children}
        </button>
      </div>
    </Tags.IntroCardCon>
  )
    : <></>;
}
