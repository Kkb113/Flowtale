import React from 'react';
import Button from '../button';
import { IDemoHubConfigCta } from '../../types';
import { OurLink } from '../../common-styled';

interface Props {
  cta: IDemoHubConfigCta;
  className?: string;
  width?: string;
}

export default function Cta(props: Props): JSX.Element {
  if (props.cta.type._val === 'link') {
    return (
      <OurLink
        href={props.cta.link._val}
        target="_blank"
        rel="noreferrer"
        style={{
          width: props.width || 'fit-content',
          marginBottom: 0,
          color: props.cta.style.fontColor
        }}
        className={props.className || ''}
      >
        {props.cta.text._val}
      </OurLink>
    );
  }

  return (
    <a
      href={props.cta.link._val}
      target="_blank"
      rel="noreferrer"
      style={{
        width: props.width || 'fit-content',
        display: 'block',
        textDecoration: 'none',
        pointerEvents: props.cta.__linkType === 'open_demo_modal' ? 'none' : 'auto',
      }}
    >
      <Button
        id={props.cta.id}
        icon={props.cta.icon}
        iconPlacement={props.cta.iconPlacement}
        intent={props.cta.type._val === 'primary' ? 'primary' : 'secondary'}
        bgColor={props.cta.style.bgColorProp._val}
        borderColor={props.cta.style.bgColorProp._val}
        color={props.cta.style.fontColor}
        borderRadius={props.cta.style.borderRadius}
        className={props.className || ''}
        style={{ width: props.width || 'auto' }}
      >
        {props.cta.text._val}
      </Button>
    </a>
  );
}
