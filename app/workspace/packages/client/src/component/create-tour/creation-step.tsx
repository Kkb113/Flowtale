import React from 'react';
import { Animated, AnimatedProps } from 'react-animated-css';

/** Inactive wizard steps cannot remain focusable beneath an opacity animation. */
export default function CreationStep(props: React.PropsWithChildren<AnimatedProps>): JSX.Element {
  return (
    <div hidden={!props.isVisible}>
      <Animated {...props} />
    </div>
  );
}
