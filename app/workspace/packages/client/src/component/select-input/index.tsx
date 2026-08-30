import React, { RefObject } from 'react';
import type { SelectProps } from 'antd';

import * as Tags from './styled';

export interface Props extends SelectProps{
  label: string;
  id: string;
}

export default function SelectInput({ label, id, ...rest }: Props): JSX.Element {
  return (
    <Tags.SelectInputContainer>
      <Tags.SelectInput
        id={id}
        {
            ...rest
        }
      />
      <label htmlFor={id}>{label}</label>
    </Tags.SelectInputContainer>
  );
}
