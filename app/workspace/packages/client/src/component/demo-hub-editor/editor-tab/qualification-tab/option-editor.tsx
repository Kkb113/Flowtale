import React, { useState } from 'react';
import { DraggableProvided, DropResult } from 'react-beautiful-dnd';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import {
  IDemoHubConfigDemo,
  IDemoHubConfigQualification,
  LeadFormEntry,
  SelectEntry,
  SelectEntryOption,
  TextEntry
} from '../../../../types';
import TextArea from '../../../text-area';
import { useEditorCtx } from '../../ctx';
import * as Tags from '../../styled';
import { InputText } from '../../../screen-editor/styled';
import { showDeleteConfirm } from '../../delete-confirm';
import { rearrangeArray } from '../../../../utils';
import { buttonSecStyle } from '../../../screen-editor/annotation-creator-panel';
import DraggableDemosSelector from '../../components';
import { amplitudeQualStepEdit, amplitudeQualStepOptionEdit } from '../../../../amplitude';
import { AMPLITUDE_STEP_TYPE } from '../../../../amplitude/types';

interface Props {
  entry: SelectEntry | LeadFormEntry | TextEntry;
  qualification: IDemoHubConfigQualification;
  option: SelectEntryOption;
  providedInner: DraggableProvided;
  updateOptionTitle: (title: string) => void;
  updateOptionDesc: (desc: string) => void;
  addDemoInEntryOption: (demo: IDemoHubConfigDemo) => void;
  updateDemoInEntryOption: (demo: IDemoHubConfigDemo) => void;
  deleteDemoInEntryOption: (demoRid: string) => void;
  deleteEntryOption: () => void;
}

export default function OptionEditor(props: Props): JSX.Element {
  const [showEditor, setShowEditor] = useState(false);
  const { onConfigChange } = useEditorCtx();

  const rearrangeOptionDemos = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(props.option.demos, r.source.index, r.destination.index);

    onConfigChange(c => ({
      ...c,
      qualification_page: {
        ...c.qualification_page,
        qualifications: c.qualification_page.qualifications.map(q => {
          if (q.id === props.qualification.id) {
            const newEntries = q.entries.map(e => {
              if (e.id === props.entry.id) {
                const newOptions = (e as SelectEntry).options.map(o => {
                  if (o.id === props.option.id) {
                    return { ...o, demos: rearrangedArray };
                  }
                  return o;
                });
                return { ...e, options: newOptions };
              }
              return e;
            });
            return { ...q, entries: newEntries };
          }
          return q;
        })
      }
    }));
  };

  return (
    <div
      {...props.providedInner.draggableProps}
      ref={props.providedInner.innerRef}
      className={`grooveable ${showEditor ? 'opened' : 'closed'}`}
    >
      <div
        key={props.option.id}
        style={{ margin: '0.5rem 0' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip
            placement="left"
            title={<span>Drag to reorder.</span>}
            overlayStyle={{ fontSize: '0.75rem' }}
          >
            <Button
              type="text"
              size="small"
              icon={<HolderOutlined
                style={{
                  opacity: '0.65',
                  fontSize: '14px',
                }}
              />}
              {...props.providedInner.dragHandleProps}
            />
          </Tooltip>
          <div
            key={props.option.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <div style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '160px'
            }}
            >
              {props.option.title}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Button
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => {
                  showDeleteConfirm(
                    () => {
                      amplitudeQualStepEdit({
                        step_id: props.entry.id,
                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                        qualification_step_prop: 'option_delete',
                        qualification_step_value: props.option.id
                      });
                      props.deleteEntryOption();
                    },
                    'Are you sure you want to delete this option?',
                  );
                }}
              />
              <Button
                icon={<EditOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => {
                  amplitudeQualStepEdit({
                    step_id: props.entry.id,
                    step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                    qualification_step_prop: 'option_edit',
                    qualification_step_value: props.option.id
                  });
                  setShowEditor(prevState => !prevState);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showEditor && (
        <>
          <div style={{ padding: '0.5rem 0.5rem 0' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <Tags.InputTextCon>
                <div className="typ-sm">Title</div>
                <InputText
                  type="text"
                  value={props.option.title}
                  onBlur={(e) => {
                    amplitudeQualStepOptionEdit({
                      step_id: props.entry.id,
                      option_id: props.option.id,
                      step_option_prop: 'title',
                      step_option_value: e.target.value
                    });
                  }}
                  onChange={(e) => props.updateOptionTitle(e.target.value)}
                  style={{ height: '44px', width: '100%' }}
                />
              </Tags.InputTextCon>

              <Tags.InputTextCon>
                <div className="typ-sm">Description</div>
                <TextArea
                  label=""
                  value={props.option.desc}
                  onBlur={(e) => {
                    amplitudeQualStepOptionEdit({
                      step_id: props.entry.id,
                      option_id: props.option.id,
                      step_option_prop: 'description',
                      step_option_value: e.target.value
                    });
                  }}
                  onChange={(e) => props.updateOptionDesc(e.target.value)}
                />
              </Tags.InputTextCon>
            </div>

            <DraggableDemosSelector
              amplitudeDemoReload={(demoRid : string) => {
                amplitudeQualStepOptionEdit({
                  step_id: props.entry.id,
                  option_id: props.option.id,
                  step_option_prop: 'demo_reload',
                  step_option_value: demoRid
                });
              }}
              selectedDemos={props.option.demos}
              addDemoFn={props.addDemoInEntryOption}
              updateDemoFn={props.updateDemoInEntryOption}
              rearrangeFn={rearrangeOptionDemos}
              deleteDemoFn={props.deleteDemoInEntryOption}
              selectDesc="Select demos to show when your buyers choose this option"
              emptyStateMsg="There are no demos for this option. Please use the above dropdown to select which demos to show when your buyer select this option."
            />
          </div>
        </>
      )}
    </div>
  );
}
