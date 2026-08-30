import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { FrameSettings } from '@fable/common/dist/api-contract';
import { InternalEvents } from '../../types';
import DemoProgressBar from '.';

describe('DemoProgressBar', () => {
  it('ignores multi-annotations that are not numbered tour steps', () => {
    render(
      <DemoProgressBar
        iframePos={{ left: 0, top: 0, width: 100, height: 100, heightOffset: 0 }}
        annotationSerialIdMap={{
          main: { absIdx: 0, absLen: 1, idx: 0, len: 1 }
        }}
        bg="#ffffff"
        fg="#000000"
        textColor="#000000"
        frame={FrameSettings.NOFRAME}
      />
    );

    expect(() => {
      fireEvent(document, new CustomEvent(InternalEvents.OnNavigation, {
        detail: { currentAnnotationRefId: 'multi-annotation' }
      }));
    }).not.toThrow();
  });
});
