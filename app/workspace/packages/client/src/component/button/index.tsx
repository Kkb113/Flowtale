import React from 'react';
import * as Tags from './styled';

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  iconPlacement?: 'left' | 'right';
  intent?: 'primary' | 'secondary' | 'link';
  size?: 'large' | 'medium' | 'small';
  bgColor?: string;
  borderColor?: string;
  color?: string;
  borderRadius?: number;
}

export default function Button({
  children,
  icon,
  iconPlacement,
  intent = 'primary',
  size = 'medium',
  bgColor = '#7567FF',
  borderColor = '#16023E',
  color = intent === 'primary' ? '#fff' : '#16023E',
  borderRadius = size === 'medium' ? 24 : 60,
  ...rest
}: Props): JSX.Element {
  return (
    <Tags.ButtonCon
      className="typ-btn"
      intent={intent}
      size={size}
      bgColor={bgColor}
      borderColor={borderColor}
      color={color}
      borderRadius={borderRadius}
      {...rest}
    >
      {iconPlacement === 'left' ? (
        <>
          {icon}
          {children}
        </>
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </Tags.ButtonCon>
  );
}
