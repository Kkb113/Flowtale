import React from 'react';
import * as Tags from './styled';

interface Props {
  children: React.ReactNode;
}

export default function TabBar({ children }: Props) {
  return (
    <Tags.TabItemsCon>
      {children}
    </Tags.TabItemsCon>
  );
}
