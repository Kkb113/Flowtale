import React, { useEffect, useState } from 'react';
import { compileValue, createGlobalProperty, createLiteralProperty, GlobalPropsPath } from '@fable/common/dist/utils';
import { Property } from '@fable/common/dist/types';
import { DemoHubConfigCtaType, DemoHubConfigCtaTypeType, IDemoHubConfigCta, SimpleStyle } from '../../../../types';
import Input from '../../../input';
import * as GTags from '../../../../common-styled';
import CaretOutlined from '../../../icons/caret-outlined';
import SimpleStyleEditor from '../../simple-styles-editor';
import { useEditorCtx } from '../../ctx';
import { InputText } from '../../../screen-editor/styled';
import ApplyStylesMenu from '../../../screen-editor/apply-styles-menu';
import { isGlobalProperty } from '../../../../utils';
import { amplitudeDemoHubCta, amplitudeApplyGlobalStyles } from '../../../../amplitude';
import { AMPLITUDE_CTA_STYLE } from '../../../../amplitude/types';

interface Props {
  cta: IDemoHubConfigCta;
}

export default function CtaEditor(props: Props): JSX.Element {
  const { onConfigChange, globalConfig } = useEditorCtx();
  const updateCtaProps = <K extends keyof IDemoHubConfigCta>(
    key: K,
    value: IDemoHubConfigCta[K]
  ): void => {
    onConfigChange(c => {
      const ctaIndex = c.cta.findIndex(cta => cta.id === props.cta.id);
      c.cta[ctaIndex] = { ...c.cta[ctaIndex], [key]: value };

      return {
        ...c,
        cta: [...c.cta],
      };
    });
  };

  const amplitudeCtaSimpleStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ):void => {
    let amplitudeVal = value as string;
    if (key === 'bgColorProp') {
      amplitudeVal = (value as Property<string>)._val;
    }
    amplitudeDemoHubCta('edit', props.cta.id, AMPLITUDE_CTA_STYLE[key], amplitudeVal);
  };

  const updateCtaSimpleStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    updateCtaProps('style', { ...props.cta.style, [key]: value });
  };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '96%',
        margin: '0 auto',
        paddingBottom: '1rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">Button text</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <InputText
              type="text"
              value={props.cta.text._val}
              onChange={e => {
                updateCtaProps('text', createLiteralProperty(e.target.value));
              }}
              style={{ height: '44px', width: '100%' }}
              onBlur={e => amplitudeDemoHubCta('edit', props.cta.id, 'button_text', e.target.value)}
            />
            <ApplyStylesMenu
              isGlobal={isGlobalProperty(props.cta.text)}
              onApplyGlobal={() => {
                updateCtaProps('text', createGlobalProperty(
                  compileValue(globalConfig, GlobalPropsPath.customBtn1Text),
                  GlobalPropsPath.customBtn1Text
                ));
                amplitudeApplyGlobalStyles('demo_hub', 'custom_cta_text', null, true);
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">CTA type</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <GTags.FableSelect
              className="typ-ip"
              value={props.cta.type._val}
              placeholder="Select CTA type"
              bordered={false}
              options={DemoHubConfigCtaType.map(v => ({
                value: v,
                label: v.charAt(0).toUpperCase() + v.slice(1),
              }))}
              onChange={(e) => {
                if (e) {
                  updateCtaProps('type', createLiteralProperty(e as DemoHubConfigCtaTypeType));
                  amplitudeDemoHubCta('edit', props.cta.id, 'button_text', e as string);
                }
              }}
              suffixIcon={<CaretOutlined dir="down" />}
              style={{ height: '44px' }}
            />
            <ApplyStylesMenu
              isGlobal={isGlobalProperty(props.cta.type)}
              onApplyGlobal={() => {
                updateCtaProps('type', createGlobalProperty(
                  compileValue(globalConfig, GlobalPropsPath.customBtn1Style),
                  GlobalPropsPath.customBtn1Style
                ));
                amplitudeApplyGlobalStyles('demo_hub', 'custom_cta_type', null, true);
              }}
            />
          </div>
        </div>

      </div>

      {props.cta.id !== 'see-all-demos' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">Link</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <InputText
              type="url"
              value={props.cta.link._val}
              onChange={e => {
                updateCtaProps('link', createLiteralProperty(e.target.value));
              }}
              style={{ height: '44px', width: '100%' }}
              onBlur={e => amplitudeDemoHubCta('edit', props.cta.id, 'button_link', e.target.value)}
            />
            <ApplyStylesMenu
              isGlobal={isGlobalProperty(props.cta.link)}
              onApplyGlobal={() => {
                updateCtaProps('link', createGlobalProperty(
                  compileValue(globalConfig, GlobalPropsPath.customBtn1URL),
                  GlobalPropsPath.customBtn1URL
                ));
                amplitudeApplyGlobalStyles('demo_hub', 'custom_cta_url', null, true);
              }}
            />
          </div>
        </div>
      )}

      <SimpleStyleEditor
        simpleStyle={props.cta.style}
        simpleStyleUpdateFn={updateCtaSimpleStyle}
        amplitudeStyleEvent={amplitudeCtaSimpleStyle}
      />
    </div>
  );
}
