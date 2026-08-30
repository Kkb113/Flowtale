/* eslint-disable react/no-unused-prop-types */
import React, { useState } from 'react';
import { DragDropContext, Draggable, DropResult, Droppable } from 'react-beautiful-dnd';
import { HolderOutlined, PlusOutlined, StepBackwardOutlined } from '@ant-design/icons';
import { Button, Collapse, Popover, Tooltip } from 'antd';
import { CollapsibleType } from 'antd/es/collapse/CollapsePanel';
import * as Tags from '../../styled';
import * as GTags from '../../../../common-styled';
import { useEditorCtx } from '../../ctx';
import { IDemoHubConfig, SimpleStyle } from '../../../../types';
import SimpleStyleEditor, { SimpleStyleUpdateFn } from '../../simple-styles-editor';
import { OurLink } from '../../../../common-styled';
import CaretOutlined from '../../../icons/caret-outlined';
import { getSampleDemoHubSeeAllPageSectionConfig, getSampleSimpleStyle, rearrangeArray } from '../../../../utils';
import SectionEditor from './section-editor';
import { getCtaById, getNewIndex } from '../../utils';
import ActionPanel from '../../../screen-editor/action-panel';
import { InputText } from '../../../screen-editor/styled';
import CtaWrapper from '../cta-section/cta-wrapper';
import { amplitudeDemoCollectionBodyEdited, amplitudeDemoCollectionHeader } from '../../../../amplitude';
import { AMPLITUDE_COLLECTION_CARD_CTA_STYLE, AMPLITUDE_COLLECTION_CARD_STYLE,
  AMPLITUDE_COLLECTION_MODAL_STYLE,
  AMPLITUDE_LEADFORM_CONTINUE_BTN_STYLE
} from '../../../../amplitude/types';

