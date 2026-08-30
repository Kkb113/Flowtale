import React, { useState } from 'react';
import { CheckOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { AnnotationButtonLayoutType, AnnotationSelectionEffectType, AnnotationSelectionShapeType } from '@fable/common/dist/types';
import { FPOCon } from './styled';
import { StoredStyleForFormatPaste, StyleKeysToBeStored } from './types';

interface Props {
  pasteFormatStyle: StoredStyleForFormatPaste | null;
  applyStyle: (pasteFormat: StoredStyleForFormatPaste) => void;
  copyStyle: () => void;
}

type PropFromConfig = typeof StyleKeysToBeStored[number];

function getDisplayableProp(key: PropFromConfig, value: any) {
  if (key === 'hideAnnotation') {
    if (value) {
      return 'Annotation will be hidden';
    }
    return 'Annotation will be displayed';
  }

  if (key === 'showOverlay') {
    if (value) {
      return 'Overlay will be applied';
    }
    return 'Overlay will not be applied';
  }

  if (key === 'buttonLayout') {
    const tValue = value as AnnotationButtonLayoutType;
    if (tValue === 'default') {
      return 'Buttons will be shown inline';
    }
    return 'Buttons will be stacked';
  }

  if (key === 'selectionShape') {
    const tValue = value as AnnotationSelectionShapeType;
    if (tValue === 'box') {
      return 'Element selection type will be box';
    }
    return 'Element selection type will be pulse';
  }

  if (key === 'selectionEffect') {
    const tValue = value as AnnotationSelectionEffectType;
    if (tValue === 'blinking') {
      return 'Selection effect will be blinking';
    }
    return 'Selection effect will be standard';
  }

  if (key === 'annotationSelectionColor') {
    return (
      <>
        Selection color &nbsp; <span
          className="color-view"
          style={{
            background: value
          }}
        />
      </>
    );
  }

  if (key === 'annCSSStyle') {
    return 'Effect will be applied on annotation';
  }

  if (key === 'targetElCssStyle') {
    return 'Effect will be applied on element';
  }

  return key;
}

export default function FormatPasteOptions(props: Props) {
  const [formatPaste, setFormatPaste] = useState(props.pasteFormatStyle);

  return (
    <FPOCon>
      {formatPaste && Object.keys(formatPaste.style || {}).length > 0 && (
        <>
          <div style={{
            padding: '0 8px',
            fontSize: '13px',
          }}
          >
            {(Object.entries(formatPaste.style).map(([key, value]) => (
              <div className="copy-item" key={key}>
                {getDisplayableProp(key as any, value)}
                <div
                  className="del"
                  onClick={() => {
                    const newVal = {
                      ...formatPaste.style
                    };
                    delete (newVal as any)[key];
                    setFormatPaste({
                      ...formatPaste,
                      style: newVal
                    });
                  }}
                >
                  <CloseOutlined />
                </div>
              </div>
            )))}
          </div>
          <div
            className="selble"
            onClick={() => {
              props.applyStyle(formatPaste);
            }}
          >
            <CheckOutlined /> Apply copied style
          </div>
          <div className="divider" />
        </>
      )}
      <div>
        <div
          className="selble"
          onClick={() => {
            props.copyStyle();
          }}
          style={{
            margin: '0 0 4px'
          }}
        >
          <CopyOutlined /> Copy style of this annotation
        </div>
        <div
          className="typ-sm"
          style={{
            padding: '0 8px',
          }}
        >
          A style is already copied. Copying this style would discard the previous style.
        </div>
      </div>
    </FPOCon>
  );
}
