import React, { useEffect, useState } from 'react';
import { IAnnotationConfig } from '@fable/common/dist/types';
import * as GTags from '../../common-styled';
import { elEffects, annEffects, getEffectFromString } from './effects';
import CaretOutlined from '../icons/caret-outlined';
import CssEditor from '../css-editor';

export const enum EffectFor {
  ann = 'ann',
  tel = 'tel' // targetElement
}

interface IProps {
  effectFor: EffectFor;
  onPreview: (css: string) => void;
  onSubmit: (css: string) => void;
  cssStr?: string;
  config: IAnnotationConfig;
}

enum ShowCssEditorState {
  UserForceShow,
  SystemShow,
  SystemHide
}

const DescText: Record<EffectFor, string> = {
  tel: 'Applies effect on the selected and non-selected elements on the screen.',
  ann: 'Applies effect on the annotaiton card.'
};

export default function EffectSelector(props: IProps): JSX.Element {
  const effects = (props.effectFor === EffectFor.tel ? elEffects : annEffects).map(ef => ({ ...ef }));
  const effectSet = getEffectFromString(effects, props.cssStr);
  const [stylePreset, setStylePreset] = useState(effectSet.id);
  const [showCssEditor, setShowCssEditor] = useState(ShowCssEditorState.SystemHide);
  const [currentEffect, setCurrentEffect] = useState<typeof effects[0]>(effectSet);

  useEffect(() => {
    if (currentEffect.id === stylePreset) return;
    const eff = effects.find(e => e.id === stylePreset)!;
    setCurrentEffect(eff);
  }, [stylePreset]);

  return (
    <div>
      <div className="typ-sm">
        {DescText[props.effectFor]}&nbsp;
        You can choose from our preset effect or you can build your own effect using css.
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0.75rem 0 ',
      }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          height: '44px',
          alignItems: 'center'
        }}
        >
          <div className="typ-reg">Choose a preset</div>
          <GTags.FableSelect
            bordered={false}
            defaultValue={stylePreset}
            style={{
              width: 160,
            }}
            suffixIcon={<CaretOutlined dir="down" />}
            options={
              effects.map(effect => ({
                value: effect.id,
                label: (
                  <div>
                    <div className="typ-ip">{effect.displayName}</div>
                    <div
                      className="typ-sm"
                      style={{
                        lineHeight: '12px',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {effect.desc}
                    </div>
                  </div>
                )
              }))
            }
            onChange={(effectId) => {
              if (effectId === 'custom') {
                setShowCssEditor(showCssEditor === ShowCssEditorState.UserForceShow
                  ? ShowCssEditorState.UserForceShow
                  : ShowCssEditorState.SystemShow);
              } else if (showCssEditor !== ShowCssEditorState.UserForceShow) {
                setShowCssEditor(ShowCssEditorState.SystemHide);
              }
              setStylePreset(effectId as string);
            }}
          />
        </div>
        <CssEditor
          effectId={currentEffect.id}
          annKey={props.config.refId}
          content={currentEffect.css}
          infoText=<div />
          hidden={showCssEditor === ShowCssEditorState.SystemHide}
          onSubmit={props.onSubmit}
          onVisibilitySwitch={(currentHiddenVal: boolean) => {
            if (currentHiddenVal === true) setShowCssEditor(ShowCssEditorState.UserForceShow);
            else setShowCssEditor(ShowCssEditorState.SystemHide);
          }}
          onPreview={props.onPreview}
        />
      </div>
    </div>
  );
}
