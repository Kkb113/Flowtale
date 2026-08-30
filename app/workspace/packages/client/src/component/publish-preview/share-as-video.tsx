import React from 'react';
import { SegmentedValue } from 'antd/es/segmented';
import { INTERACTIVE_MODE } from '../../types';
import { OurSegmented } from '../../common-styled';

interface Props {
  onChange: ((value: SegmentedValue) => void),
  activeMode: INTERACTIVE_MODE
}

function ShareAsVideo(props: Props): JSX.Element {
  return (
    <div style={{ marginTop: '15px' }}>
      Share as: &nbsp;
      <OurSegmented
        options={[INTERACTIVE_MODE.INTERACTIVE_TOUR, INTERACTIVE_MODE.INTERACTIVE_VIDEO]}
        onChange={props.onChange}
        value={props.activeMode}
      />
    </div>
  );
}

export default ShareAsVideo;
