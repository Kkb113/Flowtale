import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import Button from '../button';

export type ParamType = Array<{ key: string, value: string, mapping: string}>;

interface IProps {
  onParamsAdd: (params: ParamType) => void;
}

const Con = styled.div`
  button {
    transform: scale(0.8);

    &:hover {
      transform: scale(0.9);
    }
  }
`;

export default function (props: IProps): JSX.Element {
  return (
    <Con>
      <p>
        If you want to put this interactive demo behind a form and you want to see how each of your buyer has interacted with the demo
      </p>
      <Button
        intent="secondary"
        size="medium"
        onClick={() => {
          props.onParamsAdd([{
            key: '',
            value: 'user@acme.com',
            mapping: 'ftm_uid'
          }]);
        }}
      >
        Add / remove tracking parameter
      </Button>
      <p />
    </Con>
  );
}
