import React, { useState } from 'react';
import { Button, Popover, Tooltip } from 'antd';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import { useEditorCtx } from '../../ctx';
import { IDemoHubConfig, SimpleStyle } from '../../../../types';
import SimpleStyleEditor from '../../simple-styles-editor';
import * as GTags from '../../../../common-styled';
import CaretOutlined from '../../../icons/caret-outlined';
import { getCtaById, getNewIndex } from '../../utils';
import {
  getSampleDemoHubQualification,
  getSampleDemoHubQualificationSidePanel,
  rearrangeArray
} from '../../../../utils';
import QualificationEditor from './qualification-editor';
import ActionPanel from '../../../screen-editor/action-panel';
import { InputText } from '../../../screen-editor/styled';
import CtaWrapper from '../cta-section/cta-wrapper';
import { amplitudeDemoQualBodyEdit } from '../../../../amplitude';
import { AMPLITUDE_HEADER_STYLE, DemoQualBodyEditEvent } from '../../../../amplitude/types';

export const commonActionPanelItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'inline-block',
  margin: '0px 0 10px',
  color: '#212121',
};

function QualificationTab(): JSX.Element {
  const { config, onConfigChange, setPreviewUrl } = useEditorCtx();
  const [isCtaSelectOpen, setIsCtaSelectOpen] = useState(false);
  const [activeQualificationId, setActiveQualificationId] = useState('');

  function updateHeader<K extends keyof IDemoHubConfig['qualification_page']['header']>(
    key: K,
    value: IDemoHubConfig['qualification_page']['header'][K]
  ): void {
    onConfigChange(c => ({
      ...c,
      qualification_page: {
        ...c.qualification_page,
        header: {
          ...c.qualification_page.header,
          [key]: value,
        }
      }
    }));
  }

  const addHeaderCta = (ctaId: string): void => {
    onConfigChange(c => ({
      ...c,
      qualification_page: {
        ...c.qualification_page,
        header: {
          ...c.qualification_page.header,
          ctas: [...c.qualification_page.header.ctas, ctaId],
        }
      },
    }));
  };

  const updateHeaderStyles = <K extends keyof SimpleStyle>(
    key: K,
    value: SimpleStyle[K]
  ): void => {
    let headerAmpProp : 'bg_color' | 'font_color' = 'bg_color';
    if (key === 'fontColor') {
      headerAmpProp = 'font_color';
    }
    amplitudeDemoQualBodyEdit({
      demo_qualification_body_prop: headerAmpProp,
      demo_qualification_body_value: value as string
    });
    onConfigChange(c => ({
      ...c,
      qualification_page: {
        ...c.qualification_page,
        header: {
          ...c.qualification_page.header,
          style: {
            ...c.qualification_page.header.style,
            [key]: value,
          },
        },
      },
    }));
  };

  const rearrangeHeaderCta = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(config.qualification_page.header.ctas, r.source.index, r.destination.index);

    onConfigChange(c => ({
      ...c,
      qualification_page: {
        ...c.qualification_page,
        header: {
          ...c.qualification_page.header,
          ctas: rearrangedArray,
        },
      },
    }));
  };

  const deleteHeaderCta = (ctaId: string): void => {
    amplitudeDemoQualBodyEdit({
      demo_qualification_body_prop: 'cta_delete',
      demo_qualification_body_value: ctaId
    });
    onConfigChange(c => {
      const ctaIdToBeDeleteIdx = c.qualification_page.header.ctas.findIndex(cta => cta === ctaId);
      c.qualification_page.header.ctas.splice(ctaIdToBeDeleteIdx, 1);

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          header: {
            ...c.qualification_page.header,
            ctas: [...c.qualification_page.header.ctas],
          },
        },
      };
    });
  };

  return (
    <div style={{
      paddingTop: '1rem'
    }}
    >
      <ActionPanel
        title="Header"
      >
        <div style={{
          ...commonActionPanelItemStyle,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          flex: 1,
        }}
        >
          <span className="typ-sm">Title</span>
          <InputText
            value={config.qualification_page.header.title}
            onBlur={(e) => {
              amplitudeDemoQualBodyEdit({
                demo_qualification_body_prop: 'title',
                demo_qualification_body_value: e.target.value
              });
            }}
            onChange={e => {
              updateHeader('title', e.target.value);
            }}
            style={{ height: '44px', width: '100%' }}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <SimpleStyleEditor
            simpleStyle={config.qualification_page.header.style}
            simpleStyleUpdateFn={updateHeaderStyles}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <DragDropContext
            onDragEnd={rearrangeHeaderCta}
          >
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {config.qualification_page.header.ctas.map((ctaId, index) => {
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
                    .filter(v => !config.qualification_page.header.ctas.includes(v.id))
                    .map(v => ({
                      value: v.id,
                      label: v.text._val,
                    }))}
                  autoFocus
                  onChange={(e) => {
                    if (e) {
                      amplitudeDemoQualBodyEdit({
                        demo_qualification_body_prop: 'cta_select',
                        demo_qualification_body_value: e as string
                      });
                      addHeaderCta(e as string);
                      setIsCtaSelectOpen(false);
                    }
                  }}
                  suffixIcon={<CaretOutlined dir="down" />}
                />
                <p className="typ-sm">
                  You can create new call-to-action buttons under the CTA
                  section of this panel and then select it here to be shown in the top right corner of the page.
                </p>
              </div>
          )}
            trigger="click"
            placement="rightTop"
            onOpenChange={(visible) => {
              if (!visible) setIsCtaSelectOpen(false);
            }}
          >
            <GTags.OurLink
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: 'fit-content',
                marginTop: '0.5rem'
              }}
              onClick={() => setIsCtaSelectOpen(!isCtaSelectOpen)}
            >
              <PlusOutlined />
              <div>
                Select a CTA
              </div>
            </GTags.OurLink>
          </Popover>
        </div>
      </ActionPanel>
      <ActionPanel
        title="Qualification"
      >
        <p className="typ-sm">
          Qualify buyers by setting up criteria and then displaying demos based on their selection.
        </p>
        <p className="typ-sm">
          You can configure multiple criteria where each of them would have a unique URL slug.
        </p>
        {config.qualification_page.qualifications.map(q => (
          <div key={q.id} style={{ ...commonActionPanelItemStyle, margin: '5px 0' }}>
            <QualificationEditor
              qualification={q}
              activeQualificationId={activeQualificationId}
              setActiveQualificationId={setActiveQualificationId}
            />
          </div>
        ))}
        <div style={commonActionPanelItemStyle}>
          <GTags.OurLink
            style={{
              display: 'flex',
              gap: '0.5rem',
              width: 'fit-content'
            }}
            onClick={() => {
              amplitudeDemoQualBodyEdit({
                demo_qualification_body_prop: 'qualification_add',
                demo_qualification_body_value: true
              });
              onConfigChange(c => ({
                ...c,
                qualification_page: {
                  ...c.qualification_page,
                  qualifications: [
                    ...c.qualification_page.qualifications,
                    getSampleDemoHubQualification(
                      c.qualification_page.qualifications.at(-1)?.sidePanel || getSampleDemoHubQualificationSidePanel(),
                      getNewIndex(c.qualification_page.qualifications.map(ct => ct.title), 'Choose your experience') + 1
                    ),
                  ],
                },
              }));
            }}
          >
            <PlusOutlined />
            <div>
              Add a new qualification
            </div>
          </GTags.OurLink>
        </div>
      </ActionPanel>
    </div>
  );
}

export default QualificationTab;
