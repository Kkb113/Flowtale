import React, { RefObject } from 'react';
import * as Tags from './styled';

export interface Props extends React.InputHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  sz?: 'large' | 'medium' | 'small';
  innerRef?: RefObject<HTMLTextAreaElement>;
  icon?: React.ReactNode;
}

export default function TextArea({ label, sz = 'medium', id, innerRef, icon, ...rest }: Props): JSX.Element {
  return (
    <Tags.InputContainer size={sz}>
      {icon && (
        <Tags.IconWrapper>
          {icon}b
        </Tags.IconWrapper>
      )}
      <textarea
        placeholder={rest.placeholder || ''}
        id={id}
        {...rest}
        ref={innerRef}
        style={{ paddingLeft: (icon ? '2.5rem' : '1rem') }}
      />
      <label className="label" htmlFor={id} style={{ paddingLeft: (icon ? '1.5rem' : '0rem') }}>
        <div className="text">{label}</div>
      </label>
    </Tags.InputContainer>
  );
}
