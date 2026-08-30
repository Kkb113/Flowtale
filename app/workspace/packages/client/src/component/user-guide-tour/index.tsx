import React from 'react';
import { Tour as AntTour, TourProps } from 'antd';
import './index.css';
import { EyeInvisibleFilled, RightSquareFilled } from '@ant-design/icons';

export default function Tour(props: TourProps): JSX.Element {
  return (
    <AntTour {...props} rootClassName="styled-tour" />
  );
}

export function NextBtnPropChildren(): JSX.Element {
  return <RightSquareFilled />;
}

export function PrevBtnPropChildren(): JSX.Element {
  return <EyeInvisibleFilled />;
}
