import React from 'react';
import { getUserGuideCompletionProgressInModules } from '../../user-guides/utils';
import * as Tags from './styled';
import openBookIcons from '../../assets/icons/open-book.svg';
import { ProgressCircle } from '../progress-circle';

interface Props {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  selected: boolean;
}

export default function UserGuideProgress(props: Props): JSX.Element {
  const { completedModules, totalmodules } = getUserGuideCompletionProgressInModules();
  return (
    <Tags.UserGuideProgressCon selected={props.selected} onClick={props.onClick}>
      <ProgressCircle
        totalmodules={totalmodules}
        completedModules={completedModules}
        progressCircleSize={14}
      />
    </Tags.UserGuideProgressCon>
  );
}
