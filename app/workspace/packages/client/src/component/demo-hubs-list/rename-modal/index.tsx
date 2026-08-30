import React, { Dispatch, SetStateAction, useState } from 'react';
import * as GTags from '../../../common-styled';
import * as Tags from '../styled';
import { ModalState } from '../types';
import Input from '../../input';
import Button from '../../button';
import { AMPLITUDE_EVENTS } from '../../../amplitude/events';
import { sendAmplitudeDemoHubDataEvent } from '../../../amplitude';
import { RenameDemoHubResult } from '../../../action/creator';

interface Props {
  renameDemoHub: (newName: string) => Promise<RenameDemoHubResult>;
  changeModalState: Dispatch<SetStateAction<ModalState>>;
  demoName: string;
  modalState: ModalState;
}

function RenameModal(props : Props) : JSX.Element {
  const [name, setName] = useState<string>(props.demoName);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleEmptyName() : void {
    setErrorMsg('Demo hub name needs to be a valid name');
  }
  function handleLongName() : void {
    setErrorMsg(
      'Demo hub name needs to be a valid name. A valid name would contain more than 1 char and less than 200 char'
    );
  }
  async function handleRenameForm() : Promise<void> {
    if (name === '') {
      handleEmptyName();
      return;
    }
    if (name.length > 200) {
      handleLongName();
      return;
    }
    const res = await props.renameDemoHub(name);
    sendAmplitudeDemoHubDataEvent({
      type: AMPLITUDE_EVENTS.RENAME_DEMO_HUB,
      payload: {
        value: res.oldValue.name,
        demo_hub_rid: res.oldValue.rid,
        new_value: res.newValue.name,
        new_demo_hub_rid: res.newValue.rid,
      }
    });
    setErrorMsg(null);
    props.changeModalState({ show: false, type: '' });
    setName('');
  }
  return (
    <GTags.BorderedModal
      open={props.modalState.show}
      style={{ padding: '0' }}
      onCancel={() => {
        setName('');
        props.changeModalState({ show: false, type: '' });
      }}
      footer={(
        <div className="button-two-col-cont">
          <Button
            type="button"
            intent="secondary"
            onClick={
              () => {
                setName('');
                props.changeModalState({ show: false, type: '' });
              }
            }
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            style={{ flex: 1 }}
            onClick={
              () => {
                handleRenameForm();
              }
            }
          >
            Save
          </Button>
        </div>
      )}
    >

      <div className="modal-content-cont">
        <div className="modal-title">Rename demo hub</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenameForm();
          }}
          style={{ paddingTop: '1rem' }}
        >
          <Input
            label="Rename demo hub"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </form>
        {errorMsg && <Tags.ErrorMsg>{errorMsg}</Tags.ErrorMsg>}
      </div>
    </GTags.BorderedModal>
  );
}

export default RenameModal;