function SeeAllPageTab(): JSX.Element {
  const { config, onConfigChange } = useEditorCtx();
  const [isCtaSelectOpen, setIsCtaSelectOpen] = useState(false);

  function updateSeeAllPageProps<K extends keyof IDemoHubConfig['see_all_page']>(
    key: K,
    value: IDemoHubConfig['see_all_page'][K]
  ): void {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        [key]: value,
      }
    }));
  }

  function updateHeader<K extends keyof IDemoHubConfig['see_all_page']['header']>(
    key: K,
    value: IDemoHubConfig['see_all_page']['header'][K]
  ): void {
    updateSeeAllPageProps('header', { ...config.see_all_page.header, [key]: value });
  }

  function updateBodyText(text: string): void {
    updateSeeAllPageProps('body', { ...config.see_all_page.body, text });
  }

  const updateHeaderStyle = <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        header: {
          ...c.see_all_page.header,
          style: {
            ...c.see_all_page.header.style,
            [key]: value,
          }
        }
      }
    }));

    if (key === 'bgColor') {
      amplitudeDemoCollectionHeader('bg_color', value as string);
    } else if (key === 'fontColor') {
      amplitudeDemoCollectionHeader('font_color', value as string);
    }
  };

  const updateBodyStyle = <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        body: {
          ...c.see_all_page.body,
          style: {
            ...c.see_all_page.body.style,
            [key]: value,
          }
        }
      }
    }));

    if (key === 'bgColor') {
      amplitudeDemoCollectionBodyEdited('body_bg_color', value as string);
    } else if (key === 'fontColor') {
      amplitudeDemoCollectionBodyEdited('body_font_color', value as string);
    }
  };

  const amplitudeDemoCardStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoCollectionBodyEdited(AMPLITUDE_COLLECTION_CARD_STYLE[key]!, value as string);
  };

  const updateDemoCardStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        demoCardStyles: {
          ...c.see_all_page.demoCardStyles,
          card: {
            ...c.see_all_page.demoCardStyles.card,
            [key]: value,
          }
        },
      }
    }));
  };

  const amplitudeDemoCardCtaStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoCollectionBodyEdited(AMPLITUDE_COLLECTION_CARD_CTA_STYLE[key]!, value as string);
  };

  const updateDemoCardCtaStyle : SimpleStyleUpdateFn<'borderColor'> = (key, value): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        demoCardStyles: {
          ...c.see_all_page.demoCardStyles,
          cta: {
            ...c.see_all_page.demoCardStyles.cta,
            style: {
              ...c.see_all_page.demoCardStyles.cta.style,
              [key]: value,
            }
          }
        },
      }
    }));
  };

  const updateDemoCardText = <
  K extends keyof IDemoHubConfig['see_all_page']['demoCardStyles']['cta']>(key: K, value: string): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        demoCardStyles: {
          ...c.see_all_page.demoCardStyles,
          cta: {
            ...c.see_all_page.demoCardStyles.cta,
            [key]: value
          }
        },
      }
    }));
  };

  const amplitudeDemoModalStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoCollectionBodyEdited(AMPLITUDE_COLLECTION_MODAL_STYLE[key]!, value as string);
  };

  const updateDemoModalBodyStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        demoModalStyles: {
          ...c.see_all_page.demoModalStyles,
          body: {
            ...c.see_all_page.demoModalStyles.body,
            [key]: value,
          },
        },
      },
    }));
  };

  const updateDemoModalOverlayStyle = <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        demoModalStyles: {
          ...c.see_all_page.demoModalStyles,
          overlay: {
            ...c.see_all_page.demoModalStyles.overlay,
            [key]: value,
          },
        },
      },
    }));
    if (key === 'bgColor') {
      amplitudeDemoCollectionBodyEdited('overlay_bg_color', value as string);
    }
  };

  const addHeaderCta = (ctaId: string): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        header: {
          ...c.see_all_page.header,
          ctas: [...c.see_all_page.header.ctas, ctaId]
        }
      }
    }));
  };

  const deleteHeaderCta = (ctaId: string): void => {
    onConfigChange(c => {
      const ctaIdToBeDeleteIdx = c.see_all_page.header.ctas.findIndex(cta => cta === ctaId);
      c.see_all_page.header.ctas.splice(ctaIdToBeDeleteIdx, 1);
      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          header: {
            ...c.see_all_page.header,
            ctas: [...c.see_all_page.header.ctas],
          }
        }
      };
    });
    amplitudeDemoCollectionHeader('cta_delete', ctaId);
  };

  const rearrangeHeaderCta = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(config.see_all_page.header.ctas, r.source.index, r.destination.index);

    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        header: {
          ...c.see_all_page.header,
          ctas: rearrangedArray,
        }
      }
    }));
  };

  const rearrangeSeeAllPageSections = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(config.see_all_page.sections, r.source.index, r.destination.index);

    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        sections: rearrangedArray,
      }
    }));
  };

  const amplitudeLeadformContinueBtnStyle = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    amplitudeDemoCollectionBodyEdited(AMPLITUDE_LEADFORM_CONTINUE_BTN_STYLE[key]!, value as string);
  };

  const updateLeadformContinueBtnStyle: SimpleStyleUpdateFn<'borderColor'> = (key, value): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        leadForm: {
          ...c.see_all_page.leadForm,
          continueCTA: {
            ...c.see_all_page.leadForm.continueCTA,
            style: {
              ...c.see_all_page.leadForm.continueCTA.style,
              [key]: value,
            },
          },
        },
      },
    }));
  };

  const updateLeadformContinueBtnText = <K extends keyof IDemoHubConfig['see_all_page']['leadForm']['continueCTA']>(key: K, value: string): void => {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        leadForm: {
          ...c.see_all_page.leadForm,
          continueCTA: {
            ...c.see_all_page.leadForm.continueCTA,
            [key]: value
          },
        },
      },
    }));
  };

  function updateSeeAllLeadformProps<K extends keyof IDemoHubConfig['see_all_page']['leadForm']>(
    key: K,
    value: IDemoHubConfig['see_all_page']['leadForm'][K]
  ): void {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        leadForm: {
          ...c.see_all_page.leadForm,
          [key]: value,
        }
      }
    }));
  }

  return (
    <Tags.SidepanelCon>
      <ActionPanel
        title="Header"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            margin: '0 auto',
            marginTop: '8px',
          }}
        >
          <p className="typ-sm">Configure the header of the demo collection page</p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div className="typ-sm">Title</div>
            <InputText
              type="text"
              value={config.see_all_page.header.title}
              onChange={e => updateHeader('title', e.target.value)}
              style={{ height: '44px', width: '100%' }}
              onBlur={(e) => { amplitudeDemoCollectionHeader('title', e.target.value); }}
            />
          </div>
          <SimpleStyleEditor
            simpleStyle={config.see_all_page.header.style}
            simpleStyleUpdateFn={updateHeaderStyle}
          />
          <p className="typ-sm">Select CTAs to be shown in the top right corner of the page</p>
          <DragDropContext
            onDragEnd={rearrangeHeaderCta}
          >
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '0.5rem'
                  }}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {config.see_all_page.header.ctas.map((ctaId, index) => {
                    const cta = getCtaById(config, ctaId);

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
                                  marginBottom: '0.75rem'
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
                                <div style={{ flex: 1 }}>
                                  <CtaWrapper
                                    showEditOption={false}
                                    deleteCtaHandler={deleteHeaderCta}
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

                    return <React.Fragment key={ctaId} />;
                  })}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Popover
            open={isCtaSelectOpen}
            trigger="click"
            placement="rightTop"
            onOpenChange={(visible) => {
              if (!visible) setIsCtaSelectOpen(false);
            }}
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
                  options={config.cta
                    .filter(v => !config.see_all_page.header.ctas.includes(v.id))
                    .map(v => ({
                      value: v.id,
                      label: v.text._val,
                    }))}
                  autoFocus
                  onChange={(e) => {
                    if (e) {
                      addHeaderCta(e as string);
                      amplitudeDemoCollectionHeader('cta_select', e as string);
                      setIsCtaSelectOpen(false);
                    }
                  }}
                  suffixIcon={<CaretOutlined dir="down" />}
                />
                <p className="typ-sm">
                  You can create new call-to-action buttons under the CTA section of this panel
                  and then select it here to be shown in the top right corner of the page.
                </p>
              </div>
            )}
          >
            <OurLink
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: 'fit-content'
              }}
              onClick={() => setIsCtaSelectOpen(!isCtaSelectOpen)}
            >
              <PlusOutlined />
              <div>
                Select a CTA
              </div>
            </OurLink>
          </Popover>

        </div>
      </ActionPanel>

      <ActionPanel title="Body">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            margin: '0 auto'
          }}
        >
          <p className="typ-sm">
            Configure the body of the demo collection page by adding sections and demos within the sections.
          </p>
          <DragDropContext
            onDragEnd={rearrangeSeeAllPageSections}
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
                  {config.see_all_page.sections.map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id + index}
                      index={index}
                    >
                      {(providedInner, snapshotInner) => (
                        <div
                          key={section.id}
                          {...providedInner.draggableProps}
                          ref={providedInner.innerRef}
                        >
                          <SectionEditor
                            section={section}
                            providedInner={providedInner}
                          />
                        </div>
                      )}

                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <OurLink
            style={{
              display: 'flex',
              gap: '0.5rem',
              width: 'fit-content'
            }}
            onClick={() => {
              let sectionId = '';
              onConfigChange(c => {
                const newSectionIndex = getNewIndex(c.see_all_page.sections.map(ct => ct.title), 'A new section') + 1;
                const sectionInfo = getSampleDemoHubSeeAllPageSectionConfig(
                  newSectionIndex
                );
                sectionId = sectionInfo.id;

                return {
                  ...c,
                  see_all_page: {
                    ...c.see_all_page,
                    sections: [
                      ...c.see_all_page.sections,
                      sectionInfo,
                    ],
                  },
                };
              });
              amplitudeDemoCollectionBodyEdited('section_add', sectionId);
            }}
          >
            <PlusOutlined />
            <div>
              Add a new section
            </div>
          </OurLink>

          <Collapse
            bordered={false}
            items={[
              {
                key: '1',
                label: <span className="typ-reg">Configure body</span>,
                children: (
                  <>
                    <p className="typ-sm">
                      Configure content and style of the body of the demo collection page.
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div className="typ-sm">Text</div>
                        <InputText
                          type="text"
                          defaultValue={config.see_all_page.body.text}
                          onChange={e => updateBodyText(e.target.value)}
                          style={{ height: '44px', width: '100%' }}
                          onBlur={e => amplitudeDemoCollectionBodyEdited('body_title', e.target.value)}
                        />
                      </div>

                      <SimpleStyleEditor
                        simpleStyle={config.see_all_page.body.style}
                        simpleStyleUpdateFn={updateBodyStyle}
                      />
                    </div>
                  </>
                )
              },
              {
                key: '2',
                label: <span className="typ-reg">Configure demo card</span>,
                children: (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div
                          className="typ-reg"
                          style={{
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            opacity: '0.75'
                          }}
                        >
                          Card styles
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}
                        >

                          <SimpleStyleEditor
                            simpleStyle={config.see_all_page.demoCardStyles.card}
                            simpleStyleUpdateFn={updateDemoCardStyle}
                            amplitudeStyleEvent={amplitudeDemoCardStyle}
                          />
                        </div>
                      </div>
                      <div style={{
                        marginTop: '1rem'
                      }}
                      >
                        <div
                          className="typ-reg"
                          style={{
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            opacity: '0.75'
                          }}
                        >
                          Card CTA styles
                        </div>
                        <p
                          className="typ-sm"
                          style={{
                            marginBottom: '1rem'
                          }}
                        >
                          Configure the look and feel of the demo card CTA displayed on hover of demo card.
                        </p>
                        <div style={{ marginBottom: '1rem' }}>
                          <div className="typ-sm">Text</div>
                          <InputText
                            type="text"
                            defaultValue={config.see_all_page.demoCardStyles.cta.text}
                            onChange={e => updateDemoCardText('text', e.target.value)}
                            style={{ height: '44px', width: '100%' }}
                            onBlur={e => amplitudeDemoCollectionBodyEdited('card_cta_text', e.target.value)}
                          />
                        </div>
                        <SimpleStyleEditor
                          simpleStyle={config.see_all_page.demoCardStyles.cta.style}
                          simpleStyleUpdateFn={updateDemoCardCtaStyle}
                          amplitudeStyleEvent={amplitudeDemoCardCtaStyle}
                        />
                      </div>
                    </div>
                  </>
                )
              },
              {
                key: '3',
                label: <span className="typ-reg">Configure demo modal</span>,
                children: (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div
                          className="typ-reg"
                          style={{
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            opacity: '0.75'
                          }}
                        >
                          Body styles
                        </div>
                        <p className="typ-sm">
                          Configure the style of the modal that is opened on the click of the demo.
                        </p>
                        <SimpleStyleEditor
                          simpleStyle={config.see_all_page.demoModalStyles.body}
                          simpleStyleUpdateFn={updateDemoModalBodyStyle}
                          amplitudeStyleEvent={amplitudeDemoModalStyle}
                        />
                      </div>
                      <div style={{
                        marginTop: '1rem'
                      }}
                      >
                        <div
                          className="typ-reg"
                          style={{
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            opacity: '0.75'
                          }}
                        >
                          Overlay styles
                        </div>
                        <p className="typ-sm">
                          Configure the style of the overlay on the page when the modal is opened.
                        </p>
                        <SimpleStyleEditor
                          simpleStyle={config.see_all_page.demoModalStyles.overlay}
                          simpleStyleUpdateFn={updateDemoModalOverlayStyle}
                        />
                      </div>
                    </div>
                  </>
                )
              },
              {
                key: '4',
                label: <span className="typ-reg">Configure leadform</span>,
                children: (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <p className="typ-sm">
                          Configure the style of the button to submit leadform.
                        </p>
                        <div
                          style={{
                            marginBottom: '1rem',
                          }}
                        >
                          <div className="typ-sm">Text</div>
                          <InputText
                            type="text"
                            defaultValue={config.see_all_page.leadForm.continueCTA.text}
                            onChange={e => updateLeadformContinueBtnText('text', e.target.value)}
                            style={{ height: '44px', width: '100%' }}
                            onBlur={e => amplitudeDemoCollectionBodyEdited('leadform_btn_text', e.target.value)}
                          />
                        </div>
                        <SimpleStyleEditor
                          simpleStyle={config.see_all_page.leadForm.continueCTA.style}
                          simpleStyleUpdateFn={updateLeadformContinueBtnStyle}
                          amplitudeStyleEvent={amplitudeLeadformContinueBtnStyle}
                        />
                      </div>
                      <div
                        className="typ-reg"
                        style={{
                          fontWeight: 500,
                          opacity: '0.75',
                          display: 'flex',
                          gap: '1rem',
                          marginTop: '1rem'
                        }}
                      >
                        <GTags.OurCheckbox
                          disabled={!config.leadform.bodyContent}
                          style={{ marginLeft: '-0.5rem' }}
                          checked={config.see_all_page.leadForm.showLeadForm}
                          onChange={e => {
                            updateSeeAllLeadformProps('showLeadForm', e.target.checked);
                            amplitudeDemoCollectionBodyEdited('leadform_show', e.target.checked);
                          }}
                        />
                        <div>Show lead form</div>
                      </div>
                      <div
                        className="typ-reg"
                        style={{
                          fontWeight: 500,
                          marginBottom: '0.5rem',
                          opacity: '0.75',
                          display: 'flex',
                          gap: '1rem',
                        }}
                      >
                        <GTags.OurCheckbox
                          disabled={!config.leadform.bodyContent}
                          style={{ marginLeft: '-0.5rem' }}
                          checked={config.see_all_page.leadForm.skipLeadForm}
                          onChange={e => {
                            updateSeeAllLeadformProps('skipLeadForm', e.target.checked);
                            amplitudeDemoCollectionBodyEdited('leadform_skip', e.target.checked);
                          }}
                        />
                        <div>Skip lead form</div>
                      </div>
                    </div>
                  </>
                )
              }
            ]}
          />
        </div>
      </ActionPanel>

    </Tags.SidepanelCon>
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

export default SeeAllPageTab;
