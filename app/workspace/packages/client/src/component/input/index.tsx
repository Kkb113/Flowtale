import React, { RefObject } from 'react';
import * as Tags from './styled';

export interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  sz?: 'large' | 'medium';
  innerRef?: RefObject<HTMLInputElement>;
  icon?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  inline?: boolean
}

export default function Input({
  label,
  sz = 'large',
  id,
  innerRef,
  icon,
  inline,
  containerStyle,
  style,
  ...rest
}: Props): JSX.Element {
  return (
    <Tags.InputContainer size={sz} inline={inline} style={containerStyle}>
      {icon && (
        <Tags.IconWrapper>
          {icon}
        </Tags.IconWrapper>
      )}
      <input
        placeholder={rest.placeholder || ''}
        id={id}
        {...rest}
        ref={innerRef}
        style={{ paddingLeft: (icon ? '2.5rem' : '1rem'), ...style }}
        className="typ-ip"
      />
      <label className="label" htmlFor={id} style={{ paddingLeft: (icon ? '1.5rem' : '0rem') }}>
        <div className="text">{label}</div>
      </label>
    </Tags.InputContainer>
  );
}
