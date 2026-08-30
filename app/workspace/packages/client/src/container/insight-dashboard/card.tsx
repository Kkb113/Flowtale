import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import * as Tags from './styled';

export default function Card({ loading, children, style, contentStyle }: {
  loading?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties,
  contentStyle?: React.CSSProperties
}) {
  return (
    <Tags.Card $loading={loading} style={style}>
      <div className="loader"><LoadingOutlined /></div>
      <div className="content" style={contentStyle}>
        {children}
      </div>
    </Tags.Card>
  );
}
