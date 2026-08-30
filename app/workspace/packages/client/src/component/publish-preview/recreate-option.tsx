import { IAnnotationConfig } from '@fable/common/dist/types';
import { Modal } from 'antd';
import React, { useState } from 'react';
import QuillyLoader from '../loader/quilly-loader';
import { P_RespSubscription } from '../../entity-processor';
import { amplitudeRecreateDemoUsingQuilly } from '../../amplitude';
import Button from '../button';

const { confirm } = Modal;

interface Props {
  recreateUsingAI:(
      updateLoading:(step: string)=>void
  )=>void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  subs: P_RespSubscription | null;
}

function RecreateUsingAI(props: Props): JSX.Element {
  const [showLoader, setShowLoader] = useState(false);
  const [showError, setShowError] = useState(false);

  const isRecreateUsingAISupported = (): boolean => {
    for (const [_, anns] of Object.entries(props.annotationsForScreens)) {
      for (const ann of anns) {
        if (ann.markedImage) {
          return true;
        }
      }
    }
    return false;
  };

  const getDemoLength = (): number => {
    let demoLen = 0;
    for (const [_, anns] of Object.entries(props.annotationsForScreens)) {
      demoLen += anns.length;
    }
    return demoLen;
  };

  const updateStep = (step:string): void => {
    if (step === 'Loaded') {
      setShowLoader(false);
      amplitudeRecreateDemoUsingQuilly('demo-recreated');
    }
    if (step === 'Error') {
      setShowLoader(false);
      setShowError(true);
      amplitudeRecreateDemoUsingQuilly('demo-recreate-error');
    }
  };

  return (
    <div>
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => {
          amplitudeRecreateDemoUsingQuilly('demo-recreate-clicked');
          const recreateUsingAISupported = isRecreateUsingAISupported();
          if (recreateUsingAISupported) {
            const demoLength = getDemoLength();
            const isAiCreditsAvailable = props.subs && props.subs.availableCredits - (demoLength * 10) > 0;

            if (!isAiCreditsAvailable) {
              amplitudeRecreateDemoUsingQuilly('demo-recreate-insufficient-credit');
              confirm({
                title: 'Insufficient credits available to create demo using AI',
                cancelButtonProps: { style: { display: 'none' } }
              });
            } else {
              confirm({
                title: 'Do you want to continue?',
                content: (
                  <div className="typ-sm" style={{ textAlign: 'left' }}>
                    <div>
                      This operation will discard any edits that you have made on the demo and recreate the demo from scratch.
                    </div>
                    <br />
                    <div className="err-line">This operation is irreversible</div>
                  </div>
                ),
                onOk() {
                  props.recreateUsingAI(updateStep);
                  setShowLoader(true);
                },
              });
            }
          } else {
            confirm({
              title: (
                <div style={{ textAlign: 'left' }}>
                  Recreation is not supported for this demo
                </div>
              ),
              content: (
                <>
                  <div className="typ-reg" style={{ textAlign: 'left' }}>
                    Quilly can't recreate this demo from scratch for compatibility reasons.
                  </div>
                  <div className="typ-reg" style={{ textAlign: 'left' }}>
                    If you need any help with the demo, please use the in app chat to contact support.
                  </div>
                </>
              ),
              cancelButtonProps: { style: { display: 'none' } }
            });
          }
        }}
      >
        <span>Recreate demo using Quilly</span>
        <span
          className="typ-sm"
          style={{
            display: 'block'
          }}
        >Any edits to the demo will be lost
        </span>
      </div>
      <Modal
        open={showLoader && !showError}
        footer={null}
        closable={false}
      >
        <QuillyLoader />
      </Modal>
      <Modal
        open={showError}
        cancelButtonProps={{ style: { display: 'none' } }}
        closeIcon={null}
        afterOpenChange={() => { setShowLoader(false); }}
        footer={
          <div style={{ justifyContent: 'center', display: 'flex' }}>
            <Button onClick={() => {
              setShowError(false);
            }}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="typ-reg">
          Something went wrong while Quilly was recreating the demo. This issue might be ephemeral. Please try again after sometime.
          <br />
          <br />
          If you have any concerns, please reach out to our support via our in app chat.
        </div>
      </Modal>
    </div>
  );
}
export default RecreateUsingAI;
