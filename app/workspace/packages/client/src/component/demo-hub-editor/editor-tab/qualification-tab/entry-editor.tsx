/* eslint-disable react/no-unused-prop-types */
import React, { useEffect, useState } from 'react';
import { DragDropContext, Draggable, DraggableProvided, Droppable, DropResult } from 'react-beautiful-dnd';
import { Button, Collapse, Popover, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { CollapsibleType } from 'antd/es/collapse/CollapsePanel';
import {
  DemoHubConfigCtaType,
  DemoHubConfigCtaTypeType,
  IDemoHubConfigDemo,
  IDemoHubConfigQualification,
  LeadFormEntry,
  SelectEntry,
  SimpleStyle,
  TextEntry
} from '../../../../types';
import { getEntryTypeTitle } from '../../utils';
import Input from '../../../input';
import TextArea from '../../../text-area';
import SimpleStyleEditor from '../../simple-styles-editor';
import * as GTags from '../../../../common-styled';
import CaretOutlined from '../../../icons/caret-outlined';
import OptionEditor from './option-editor';
import { useEditorCtx } from '../../ctx';
import * as Tags from '../../styled';
import { InputText } from '../../../screen-editor/styled';
import { buttonSecStyle } from '../../../screen-editor/annotation-creator-panel';
import { showDeleteConfirm } from '../../delete-confirm';
import { amplitudeDemoQualEdit, amplitudeQualStepEdit } from '../../../../amplitude';
import { AMPLITUDE_STEP_TYPE } from '../../../../amplitude/types';

interface Props {
  entry: SelectEntry | LeadFormEntry | TextEntry;
  qualification: IDemoHubConfigQualification;
  providedInner: DraggableProvided;
  deleteEntry: (entryId: string) => void;
  updateEntryStyles: <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;
  updateEntryTitle: (title: string) => void;
  updateEntryDesc: (desc: string) => void;
  updateEntryShowSkipCta: (showSkipCta: boolean) => void;

  updateEntryContinueCtaText: (text: string) => void;
  updateEntryContinueCtaIconPlacement: (iconPlacement: 'left' | 'right') => void;
  updateEntryContinueCtaType: (type: DemoHubConfigCtaTypeType) => void;
  updateEntryContinueCtaStyles: <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;

  updateEntrySkipCtaText: (text: string) => void;
  updateEntrySkipCtaIconPlacement: (iconPlacement: 'left' | 'right') => void;
  updateEntrySkipCtaType: (type: DemoHubConfigCtaTypeType) => void;
  updateEntrySkipCtaStyles: <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;

  addSelectEntryOption: () => void;
  rearrangeOptionsInEntry: (r: DropResult) => void;
  updateOptionTitle: (optionId: string) => (title: string) => void;
  updateOptionDesc: (optionId: string) => (desc: string) => void;
  addDemoInEntryOption: (optionId: string) => (demo: IDemoHubConfigDemo) => void;
  updateDemoInEntryOption : (optionId: string) => (demo: IDemoHubConfigDemo) => void;
  deleteDemoInEntryOption: (optionId: string) => (demoRid: string) => void;
  deleteEntryOption: (optionId: string) => void;

  activeEntryId: string;
  setActiveEntryId: (id: string) => void;

  amplitudeEntryStyles : <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;
  amplitudeContinueCtaStyles : <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;
  amplitudeSkipCtaStyles : <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;
}

export default function EntryEditor(props: Props): JSX.Element {
  const { config, onConfigChange, setPreviewUrl, data } = useEditorCtx();
  const showEditor = props.entry.id === props.activeEntryId;

  const setShowEditor = (show: boolean): void => {
    if (show) {
      props.setActiveEntryId(props.entry.id);
    } else {
      props.setActiveEntryId('');
    }
  };

  useEffect(() => {
    if (props.entry.id === props.activeEntryId) {
      setPreviewUrl(`q/${data.rid}/${props.qualification.slug}/s/${props.entry.slug}?lp=true`);
    }
  }, [props.activeEntryId, props.qualification, data, setPreviewUrl, props.entry]);

  return (
    <div
      className={`grooveable expand ${showEditor ? 'opened' : 'closed'}`}
      key={props.entry.id}
      {...props.providedInner.draggableProps}
      ref={props.providedInner.innerRef}
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
          key={props.entry.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            transform: 'translate(0px, 6px)'
          }}
          >
            <span
              style={{
                lineHeight: '1.25'
              }}
            >
              {props.entry.title}
            </span>
            <span
              className="typ-sm"
              style={{
                fontSize: '10px',
                transform: 'translate(0px, -2px)'
              }}
            >{props.entry.type}
            </span>
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
                  () => props.deleteEntry(props.entry.id),
                  'Are you sure you want to delete this step?',
                );
              }}
            />
            <Button
              icon={<EditOutlined />}
              type="text"
              size="small"
              style={buttonSecStyle}
              onClick={() => {
                amplitudeDemoQualEdit({
                  qualification_id: props.qualification.id,
                  demo_qualification_prop: 'step_edit',
                  demo_qualification_value: props.entry.id
                });
                setShowEditor(!showEditor);
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ margin: '0.5rem 0 0.5rem 8px' }}>

        {
        showEditor && (
          <>
            <Collapse
              items={
              [{
                key: 'General',
                label: 'General',
                children: (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        margin: '1rem 0'
                      }}
                    >
                      <Tags.InputTextCon>
                        <div className="typ-sm">Title</div>
                        <InputText
                          type="text"
                          value={props.entry.title}
                          onBlur={(e) => {
                            amplitudeQualStepEdit({
                              step_id: props.entry.id,
                              step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                              qualification_step_prop: 'general_title',
                              qualification_step_value: e.target.value
                            });
                          }}
                          onChange={e => {
                            props.updateEntryTitle(e.target.value);
                          }}
                          style={{ height: '44px', width: '100%' }}
                        />
                      </Tags.InputTextCon>

                      <Tags.InputTextCon>
                        <div className="typ-sm">Description</div>
                        <TextArea
                          label=""
                          value={props.entry.desc}
                          onBlur={(e) => {
                            amplitudeQualStepEdit({
                              step_id: props.entry.id,
                              step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                              qualification_step_prop: 'general_description',
                              qualification_step_value: e.target.value
                            });
                          }}
                          onChange={e => props.updateEntryDesc(e.target.value)}
                        />
                      </Tags.InputTextCon>

                      <SimpleStyleEditor
                        simpleStyle={props.entry.style}
                        simpleStyleUpdateFn={props.updateEntryStyles}
                        borderColorTitle="Accent color"
                        amplitudeStyleEvent={props.amplitudeEntryStyles}
                      />
                    </div>
                  </>
                )
              },
              {
                key: 'CTAs',
                label: 'CTAs',
                children: (
                  <Tags.QfcnStepsCollapseCon>
                    <Collapse
                      items={[
                        {
                          key: '1',
                          label: 'Configure Continue CTA',
                          children: (
                            <>
                              <p className="typ-sm">
                                This call-to-action is displayed after the buyer has provided a response to the question
                              </p>
                              <div
                                key={1}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1rem',
                                  margin: '1rem 0',
                                }}
                              >
                                <Tags.InputTextCon>
                                  <div className="typ-sm">Text</div>
                                  <InputText
                                    type="text"
                                    value={props.entry.continueCTA.text}
                                    onBlur={(e) => {
                                      amplitudeQualStepEdit({
                                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                        step_id: props.entry.id,
                                        qualification_step_prop: 'continue_cta_text',
                                        qualification_step_value: e.target.value
                                      });
                                    }}
                                    onChange={(e) => props.updateEntryContinueCtaText(e.target.value)}
                                    style={{ height: '44px', width: '100%' }}
                                  />
                                </Tags.InputTextCon>

                                <Tags.InputTextCon>
                                  <div className="typ-sm">Icon placement</div>
                                  <GTags.OurRadio.Group
                                    onChange={(e) => {
                                      amplitudeQualStepEdit({
                                        step_id: props.entry.id,
                                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                        qualification_step_prop: 'continue_cta_placement',
                                        qualification_step_value: e.target.value
                                      });
                                      props.updateEntryContinueCtaIconPlacement(e.target.value);
                                    }}
                                    value={props.entry.continueCTA.iconPlacement}
                                  >
                                    <GTags.OurRadio value="left">Left</GTags.OurRadio>
                                    <GTags.OurRadio value="right">Right</GTags.OurRadio>
                                  </GTags.OurRadio.Group>
                                </Tags.InputTextCon>

                                <Tags.InputTextCon>
                                  <div className="typ-sm">Button type</div>

                                  <GTags.FableSelect
                                    className="typ-ip"
                                    defaultValue={props.entry.continueCTA.type}
                                    placeholder="Select CTA type"
                                    bordered={false}
                                    options={DemoHubConfigCtaType.map(v => ({
                                      value: v,
                                      label: v.charAt(0).toUpperCase() + v.slice(1),
                                    }))}
                                    onChange={(e) => {
                                      if (e) {
                                        amplitudeQualStepEdit({
                                          step_id: props.entry.id,
                                          step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                          qualification_step_prop: 'continue_cta_btn_type',
                                          qualification_step_value: e as string
                                        });
                                        props.updateEntryContinueCtaType(e as DemoHubConfigCtaTypeType);
                                      }
                                    }}
                                    suffixIcon={<CaretOutlined dir="down" />}
                                    style={{ height: '48px' }}
                                  />
                                </Tags.InputTextCon>

                                <SimpleStyleEditor
                                  simpleStyle={props.entry.continueCTA.style}
                                  simpleStyleUpdateFn={props.updateEntryContinueCtaStyles}
                                  amplitudeStyleEvent={props.amplitudeContinueCtaStyles}
                                />
                              </div>
                            </>
                          )
                        },
                        {
                          key: '2',
                          label: 'Configure Skip CTA',
                          children: (
                            <>
                              <p className="typ-sm">
                                This configuration will allow you to provide the buyer with an option to skip the step
                              </p>
                              <div
                                key={1}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1rem',
                                  margin: '1rem 0',
                                }}
                              >

                                <Tags.InputTextCon>
                                  <div className="typ-sm">Text</div>
                                  <InputText
                                    type="text"
                                    value={props.entry.skipCTA.text}
                                    onBlur={(e) => {
                                      amplitudeQualStepEdit({
                                        step_id: props.entry.id,
                                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                        qualification_step_prop: 'skip_cta_text',
                                        qualification_step_value: e.target.value
                                      });
                                    }}
                                    onChange={(e) => props.updateEntrySkipCtaText(e.target.value)}
                                    style={{ height: '44px', width: '100%' }}
                                  />
                                </Tags.InputTextCon>

                                <Tags.InputTextCon>
                                  <div className="typ-sm">Icon placement</div>
                                  <GTags.OurRadio.Group
                                    onChange={(e) => {
                                      amplitudeQualStepEdit({
                                        step_id: props.entry.id,
                                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                        qualification_step_prop: 'skip_cta_placement',
                                        qualification_step_value: e.target.value as string
                                      });
                                      props.updateEntrySkipCtaIconPlacement(e.target.value);
                                    }}
                                    value={props.entry.skipCTA.iconPlacement}
                                  >
                                    <GTags.OurRadio value="left">Left</GTags.OurRadio>
                                    <GTags.OurRadio value="right">Right</GTags.OurRadio>
                                  </GTags.OurRadio.Group>
                                </Tags.InputTextCon>

                                <Tags.InputTextCon>
                                  <div className="typ-sm">CTA type</div>
                                  <GTags.FableSelect
                                    className="typ-ip"
                                    defaultValue={props.entry.skipCTA.type}
                                    placeholder="Select CTA type"
                                    bordered={false}
                                    options={DemoHubConfigCtaType.map(v => ({
                                      value: v,
                                      label: v.charAt(0).toUpperCase() + v.slice(1),
                                    }))}
                                    onChange={(e) => {
                                      if (e) {
                                        amplitudeQualStepEdit({
                                          step_id: props.entry.id,
                                          step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                          qualification_step_prop: 'skip_cta_btn_type',
                                          qualification_step_value: e as string
                                        });
                                        props.updateEntrySkipCtaType(e as DemoHubConfigCtaTypeType);
                                      }
                                    }}
                                    suffixIcon={<CaretOutlined dir="down" />}
                                    style={{ height: '48px' }}
                                  />
                                </Tags.InputTextCon>

                                <SimpleStyleEditor
                                  simpleStyle={props.entry.skipCTA.style}
                                  simpleStyleUpdateFn={props.updateEntrySkipCtaStyles}
                                  amplitudeStyleEvent={props.amplitudeSkipCtaStyles}
                                />
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center',
                                  }}
                                >
                                  <GTags.OurCheckbox
                                    checked={props.entry.showSkipCta}
                                    onChange={e => {
                                      amplitudeQualStepEdit({
                                        step_id: props.entry.id,
                                        step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                                        qualification_step_prop: 'skip_cta_show',
                                        qualification_step_value: e.target.checked
                                      });
                                      props.updateEntryShowSkipCta(e.target.checked);
                                    }}
                                  />
                                  <div>Show Skip CTA</div>
                                </div>
                              </div>
                            </>
                          )
                        }
                      ]}
                    />

                  </Tags.QfcnStepsCollapseCon>
                )
              },
              {
                key: 'Options',
                label: 'Options',
                children: (
                  <>
                    {(props.entry.type === 'single-select' || props.entry.type === 'multi-select') && (
                    <>

                      <DragDropContext
                        onDragEnd={props.rearrangeOptionsInEntry}
                      >
                        <Droppable droppableId="droppable">
                          {(provided, snapshot) => (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {(props.entry as SelectEntry).options.map((option, index) => (
                                <Draggable
                                  key={option.id}
                                  draggableId={option.id + index}
                                  index={index}
                                >
                                  {(providedInner, snapshotInner) => (
                                    <OptionEditor
                                      entry={props.entry}
                                      qualification={props.qualification}
                                      deleteEntryOption={() => props.deleteEntryOption(option.id)}
                                      deleteDemoInEntryOption={props.deleteDemoInEntryOption(option.id)}
                                      addDemoInEntryOption={props.addDemoInEntryOption(option.id)}
                                      updateDemoInEntryOption={props.updateDemoInEntryOption(option.id)}
                                      updateOptionTitle={props.updateOptionTitle(option.id)}
                                      updateOptionDesc={props.updateOptionDesc(option.id)}
                                      option={option}
                                      providedInner={providedInner}
                                    />
                                  )}
                                </Draggable>
                              ))}

                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>

                      <GTags.OurLink
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          width: 'fit-content',
                          marginTop: '1rem',
                        }}
                        onClick={() => {
                          amplitudeQualStepEdit({
                            step_id: props.entry.id,
                            step_type: AMPLITUDE_STEP_TYPE[props.entry.type],
                            qualification_step_prop: 'option_add',
                            qualification_step_value: true
                          });
                          props.addSelectEntryOption();
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<PlusOutlined
                            style={{
                              opacity: '0.65',
                              fontSize: '14px',
                            }}
                          />}
                        />
                        <div>
                          Add a new option
                        </div>
                      </GTags.OurLink>
                    </>
                    )}
                  </>
                )
              },
              ].filter(item => {
                if (item.key === 'Options') {
                  if ((props.entry.type === 'single-select' || props.entry.type === 'multi-select')) {
                    return true;
                  }
                  return false;
                }
                return true;
              })
          }
            />
          </>
        )
      }
      </div>

    </div>
  );
}

interface PanelProps {
  isActive?: boolean;
  header?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showArrow?: boolean;
  forceRender?: boolean;
  /** @deprecated Use `collapsible="disabled"` instead */
  disabled?: boolean;
  extra?: React.ReactNode;
  collapsible?: CollapsibleType;
}

function CollapseExpandIcon(props: PanelProps): JSX.Element {
  return (
    <div style={{
      // transform: 'translateY(10px)'
    }}
    >
      <CaretOutlined dir={props.isActive ? 'up' : 'down'} />
    </div>
  );
}
