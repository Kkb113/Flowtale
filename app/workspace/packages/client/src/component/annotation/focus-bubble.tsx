import React from 'react';
import * as Tags from './styled';

interface Props {
  style?: React.CSSProperties;
  selColor?: string;
  diameter: number;
}

export default function FocusBubble(props: Props): JSX.Element {
  return (
    <Tags.Con style={props.style}>
      <Tags.HelpBubble selColor={props.selColor} bubbleDiameter={props.diameter}>
        <Tags.HelpBubbleOuterDot selColor={props.selColor} bubbleDiameter={props.diameter}>
          <Tags.HelpBubbleInnerDot selColor={props.selColor} bubbleDiameter={props.diameter} />
        </Tags.HelpBubbleOuterDot>
      </Tags.HelpBubble>
    </Tags.Con>
  );
}
