import React from 'react';
import styled from 'styled-components';

const Btn = styled.div`
  display: block;
  font-size: 1rem;
  font-weight: 500;
  background-color: white;
  border: 1px solid #16023E;
  border-radius: 8px;
  padding: 1rem;
  color: #16023E;
  text-align: center;
  transition: all .2s ease-out;
  cursor: pointer;
  box-shadow: 0px 1px 1px 0px #16023e;

  &:hover {
    background-color: #7567FF;
    color: white;
    box-shadow: 0px 6px 1px 0px #16023e;
    transform: translateY(-1px);
  }
  
  &:active {
    box-shadow: 0px 2px 1px 0px #16023e;
    transform: translateY(1px);
  }
`;

interface IProps {
  text: string;
  onClick: () => void;
}

function AnswerBtn({ text, onClick }:IProps):JSX.Element {
  return (
    <Btn
      onClick={onClick}
    >
      {text}
    </Btn>
  );
}

export default AnswerBtn;
