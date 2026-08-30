import React, { useState } from 'react';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import Button from '../button';
import Input from '../input';
import { TableColumn } from '../../types';
import { isValidStrWithAlphaNumericValues } from '../../utils';
import TextArea from '../text-area';

interface Props {
  type: 'Rename' | 'Create';
  showModal: boolean;
  closeModal: () => void;
  onSave: (newName: string, newDesc: string) => void;
  initialName: string;
  initialDesc: string;
  columns: TableColumn[];
  specialColumnNames: string[];
}

type ColNameErrorType = 'already_used_name' | 'invalid_name' | 'special_col_name';

function RenameCreateColModal(props: Props): JSX.Element {
  const [nameInput, setNameInput] = useState(props.initialName);
  const [descInput, setDescInput] = useState(props.initialDesc);
  const [errorStatus, setErrorStatus] = useState<null | ColNameErrorType>(null);

  const onSave = (): void => {
    const res = validateColumnName(nameInput);
    if (res !== 'valid_name') {
      setErrorStatus(res);
      return;
    }
    setErrorStatus(null);
    props.onSave(nameInput, descInput);
    props.closeModal();
  };

  const validateColumnName = (name: string): 'valid_name' | ColNameErrorType => {
    const isNameValid = isValidStrWithAlphaNumericValues(name);
    if (!isNameValid) return 'invalid_name';

    const isAlreadyNameUsed = props.columns
      .find(ds => ((ds.name.toLowerCase() === name.toLowerCase()) && (ds.name !== props.initialName)));
    if (isAlreadyNameUsed) return 'already_used_name';

    const isSpecialColNameUsed = props.specialColumnNames
      .map(str => str.toLowerCase())
      .includes(name.toLowerCase());
    if (isSpecialColNameUsed) return 'special_col_name';

    return 'valid_name';
  };

  return (
    <>
      <GTags.BorderedModal
        donotShowHeaderStip
        containerBg="#f5f5f5"
        style={{ height: '10px' }}
        open={props.showModal}
        onCancel={props.closeModal}
        onOk={onSave}
        footer={(
          <div className="button-two-col-cont">
            <Button
              type="button"
              intent="secondary"
              onClick={props.closeModal}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              style={{ flex: 1 }}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
            )}
      >
        <div className="modal-content-cont">

          <div className="typ-h2">{props.type} column</div>
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              style={{
                marginTop: '0.5rem',
                paddingTop: '1rem',
                gap: '1rem',
                flexDirection: 'column',
                display: 'flex'
              }}
            >
              <Input
                label="Column name"
                value={nameInput}
                onChange={(e) => {
                  setErrorStatus(null);
                  setNameInput(e.target.value);
                }}
              />
              <TextArea
                label="Enter description for this column"
                value={descInput}
                onChange={(e) => {
                  setDescInput(e.target.value);
                }}
              />
              {errorStatus && (
              <Tags.ErrorMsg className="error-msg">
                {errorStatus === 'already_used_name' && 'Duplicate name. Please use another name'}
                {errorStatus === 'invalid_name' && 'Invalid name. Only use [a-ZA-Z0-9_]'}
                {errorStatus === 'special_col_name' && 'This is a special column name. Please use another name'}
              </Tags.ErrorMsg>
              )}
            </form>
          </div>
        </div>
      </GTags.BorderedModal>
    </>
  );
}

export default RenameCreateColModal;
