import React from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { RespSubscription } from '@fable/common/dist/api-contract';
import Button from '../../component/button';
import * as Tags from './styled';
import BuyMoreCredit from '../../component/create-tour/buy-more-credit';
import { VoiceOptions } from '.';
import { P_RespSubscription } from '../../entity-processor';

interface Props {
    handleVoiceover: () => Promise<void>;
    handleRemoveVoiceover: () => Promise<void>;
    quillyUpdateLoading: boolean;
    showRemoveVoiceover: boolean;
    closeVoiceoverPopup: () => void;
    playPauseSampleVoice: (e: typeof VoiceOptions[0]) => void;
    selectedVoice: string;
    subs: P_RespSubscription | null;
    creditRequiredForVoiceover: number;
    getSubscriptionOrCheckoutNew: () => Promise<RespSubscription>;
    updateVoiceOption:(name: string)=> void;
    hideCloseIcon?: boolean;
}

function VoiceoverPopup(props: Props): JSX.Element {
  return (
    <Tags.QuickEditPopoverCon drawBorder={props.hideCloseIcon} additionalPadding={props.hideCloseIcon}>
      {!props.hideCloseIcon && (
        <div className="close-btn" onClick={props.closeVoiceoverPopup}>
          <CloseOutlined />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <div className="typ-h1">{props.showRemoveVoiceover ? 'Update the' : 'Add an'} audio track</div>
          <div className="typ-sm" style={{ marginTop: '0.5rem' }}>
            An audio track will be generated using voiceovers based on your annotations..
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {VoiceOptions.map((option) => (
            <div
              key={option.name}
              onMouseDown={() => props.playPauseSampleVoice(option)}
            >
              <label
                htmlFor={option.name}
                style={{ cursor: 'pointer' }}
                title="Click to play / pause the sample"
              >
                <input
                  type="radio"
                  value={option.name}
                  id={option.name}
                  onChange={() => props.updateVoiceOption(option.name)}
                  checked={props.selectedVoice === option.name}
                  name="audio"
                />
                <span>
                  {option.label}
                </span>
                <span className="typ-sm" style={{ marginLeft: '1.5rem', display: 'block' }}>
                  {option.description}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
      {
        props.subs && props.subs.availableCredits < props.creditRequiredForVoiceover
          ? (
            <div style={{ margin: 'auto' }}>
              <BuyMoreCredit
                currentCredit={props.subs.availableCredits}
                checkCredit={props.getSubscriptionOrCheckoutNew}
                showCreditInfo={false}
                clickedFrom="preview"
              />
            </div>
          )
          : (
            <Button
              type="submit"
              onClick={props.handleVoiceover}
              disabled={props.quillyUpdateLoading}
            >{props.showRemoveVoiceover ? 'Update audio track' : 'Apply to generate video'}
            </Button>
          )
        }
      {props.showRemoveVoiceover && (
        <Button
          type="submit"
          onClick={props.handleRemoveVoiceover}
          intent="secondary"
          disabled={props.quillyUpdateLoading}
        >Remove audio track
        </Button>)}
    </Tags.QuickEditPopoverCon>
  );
}

export default VoiceoverPopup;
