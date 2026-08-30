import { StarFilled } from '@ant-design/icons';
import React from 'react';
import styled from 'styled-components';

interface Props {
  isInBeta?: boolean
}

export default function UpgradeIcon(props: Props) {
  return (
    <Con>
      <span className="upgrd-ico" title={props.isInBeta ? 'In Beta' : 'Upgrade plan'}><StarFilled /></span>
    </Con>
  );
}

const Con = styled.div`
  display: inline-block;

  .upgrd-ico {
    font-size: 12px;
    color: #7567ff;
    background: #fedf64;
    padding: 1px 2px;
    border-radius: 2px;
    display: inline !important;
  }
`;
