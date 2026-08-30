import React, { ReactNode } from 'react';
import { ArrowRightOutlined, FastForwardOutlined } from '@ant-design/icons';
import { LeadFormEntry, SelectEntry, TextEntry } from '../../../types';
import * as Tags from '../styled';
import Cta from '../../demo-hub-editor/cta';
import EntryButton from './button';
import { useDemoHubQlfcnCtx } from '../ctx';
import { SelectStep } from '../type';

const reactanimated = require('react-animated-css');

interface Props {
  entryBaseData: TextEntry | SelectEntry | LeadFormEntry;
  // eslint-disable-next-line react/no-unused-prop-types
  isVisible: boolean;
  // eslint-disable-next-line react/no-unused-prop-types
  children: ReactNode;
  hideContinue: boolean;
  hideSkip: boolean;
  goToNext: () => void;
  onSkip: () => void;
  isContBtnDisabled?: boolean;
  // eslint-disable-next-line react/no-unused-prop-types
  isDemo?: true;
  hideEndCTA?: boolean;
  // eslint-disable-next-line react/no-unused-prop-types
  compact?: boolean;
}

function BaseEntry(props: Props): JSX.Element {
  // TODO[dh-now] move this to appropriate location

  return (
    <reactanimated.Animated
      animationIn="fadeInUp"
      animationOut="fadeOutUp"
      animationInDuration={300}
      animationOutDuration={300}
      animateOnMount={false}
      isVisible={props.isVisible}
    >
      <Tags.BaseEntryCon
        isVisible={props.isVisible}
        style={{
          zIndex: props.isVisible ? 9 : 1,
        }}
        styleData={props.entryBaseData.style}
        className="q-con"
      >
        <div className={(props.entryBaseData as SelectStep).demoData ? 'q-inner-con-full-w' : 'q-inner-con'}>
          <Tags.BaseEntryContent
            maxWidth={props.isDemo ? 'full' : 'content'}
            styleData={props.entryBaseData.style}
            className={`${props.compact ? 'compact' : ''}`}
          >
            <div className={`line1 ${props.compact ? 'compact' : ''}`}>
              {props.entryBaseData.title && (
              <Tags.StepTitle
                className={`step-title title ${props.compact ? 'compact' : ''}`}
                styleData={props.entryBaseData.style}
              >
                {props.entryBaseData.title}
              </Tags.StepTitle>
              )}
              {props.compact && (<CTAs {...props} />)}
            </div>
            {props.entryBaseData.desc && (
            <Tags.StepDesc
              className="step-desc desc"
              styleData={props.entryBaseData.style}
            >
              {props.entryBaseData.desc}
            </Tags.StepDesc>
            )}

            {props.children}
            {!props.compact && (<CTAs {...props} />)}
          </Tags.BaseEntryContent>
        </div>
      </Tags.BaseEntryCon>
    </reactanimated.Animated>

  );
}

function CTAs(props: Props) {
  const { qualificationConfig, config } = useDemoHubQlfcnCtx();

  const skipContBtnBgColor = props.entryBaseData.style.borderColor;
  const skipContBtnBorderColor = props.entryBaseData.style.borderColor;

  return (
    <Tags.BaseEntryCTACon className="cta-con">
      {!props.hideSkip && props.entryBaseData.showSkipCta && (
      <EntryButton
        data={props.entryBaseData.skipCTA}
        onClick={props.onSkip}
        bgColor={skipContBtnBgColor}
        borderColor={skipContBtnBorderColor}
        disabled={false}
        icon={<FastForwardOutlined />}
      />
      )}
      {!props.hideContinue && (
      <EntryButton
        data={props.entryBaseData.continueCTA}
        onClick={props.goToNext}
        bgColor={skipContBtnBgColor}
        borderColor={skipContBtnBorderColor}
        disabled={props.isContBtnDisabled || false}
        icon={<ArrowRightOutlined />}
      />
      )}
      {
        !props.hideEndCTA && qualificationConfig?.qualificationEndCTA && (
          qualificationConfig.qualificationEndCTA.map((ctaId) => {
            const cta = config.cta.find(item => item.id === ctaId);
            if (!cta) return null;
            return (
              <Cta
                cta={cta}
                key={ctaId}
                className={`cta cta-${ctaId}`}
              />
            );
          })
        )
      }
    </Tags.BaseEntryCTACon>
  );
}

export default BaseEntry;
