import { CustomAnnotationPosition } from '@fable/common/dist/types';
import React from 'react';
import * as Tags from './styled';

interface Props {
    fullWidth: number,
    panelWidth: number,
    onChange: (e: CustomAnnotationPosition) => void;
    selectedPos: CustomAnnotationPosition;
}

const customAnnPositioningOptions = {
  left: [CustomAnnotationPosition.LEFT_TOP,
    CustomAnnotationPosition.LEFT_CENTER,
    CustomAnnotationPosition.LEFT_BOTTOM],
  right: [CustomAnnotationPosition.RIGHT_TOP,
    CustomAnnotationPosition.RIGHT_CENTER,
    CustomAnnotationPosition.RIGHT_BOTTOM],
  top: [CustomAnnotationPosition.TOP_LEFT,
    CustomAnnotationPosition.TOP_CENTER,
    CustomAnnotationPosition.TOP_RIGHT],
  bottom: [CustomAnnotationPosition.BOTTOM_LEFT,
    CustomAnnotationPosition.BOTTOM_CENTER,
    CustomAnnotationPosition.BOTTOM_RIGHT],
};

function AnnPositioningInput(props: Props): JSX.Element {
  const panelHeight = props.fullWidth - props.panelWidth * 2;

  return (
    <Tags.AnnPositioningInput
      fullWidth={props.fullWidth}
      panelWidth={props.panelWidth}
      panelHeight={panelHeight}
    >
      {
        Object.entries(customAnnPositioningOptions).map(([dir, positions]) => (
          <div
            className={`ann-pos-panel ann-pos-panel-${dir}`}
            key={dir}
          >
            {
              positions.map(pos => (
                <Tags.AnnPositionInputBox
                  onClick={() => props.onChange(pos)}
                  key={pos}
                  isSelected={pos === props.selectedPos}
                >
                  <div />
                </Tags.AnnPositionInputBox>
              ))
              }
          </div>
        ))
      }
      <div className="ann-pos-center" />
    </Tags.AnnPositioningInput>
  );
}

export default AnnPositioningInput;
