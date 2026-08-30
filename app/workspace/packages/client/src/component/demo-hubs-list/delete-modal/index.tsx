import React, { Dispatch, SetStateAction } from 'react';
import * as GTags from '../../../common-styled';
import * as Tags from './styled';
import { ModalState } from '../types';
import Button from '../../button';
import { sendAmplitudeDemoHubDataEvent } from '../../../amplitude';
import { AMPLITUDE_EVENTS } from '../../../amplitude/events';

interface Props {
    deleteDemoHub: (demoHubRid: string) => void;
    changeModalState : Dispatch<SetStateAction<ModalState>>
    demoHubRid : string
    modalState : ModalState
}

function DeleteModal(props : Props) : JSX.Element {
  return (
    <GTags.BorderedModal
      open={props.modalState.show}
      onOk={() => {
        props.deleteDemoHub(props.demoHubRid);
        props.changeModalState({ show: false, type: '' });
      }}
      onCancel={() => {
        props.changeModalState({ show: false, type: '' });
      }}
      style={{ padding: '0' }}
      footer={(
        <div className="button-two-col-cont">
          <Button
            type="button"
            intent="secondary"
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
            style={{ flex: 1, fontSize: '14px' }}
            onClick={
              () => {
                props.deleteDemoHub(props.demoHubRid);
                sendAmplitudeDemoHubDataEvent({
                  type: AMPLITUDE_EVENTS.DELETE_DEMO_HUB,
                  payload: { demo_hub_rid: props.demoHubRid }
                });
                props.changeModalState({ show: false, type: '' });
              }
            }
          >
            Delete
          </Button>
        </div>
      )}
    >
      <div className="modal-content-cont">
        <Tags.TextCenter className="typ-h1">
          Are you sure you want to delete this demo hub?
        </Tags.TextCenter>
      </div>
    </GTags.BorderedModal>
  );
}

export default DeleteModal;
