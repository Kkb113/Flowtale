import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
import { Alert } from 'antd';
import * as GTags from '../../../common-styled';
import * as Tags from './styled';
import { ModalState } from '../types';
import Button from '../../button';
import { sendAmplitudeDemoHubDataEvent } from '../../../amplitude';
import { AMPLITUDE_EVENTS } from '../../../amplitude/events';

interface Props {
    deleteDemoHub: (demoHubRid: string) => Promise<void>;
    changeModalState : Dispatch<SetStateAction<ModalState>>
    demoHubRid : string
    modalState : ModalState
}

function DeleteModal(props : Props) : JSX.Element {
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const remove = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await props.deleteDemoHub(props.demoHubRid);
      try {
        sendAmplitudeDemoHubDataEvent({
          type: AMPLITUDE_EVENTS.DELETE_DEMO_HUB,
          payload: { demo_hub_rid: props.demoHubRid }
        });
      } catch { /* Analytics must not turn a confirmed deletion into a failure. */ }
      props.changeModalState({ show: false, type: '' });
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <GTags.BorderedModal
      open={props.modalState.show}
      onOk={remove}
      closable={!saving}
      maskClosable={!saving}
      keyboard={!saving}
      onCancel={() => {
        if (!pending.current) props.changeModalState({ show: false, type: '' });
      }}
      style={{ padding: '0' }}
      footer={(
        <div className="button-two-col-cont">
          <Button
            type="button"
            intent="secondary"
            disabled={saving}
            onClick={
              () => {
                props.changeModalState({ show: false, type: '' });
              }
            }
            style={{ flex: 1, fontSize: '14px' }}
          >
            Cancel
          </Button>
          <Button
            bgColor="#d64d4d"
            disabled={saving}
            style={{ flex: 1, fontSize: '14px' }}
            onClick={remove}
          >
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      )}
    >
      <div className="modal-content-cont">
        {error && <Alert
          type="error"
          showIcon
          message="Deletion could not be confirmed. Retry or refresh to check the current status."
        />}
        <Tags.TextCenter className="typ-h1">
          Are you sure you want to delete this demo hub?
        </Tags.TextCenter>
      </div>
    </GTags.BorderedModal>
  );
}

export default DeleteModal;
