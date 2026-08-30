import React, { ReactNode } from 'react';
import Button from '../../button';
import { EntryBase } from '../../../types';

interface Props {
  data: EntryBase['continueCTA'] | EntryBase['skipCTA'];
  onClick: () => void;
  disabled: boolean;
  icon?: ReactNode;
  bgColor: string;
  borderColor: string;
}

function EntryButton(props: Props): JSX.Element {
  const getButtonIntent = () => {
    if (props.data.type === 'outline') return 'secondary';
    return props.data.type;
  };

  return (
    <Button
      id={props.data.id}
      iconPlacement={props.data.iconPlacement}
      intent={getButtonIntent()}
      bgColor={props.bgColor}
      borderColor={props.borderColor}
      color={props.data.style.fontColor}
      borderRadius={props.data.style.borderRadius}
      className={`cta cta-${props.data.id}`}
      onClick={props.onClick}
      disabled={props.disabled}
      icon={props.icon}
    >
      {props.data.text}
    </Button>
  );
}

export default EntryButton;
