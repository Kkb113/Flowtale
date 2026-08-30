import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Cta from '../../cta';
import { buttonSecStyle } from '../../../screen-editor/annotation-creator-panel';
import { IDemoHubConfigCta } from '../../../../types';
import { useEditorCtx } from '../../ctx';
import CtaEditor from './cta-editor';
import { showDeleteConfirm } from '../../delete-confirm';

interface Props {
  cta: IDemoHubConfigCta;
  deleteCtaHandler: (id: string) => void;
  showEditOption: boolean;
  deletable: boolean;
}

export default function CtaWrapper(props: Props): JSX.Element {
  const { onConfigChange } = useEditorCtx();
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className={`grooveable ${showEditor ? 'opened' : 'closed'}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        className="grooveable-header"
        id="cta-wrapper"
      >
        <Cta
          cta={props.cta}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {props.deletable && (
            <Tooltip title="Delete button" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => showDeleteConfirm(
                  () => props.deleteCtaHandler(props.cta.id),
                  'Are you sure you want to delete this CTA?',
                )}
              />
            </Tooltip>
          )}

          {props.showEditOption && (
            <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<EditOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => {
                  setShowEditor(prevState => !prevState);
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>
      {showEditor && <CtaEditor cta={props.cta} />}
    </div>
  );
}
