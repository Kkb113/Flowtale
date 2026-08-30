import React, { useEffect, useRef, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { P_Dataset } from '../../entity-processor';
import Button from '../../component/button';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import TextArea from '../../component/text-area';

interface Props {
  dataset: P_Dataset;
  onPublish: (datasetName: string) => void;
  updateDatasetDesc: (name: string, description: string) => Promise<P_Dataset>;
}

function DatasetInfoEditor(props: Props): JSX.Element {
  const [showUpdateDescModal, setShowUpdateDescModal] = useState(false);
  const descInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isUpdatingDesc, setIsUpdatingDesc] = useState(false);

  const closeShowUpdateDescModal = (): void => setShowUpdateDescModal(false);

  const updateDesc = async (): Promise<void> => {
    setIsUpdatingDesc(true);
    const newDescription = descInputRef.current!.value.trim().replace(/\s+/, ' ');
    await props.updateDatasetDesc(props.dataset.name, newDescription);
    closeShowUpdateDescModal();
    setIsUpdatingDesc(false);
  };

  useEffect(() => {
    if (descInputRef.current) {
      descInputRef.current.value = props.dataset.description || '';
    }
  }, [props.dataset.description]);

  return (
    <>
      <Tags.DatasetInfoEditorCon>
        <div>
          <div className="overflow-ellipsis typ-reg" style={{ fontWeight: 500 }}> {props.dataset.name}</div>
          <div className="overflow-ellipsis typ-sm"> {props.dataset.description}</div>
        </div>
        <div style={{ transform: 'scale(0.85)', display: 'flex', gap: '0.25rem' }}>
          <Button
            icon={<EditOutlined />}
            intent="link"
            onClick={() => setShowUpdateDescModal(true)}
            size="small"
          />
          <Button
            size="small"
            onClick={() => props.onPublish(props.dataset.name)}
          >
            Publish
          </Button>
        </div>
      </Tags.DatasetInfoEditorCon>
      <GTags.BorderedModal
        donotShowHeaderStip
        containerBg="#f5f5f5"
        style={{ height: '10px' }}
        open={showUpdateDescModal}
        onOk={updateDesc}
        onCancel={closeShowUpdateDescModal}
        footer={(
          <div className="button-two-col-cont">
            <Button
              type="button"
              intent="secondary"
              onClick={closeShowUpdateDescModal}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              style={{ flex: 1 }}
              onClick={updateDesc}
              disabled={isUpdatingDesc}
            >
              {isUpdatingDesc ? 'Saving' : 'Save'}
            </Button>
          </div>
            )}
      >
        <div className="modal-content-cont">
          <div className="typ-h2">Update description</div>
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateDesc();
              }}
              style={{
                marginTop: '0.5rem',
                paddingTop: '1rem',
                gap: '1rem',
                flexDirection: 'column',
                display: 'flex'
              }}
            >
              <TextArea
                label="Enter description for this dataset"
                innerRef={descInputRef}
                defaultValue={props.dataset.description}
              />
            </form>
          </div>
        </div>
      </GTags.BorderedModal>
    </>
  );
}

export default DatasetInfoEditor;
