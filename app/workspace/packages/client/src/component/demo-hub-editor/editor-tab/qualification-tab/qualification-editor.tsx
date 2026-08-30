/* eslint-disable react/no-unused-prop-types */
import React, { useEffect, useState } from 'react';
import { Button, Collapse, Popover, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import CustomBtn from '../../../button';
import { DemoHubConfigCtaTypeType, IDemoHubConfig, IDemoHubConfigDemo, IDemoHubConfigQualification, SelectEntry, SimpleStyle } from '../../../../types';
import { useEditorCtx } from '../../ctx';
import SimpleStyleEditor from '../../simple-styles-editor';
import CaretOutlined from '../../../icons/caret-outlined';
import { getCtaById, getNewIndex, stringToSlug } from '../../utils';
import * as GTags from '../../../../common-styled';
import {
  findEntryToBeUpdatedIdx,
  findOptionToBeUpdatedIdx,
  findQualificationToBeUpdatedIdx,
  getSampleBaseEntry,
  getSampleSelectEntry,
  getSampleSelectEntryOption,
  getSampleSimpleStyle,
  rearrangeArray
} from '../../../../utils';
import EntryEditor from './entry-editor';
import { commonActionPanelItemStyle } from '.';
import { buttonSecStyle, GlobalTitle } from '../../../screen-editor/annotation-creator-panel';
import { InputText } from '../../../screen-editor/styled';
import * as LTags from './styled';
import * as Tags from '../../styled';
import CtaWrapper from '../cta-section/cta-wrapper';
import { showDeleteConfirm } from '../../delete-confirm';
import { amplitudeDemoQualBodyEdit, amplitudeDemoQualEdit, amplitudeQualStepEdit, amplitudeQualStepOptionEdit } from '../../../../amplitude';
import { AMPLITUDE_SIDEPANEL_CARD_STYLE, AMPLITUDE_SIDEPANEL_CON_STYLE, AMPLITUDE_STEP_CONTINUE_STYLE, AMPLITUDE_STEP_SKIP_STYLE, AMPLITUDE_STEP_STYLE, AMPLITUDE_STEP_TYPE, DemoQualEditEvent, QualStepEditEvent } from '../../../../amplitude/types';

interface Props {
  qualification: IDemoHubConfigQualification;
  activeQualificationId: string;
  setActiveQualificationId: (id: string) => void;
}

interface QualificationEndCtaProps {
  CTA: string[],
  config: IDemoHubConfig,
  deleteCta: (ctaId: string) => void,
  isCtaSelectOpen: boolean,
  setIsCtaSelectOpen: React.Dispatch<React.SetStateAction<boolean>>,
  addCta: (ctaId: string) => void,
  qualification: IDemoHubConfigQualification;
  ctaType: 'qualificationEndCTA'
  helpText: string;
}

function QualificationEndCta(ctaProps: QualificationEndCtaProps): JSX.Element {
  const { onConfigChange } = useEditorCtx();

  const rearrangeCtaFn = (r: DropResult): void => {
    if (!r.destination) return;

    onConfigChange(prev => {
      const qualifications = prev.qualification_page.qualifications;

      const updatedQualifications = qualifications.map(qfn => {
        if (qfn.id === ctaProps.qualification.id) {
          const rearrangedArray = rearrangeArray(qfn[ctaProps.ctaType], r.source.index, r.destination!.index);
          return {
            ...qfn,
            [ctaProps.ctaType]: rearrangedArray,
          };
        }
        return qfn;
      });

      return {
        ...prev,
        qualification_page: {
          ...prev.qualification_page,
          qualifications: updatedQualifications,
        }
      };
    });
  };

  return (
    <div
      key={1}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginTop: '8px',
      }}
    >
      <p
        className="typ-sm"
        style={{
          marginTop: 0,
          marginBottom: '0.5rem'
        }}
      >
        {ctaProps.helpText}
      </p>
      <DragDropContext
        onDragEnd={rearrangeCtaFn}
      >
        <Droppable
          droppableId="droppable"
        >
          {(provided, snapshot) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {ctaProps.CTA.map((ctaId, index) => {
                const cta = getCtaById(ctaProps.config, ctaId);

                if (cta) {
                  return (
                    <Draggable
                      key={ctaId}
                      draggableId={ctaId + index}
                      index={index}
                    >
                      {(providedInner, snapshotInner) => (
                        <div
                          key={ctaId}
                          {...providedInner.draggableProps}
                          ref={providedInner.innerRef}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginBottom: '0.75rem',
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
                                {...providedInner.dragHandleProps}
                              />
                            </Tooltip>
                            <div
                              key={ctaId}
                              style={{
                                flex: 1
                              }}
                            >
                              <CtaWrapper
                                showEditOption={false}
                                deleteCtaHandler={ctaProps.deleteCta}
                                cta={cta}
                                deletable
                              />
                            </div>
                          </div>

                        </div>
                      )}

                    </Draggable>
                  );
                }

                return <></>;
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Popover
        open={ctaProps.isCtaSelectOpen}
        destroyTooltipOnHide
        content={(
          <div style={{
            maxWidth: '200px'
          }}
          >
            <GTags.FableSelect
              style={{ width: '200px' }}
              className="typ-ip"
              placeholder="Select a CTA"
              bordered={false}
              options={ctaProps.config.cta
                .filter(v => !ctaProps.CTA.includes(v.id))
                .map(v => ({
                  value: v.id,
                  label: v.text._val,
                }))}
              autoFocus
              onChange={(e) => {
                if (e) {
                  ctaProps.addCta(e as string);
                  ctaProps.setIsCtaSelectOpen(false);
                }
              }}
              suffixIcon={<CaretOutlined dir="down" />}
            />
            <p className="typ-sm">You can create a CTA at the top of this panel and add the CTA to display in the header in this page</p>
          </div>
      )}
        trigger="click"
        placement="rightTop"
        onOpenChange={(visible) => {
          if (!visible) ctaProps.setIsCtaSelectOpen(false);
        }}
      >
        <GTags.OurLink
          style={{
            display: 'flex',
            gap: '0.5rem',
            width: 'fit-content',
            marginBottom: '0'
          }}
          onClick={() => ctaProps.setIsCtaSelectOpen(!ctaProps.isCtaSelectOpen)}
        >
          <PlusOutlined />
          <div>
            Select a CTA
          </div>
        </GTags.OurLink>
      </Popover>
    </div>
  );
}

export default function QualificationEditor(props: Props): JSX.Element {
  const { config, onConfigChange, setPreviewUrl, data } = useEditorCtx();
  const [isEndCtaSelectOpen, setIsEndCtaSelectOpen] = useState(false);
  const [isAddAStepPopoverOpen, setIsAddAStepPopoverOpen] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState('');

  const showEditor = props.activeQualificationId === props.qualification.id;

  const setShowEditor = (show: boolean): void => {
    if (show) {
      props.setActiveQualificationId(props.qualification.id);
    } else {
      props.setActiveQualificationId('');
    }
  };

  useEffect(() => {
    if (props.activeQualificationId === props.qualification.id) {
      setPreviewUrl(`q/${data.rid}/${props.qualification.slug}?lp=true`);
    }
  }, [props.qualification, props.activeQualificationId, setPreviewUrl]);

  const updateTitle = (title: string): void => {
    const slug = stringToSlug(title);

    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          { ...props.qualification, title, slug }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });

    setPreviewUrl(`q/${data.rid}/${slug}?lp=true`);
  };

  const addSidepanelEndCta = (ctaId: string): void => {
    amplitudeDemoQualEdit(
      {
        qualification_id: props.qualification.id,
        demo_qualification_prop: 'qualification_end_cta_select',
        demo_qualification_value: ctaId
      }
    );
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            qualificationEndCTA: [...props.qualification.qualificationEndCTA, ctaId],
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const deleteSidepanelEndCta = (ctaId: string): void => {
    amplitudeDemoQualEdit({
      qualification_id: props.qualification.id,
      demo_qualification_prop: 'qualification_end_cta_delete',
      demo_qualification_value: ctaId
    });
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            qualificationEndCTA: props.qualification.qualificationEndCTA.filter(cId => cId !== ctaId)
          },
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const amplitudeCardStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoQualEdit({
      qualification_id: props.qualification.id,
      demo_qualification_prop:
      AMPLITUDE_SIDEPANEL_CARD_STYLE[key] as DemoQualEditEvent['payload']['demo_qualification_prop'],
      demo_qualification_value: value as string
    });
  };
  const updateCardStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            sidePanel: {
              ...props.qualification.sidePanel,
              cardStyle: {
                ...props.qualification.sidePanel.cardStyle,
                [key]: value,
              }
            }
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const amplitudeContainerStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoQualEdit({
      qualification_id: props.qualification.title,
      demo_qualification_prop:
      AMPLITUDE_SIDEPANEL_CON_STYLE[key] as DemoQualEditEvent['payload']['demo_qualification_prop'],
      demo_qualification_value: value as string
    });
  };
  const updateConStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            sidePanel: {
              ...props.qualification.sidePanel,
              conStyle: {
                ...props.qualification.sidePanel.conStyle,
                [key]: value,
              }
            }
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const deleteQualification = (qualificationId: string): void => {
    amplitudeDemoQualBodyEdit({
      demo_qualification_body_prop: 'qualification_delete',
      demo_qualification_body_value: props.qualification.id
    });
    onConfigChange(c => {
      const qualificationToBeDeletedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeDeletedIdx,
          1
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const addSelectEntry = (type: 'single-select' | 'multi-select'): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [
              ...props.qualification.entries,
              getSampleSelectEntry(
                type,
                getNewIndex(
                  props.qualification.entries.map(ct => ct.title),
                  'What\'s your role in company?'
                ) + 1,
                {
                  style: props.qualification.entries.at(-1)?.style || {
                    ...getSampleSimpleStyle(),
                    borderColor: '#1b263b',
                    fontColor: '#121212'
                  },
                  continueCtaStyle: props.qualification.entries.at(-1)?.continueCTA.style || {
                    borderRadius: 4,
                    fontColor: '#ffffff'
                  },
                  skipCtaStyle: props.qualification.entries.at(-1)?.skipCTA.style || {
                    borderRadius: 4,
                    fontColor: '#ffffff'
                  },
                }
              ),
            ]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const addBaseEntry = (type: 'text-entry' | 'leadform-entry'): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [
              ...props.qualification.entries,
              getSampleBaseEntry(
                type,
                getNewIndex(props.qualification.entries.map(ct => ct.title), 'Sample Step Title') + 1,
                {
                  style: props.qualification.entries.at(-1)?.style || {
                    ...getSampleSimpleStyle(),
                    borderColor: '#1b263b'
                  },
                  continueCtaStyle: props.qualification.entries.at(-1)?.continueCTA.style || {
                    borderRadius: 4,
                    fontColor: '#ffffff'
                  },
                  skipCtaStyle: props.qualification.entries.at(-1)?.skipCTA.style || {
                    borderRadius: 4,
                    fontColor: '#ffffff'
                  },
                }
              ),
            ]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const rearrangeEntries = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(props.qualification.entries, r.source.index, r.destination.index);

    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: rearrangedArray
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const deleteEntry = (entryId: string): void => {
    amplitudeDemoQualEdit({
      qualification_id: props.qualification.id,
      demo_qualification_prop: 'step_delete',
      demo_qualification_value: entryId
    });
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: props.qualification.entries.filter(entry => entry.id !== entryId)
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const amplitudeEntryStyles = (entryId: string) => <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => {
    const qualifications = config.qualification_page.qualifications;
    const qualIdx = qualifications.findIndex(q => q.id === props.qualification.id);
    const entryIdx = qualifications[qualIdx].entries.findIndex(entry => entry.id === entryId);
    const updatedEntry = qualifications[qualIdx].entries[entryIdx];

    amplitudeQualStepEdit({
      step_id: updatedEntry.id,
      step_type: AMPLITUDE_STEP_TYPE[updatedEntry.type],
      qualification_step_prop: AMPLITUDE_STEP_STYLE[key] as QualStepEditEvent['payload']['qualification_step_prop'],
      qualification_step_value: value as string
    });
  };

  const updateEntryStyles = (entryId: string) => <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            style: {
              ...props.qualification.entries[entryToBeUpdatedIdx].style,
              [key]: value,
            }
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]

          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateEntryTitle = (entryId: string) => (title: string) => {
    const slug = stringToSlug(title);

    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            title,
            slug
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
    setPreviewUrl(`q/${data.rid}/${props.qualification.slug}/s/${slug}?lp=true`);
  };

  const updateEntryDesc = (entryId: string) => (desc: string) => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            desc
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateEntryShowSkipCta = (entryId: string) => (showSkipCta: boolean) => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            showSkipCta,
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateEntryCtaText = (entryId: string, ctaType: 'continueCTA' | 'skipCTA') => (text: string) => {
    const id = stringToSlug(text);

    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            [ctaType]: {
              ...props.qualification.entries[entryToBeUpdatedIdx][ctaType],
              text,
              id,
            }
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const addSelectEntryOption = (entryId: string) => () => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const options = (props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options;

      (props
        .qualification
        .entries as SelectEntry[])
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry),
            options: [
              ...options,
              getSampleSelectEntryOption(getNewIndex(options.map(ct => ct.title), 'This is an option') + 1)
            ],
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateEntryCtaIconPlacement = (
    entryId: string,
    ctaType: 'continueCTA' | 'skipCTA'
  ) => (iconPlacement: 'left' | 'right') => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            [ctaType]: {
              ...props.qualification.entries[entryToBeUpdatedIdx][ctaType],
              iconPlacement,
            }
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateEntryCtaType = (
    entryId: string,
    ctaType: 'continueCTA' | 'skipCTA'
  ) => (type: DemoHubConfigCtaTypeType) => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            [ctaType]: {
              ...props.qualification.entries[entryToBeUpdatedIdx][ctaType],
              type,
            }
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const amplitudeEntryCtaStyles = (
    entryId: string,
    ctaType: 'continueCTA' | 'skipCTA'
  ) => <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => {
    const qualifications = config.qualification_page.qualifications;
    const qualIdx = qualifications.findIndex(q => q.id === props.qualification.id);
    const entryIdx = qualifications[qualIdx].entries.findIndex(entry => entry.id === entryId);
    const updatedEntry = qualifications[qualIdx].entries[entryIdx];
    amplitudeQualStepEdit({
      step_id: updatedEntry.id,
      step_type: AMPLITUDE_STEP_TYPE[updatedEntry.type],
      qualification_step_prop: ctaType === 'continueCTA'
        ? AMPLITUDE_STEP_CONTINUE_STYLE[key]!
        : AMPLITUDE_STEP_SKIP_STYLE[key]!,
      qualification_step_value: value as string
    });
  };

  const updateEntryCtaStyles = (
    entryId: string,
    ctaType: 'continueCTA' | 'skipCTA'
  ) => <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      props
        .qualification
        .entries
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...props.qualification.entries[entryToBeUpdatedIdx],
            [ctaType]: {
              ...props.qualification.entries[entryToBeUpdatedIdx][ctaType],
              style: {
                ...props.qualification.entries[entryToBeUpdatedIdx][ctaType].style,
                [key]: value,
              }
            }
          }
        );

      c
        .qualification_page
        .qualifications
        .splice(
          qualificationToBeUpdatedIdx,
          1,
          {
            ...props.qualification,
            entries: [...props.qualification.entries]
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const rearrangeOptionsInEntry = (entryId: string) => (r: DropResult): void => {
    if (!r.destination) return;

    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const rearrangedArray = rearrangeArray(
        (props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options,
        r.source.index,
        r.destination!.index
      );

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries as SelectEntry[])
        .splice(
          entryToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry),
            options: rearrangedArray
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateOptionTitle = (entryId: string) => (optionId: string) => (title: string): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const optionToBeUpdatedIdx = (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .findIndex(option => option.id === optionId);

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .splice(
          optionToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options[optionToBeUpdatedIdx],
            title,
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateOptionDesc = (entryId: string) => (optionId: string) => (desc: string): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const optionToBeUpdatedIdx = (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .findIndex(option => option.id === optionId);

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .splice(
          optionToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options[optionToBeUpdatedIdx],
            desc,
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const addDemoInEntryOption = (entryId: string) => (optionId: string) => (demo: IDemoHubConfigDemo): void => {
    amplitudeQualStepOptionEdit({
      step_id: entryId,
      option_id: optionId,
      step_option_prop: 'demo_add',
      step_option_value: demo.rid
    });
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = findQualificationToBeUpdatedIdx(c, props.qualification.id);
      const entryToBeUpdatedIdx = findEntryToBeUpdatedIdx(c, entryId, qualificationToBeUpdatedIdx);
      const optionToBeUpdatedIdx = findOptionToBeUpdatedIdx(
        c,
        optionId,
        qualificationToBeUpdatedIdx,
        entryToBeUpdatedIdx
      );

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .splice(
          optionToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options[optionToBeUpdatedIdx],
            demos: [
              ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options[optionToBeUpdatedIdx].demos,
              demo,
            ],
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const updateDemoInEntryOption = (entryId: string) => (optionId: string) => (updatedDemo: IDemoHubConfigDemo): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = findQualificationToBeUpdatedIdx(c, props.qualification.id);
      const entryToBeUpdatedIdx = findEntryToBeUpdatedIdx(c, entryId, qualificationToBeUpdatedIdx);
      const optionToBeUpdatedIdx = findOptionToBeUpdatedIdx(
        c,
        optionId,
        qualificationToBeUpdatedIdx,
        entryToBeUpdatedIdx
      );

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .splice(
          optionToBeUpdatedIdx,
          1,
          {
            ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry).options[optionToBeUpdatedIdx],
            demos: [
              ...(props.qualification.entries[entryToBeUpdatedIdx] as SelectEntry)
                .options[optionToBeUpdatedIdx].demos.map(demo => {
                  if (demo.rid === updatedDemo.rid) {
                    demo.desc = updatedDemo.desc;
                    demo.thumbnail = updatedDemo.thumbnail;
                    demo.name = updatedDemo.name;
                  }
                  return demo;
                })
            ],
          }
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const deleteDemoInEntryOption = (entryId: string) => (optionId: string) => (demoRid: string): void => {
    amplitudeQualStepOptionEdit({
      step_id: entryId,
      option_id: optionId,
      step_option_prop: 'demo_delete',
      step_option_value: demoRid
    });
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const optionToBeUpdatedIdx = (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .findIndex(option => option.id === optionId);

      const demoToBeDeletedIdx = (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options[optionToBeUpdatedIdx]
        .demos
        .findIndex(demo => demo.rid === demoRid);

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options[optionToBeUpdatedIdx]
        .demos
        .splice(
          demoToBeDeletedIdx,
          1,
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  const deleteEntryOption = (entryId: string) => (optionId: string): void => {
    onConfigChange(c => {
      const qualificationToBeUpdatedIdx = c
        .qualification_page
        .qualifications
        .findIndex(q => q.id === props.qualification.id);

      const entryToBeUpdatedIdx = c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries
        .findIndex(entry => entry.id === entryId);

      const optionToBeDeletedIdx = (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .findIndex(option => option.id === optionId);

      (c
        .qualification_page
        .qualifications[qualificationToBeUpdatedIdx]
        .entries[entryToBeUpdatedIdx] as SelectEntry)
        .options
        .splice(
          optionToBeDeletedIdx,
          1,
        );

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: [...c.qualification_page.qualifications],
        },
      };
    });
  };

  return (
    <div className={`grooveable ${showEditor ? 'opened' : 'closed'}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div>
            {props.qualification.title}
          </div>
          <div
            className="typ-sm"
            style={{
              padding: '0.25rem 0rem',
            }}
          >
            URL slug /{props.qualification.slug}
          </div>
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
                () => deleteQualification(props.qualification.id),
                'Are you sure you want to delete this qualification?',
              );
            }}
          />
          <Button
            icon={<EditOutlined />}
            type="text"
            size="small"
            style={buttonSecStyle}
            onClick={() => {
              amplitudeDemoQualBodyEdit({
                demo_qualification_body_prop: 'qualification_edit',
                demo_qualification_body_value: props.qualification.id
              });
              setShowEditor(!showEditor);
            }}
          />
        </div>
      </div>

      {showEditor && (
        <LTags.QualificationCollapseCon>
          <Collapse
            style={{
              marginTop: '10px',
            }}
            items={
              [{
                key: 'General',
                label: <span className="typ-reg">General</span>,
                children: (
                  <div style={{ ...commonActionPanelItemStyle, gap: '5px' }}>
                    <p className="typ-sm">
                      Name of the qualification that is used to generate the URL slug of the page
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div className="typ-sm">Title</div>
                      <InputText
                        type="url"
                        value={props.qualification.title}
                        onBlur={(e) => {
                          amplitudeDemoQualEdit({
                            qualification_id: props.qualification.id,
                            demo_qualification_prop: 'general_title',
                            demo_qualification_value: e.target.value
                          });
                        }}
                        onChange={(e) => {
                          updateTitle(e.target.value);
                        }}
                        style={{ height: '44px', width: '100%' }}
                      />
                    </div>
                  </div>
                )
              },
              {
                key: 'CTA',
                label: <span className="typ-reg">CTA</span>,
                children: (
                  <Tags.QfcnStepsCollapseCon>
                    <div
                      style={{
                        marginBottom: '0.5rem',
                        opacity: '0.75',
                        fontWeight: '500'
                      }}
                    >
                      Configure qualification end CTA
                    </div>
                    <p
                      className="typ-sm"
                      style={{
                        marginTop: 0,
                        marginBottom: '0.5rem'
                      }}
                    >
                      Configure call-to-action buttons that are shown at the end
                    </p>
                    <QualificationEndCta
                      CTA={props.qualification.qualificationEndCTA}
                      config={config}
                      deleteCta={deleteSidepanelEndCta}
                      isCtaSelectOpen={isEndCtaSelectOpen}
                      setIsCtaSelectOpen={setIsEndCtaSelectOpen}
                      addCta={addSidepanelEndCta}
                      qualification={props.qualification}
                      ctaType="qualificationEndCTA"
                      helpText=""
                    />
                  </Tags.QfcnStepsCollapseCon>
                )
              },
              {
                key: 'Steps',
                label: <span className="typ-reg">Steps</span>,
                children: (
                  <>
                    <p
                      className="typ-sm"
                      style={{
                        marginTop: 0,
                        marginBottom: '0.5rem'
                      }}
                    >
                      Configure multiple steps to create a personalized demo journey for your buyers.
                    </p>
                    <p
                      className="typ-sm"
                      style={{
                        marginTop: 0,
                        marginBottom: '0.5rem'
                      }}
                    >
                      At each step, you can ask the buyer a question and based on their response,
                      you can deliver specific demos thereby having a very personalized journey for each buyer.
                    </p>
                    <p className="typ-sm">
                      All the steps configured here are shown in the side panel of the qualification page.
                    </p>
                    <DragDropContext
                      onDragEnd={rearrangeEntries}
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
                            {props.qualification.entries.map((entry, index) => (
                              <Draggable
                                key={entry.id}
                                draggableId={entry.id + index}
                                index={index}
                              >
                                {(providedInner, snapshotInner) => (
                                  <EntryEditor
                                    qualification={props.qualification}
                                    deleteDemoInEntryOption={deleteDemoInEntryOption(entry.id)}
                                    deleteEntryOption={deleteEntryOption(entry.id)}
                                    addDemoInEntryOption={addDemoInEntryOption(entry.id)}
                                    updateDemoInEntryOption={updateDemoInEntryOption(entry.id)}
                                    updateOptionDesc={updateOptionDesc(entry.id)}
                                    updateOptionTitle={updateOptionTitle(entry.id)}
                                    rearrangeOptionsInEntry={rearrangeOptionsInEntry(entry.id)}
                                    entry={entry}
                                    providedInner={providedInner}
                                    deleteEntry={deleteEntry}
                                    updateEntryStyles={updateEntryStyles(entry.id)}
                                    amplitudeEntryStyles={amplitudeEntryStyles(entry.id)}
                                    updateEntryTitle={updateEntryTitle(entry.id)}
                                    updateEntryDesc={updateEntryDesc(entry.id)}
                                    updateEntryShowSkipCta={updateEntryShowSkipCta(entry.id)}
                                    updateEntryContinueCtaText={updateEntryCtaText(entry.id, 'continueCTA')}
                                    updateEntryContinueCtaIconPlacement={updateEntryCtaIconPlacement(entry.id, 'continueCTA')}
                                    updateEntryContinueCtaType={updateEntryCtaType(entry.id, 'continueCTA')}
                                    updateEntryContinueCtaStyles={updateEntryCtaStyles(entry.id, 'continueCTA')}
                                    amplitudeContinueCtaStyles={amplitudeEntryCtaStyles(entry.id, 'continueCTA')}
                                    updateEntrySkipCtaText={updateEntryCtaText(entry.id, 'skipCTA')}
                                    updateEntrySkipCtaIconPlacement={updateEntryCtaIconPlacement(entry.id, 'skipCTA')}
                                    updateEntrySkipCtaType={updateEntryCtaType(entry.id, 'skipCTA')}
                                    updateEntrySkipCtaStyles={updateEntryCtaStyles(entry.id, 'skipCTA')}
                                    amplitudeSkipCtaStyles={amplitudeEntryCtaStyles(entry.id, 'skipCTA')}
                                    addSelectEntryOption={addSelectEntryOption(entry.id)}
                                    activeEntryId={activeEntryId}
                                    setActiveEntryId={setActiveEntryId}
                                  />
                                )}
                              </Draggable>
                            ))}

                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <Popover
                      open={isAddAStepPopoverOpen}
                      destroyTooltipOnHide
                      content={(
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            maxWidth: '200px',
                            gap: '0.5rem'
                          }}
                        >
                          <p className="typ-sm">
                            Select a type of step from the list below.
                          </p>
                          <CustomBtn
                            intent="secondary"
                            onClick={() => {
                              amplitudeDemoQualEdit({
                                qualification_id: props.qualification.id,
                                demo_qualification_prop: 'step_add',
                                demo_qualification_value: 'single-select'
                              });
                              setIsAddAStepPopoverOpen(false);
                              addSelectEntry('single-select');
                            }}
                          >
                            Single select
                          </CustomBtn>
                          <CustomBtn
                            intent="secondary"
                            onClick={() => {
                              amplitudeDemoQualEdit({
                                qualification_id: props.qualification.id,
                                demo_qualification_prop: 'step_add',
                                demo_qualification_value: 'multi-select'
                              });
                              setIsAddAStepPopoverOpen(false);
                              addSelectEntry('multi-select');
                            }}
                          >
                            Multi select
                          </CustomBtn>
                          <CustomBtn
                            intent="secondary"
                            onClick={() => {
                              amplitudeDemoQualEdit({
                                qualification_id: props.qualification.id,
                                demo_qualification_prop: 'step_add',
                                demo_qualification_value: 'leadform-entry'
                              });
                              setIsAddAStepPopoverOpen(false);
                              addBaseEntry('leadform-entry');
                            }}
                            disabled={!config.leadform.bodyContent}
                          >
                            Lead form
                          </CustomBtn>
                          <CustomBtn
                            intent="secondary"
                            onClick={() => {
                              amplitudeDemoQualEdit({
                                qualification_id: props.qualification.id,
                                demo_qualification_prop: 'step_add',
                                demo_qualification_value: 'text-entry'
                              });
                              setIsAddAStepPopoverOpen(false);
                              addBaseEntry('text-entry');
                            }}
                          >
                            Text
                          </CustomBtn>
                        </div>
                      )}
                      trigger="click"
                      placement="rightTop"
                    >
                      <GTags.OurLink
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          width: 'fit-content',
                          margin: '1rem 0'
                        }}
                        onClick={() => setIsAddAStepPopoverOpen(prevState => !prevState)}
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
                          Add a step
                        </div>
                      </GTags.OurLink>
                    </Popover>
                  </>
                )
              },
              {
                key: 'Side Panel',
                label: <span className="typ-reg">Side panel</span>,
                children: (
                  <>
                    <div style={{ ...commonActionPanelItemStyle, gap: '5px' }}>
                      <p className="typ-sm">
                        The qualification page has a side panel where the buyers can see the
                        overview of criteria and the demos for each selection.
                      </p>
                      <p className="typ-sm">
                        Add a qualification step below to see this sidepanel changes.
                      </p>
                      <div
                        className="typ-reg"
                        style={{
                          fontWeight: 500,
                          marginTop: '1rem',
                          opacity: '0.75'
                        }}
                      >
                        Card style
                      </div>
                      <p
                        className="typ-sm"
                        style={{
                          marginTop: 0,
                          marginBottom: '0.5rem'
                        }}
                      >
                        Configure the style of step cards shown in the side panel
                      </p>
                      <SimpleStyleEditor
                        simpleStyle={props.qualification.sidePanel.cardStyle}
                        simpleStyleUpdateFn={updateCardStyle}
                        amplitudeStyleEvent={amplitudeCardStyle}
                      />
                    </div>
                    <div style={{ ...commonActionPanelItemStyle, gap: '5px' }}>
                      <div
                        className="typ-reg"
                        style={{
                          fontWeight: 500,
                          marginTop: '1rem',
                          opacity: '0.75'
                        }}
                      >
                        Container style
                      </div>
                      <p
                        className="typ-sm"
                        style={{
                          marginTop: 0,
                          marginBottom: '0.5rem'
                        }}
                      >
                        Configure the style of the side panel
                      </p>
                      <SimpleStyleEditor
                        simpleStyle={props.qualification.sidePanel.conStyle}
                        simpleStyleUpdateFn={updateConStyle}
                        amplitudeStyleEvent={amplitudeContainerStyle}
                        bgColorTitle="Accent color"
                      />
                    </div>
                  </>
                )
              },
              ]
            }
          />
        </LTags.QualificationCollapseCon>
      )}
    </div>
  );
}
