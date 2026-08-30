import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React, { useState } from 'react';
import { DraggableProvided, DropResult } from 'react-beautiful-dnd';
import { IDemoHubConfigSeeAllPageSection, SimpleStyle } from '../../../../types';
import { useEditorCtx } from '../../ctx';
import SimpleStyleEditor from '../../simple-styles-editor';
import { stringToSlug } from '../../utils';
import { buttonSecStyle } from '../../../screen-editor/annotation-creator-panel';
import { InputText } from '../../../screen-editor/styled';
import { showDeleteConfirm } from '../../delete-confirm';
import { rearrangeArray } from '../../../../utils';
import DraggableDemosSelector from '../../components';
import { ampliteDemoCollectionSectionEdited, amplitudeDemoCollectionBodyEdited } from '../../../../amplitude';
import { AMPLITUDE_SIMPLE_STYLE } from '../../../../amplitude/types';

interface Props {
  section: IDemoHubConfigSeeAllPageSection;
  providedInner: DraggableProvided;
}

export default function SectionEditor(props: Props): JSX.Element {
  const { onConfigChange, tours } = useEditorCtx();
  const [showEditor, setShowEditor] = useState(false);

  const updateSectionProp = <K extends keyof IDemoHubConfigSeeAllPageSection>(
    key: K,
    value: IDemoHubConfigSeeAllPageSection[K]
  ): void => {
    onConfigChange(c => {
      const sectionToBeUpdatedIdx = c.see_all_page.sections.findIndex(section => section.id === props.section.id);
      c.see_all_page.sections.splice(sectionToBeUpdatedIdx, 1, { ...props.section, [key]: value });

      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });
  };

  // this functionality is extracted into a separate method of its own to
  // avoid making 2 rapid called to onConfigChange
  const updateSectionTitle = (title: string): void => {
    onConfigChange(c => {
      // TODO confirm slug fn with akash
      const slug = stringToSlug(title);
      const sectionToBeUpdatedIdx = c.see_all_page.sections.findIndex(section => section.id === props.section.id);
      c.see_all_page.sections.splice(sectionToBeUpdatedIdx, 1, { ...props.section, title, slug });

      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });
  };

  const deleteDemoFromSection = (rid: string): void => {
    const demoToBeDeletedIdx = props.section.demos.findIndex(demo => demo.rid === rid);
    props.section.demos.splice(demoToBeDeletedIdx, 1,);
    updateSectionProp('demos', [...props.section.demos]);
    ampliteDemoCollectionSectionEdited(props.section.id, 'demo_delete', rid);
  };

  const deleteSection = (sectionId: string): void => {
    onConfigChange(c => {
      const sectionToBeDeletedIdx = c.see_all_page.sections.findIndex(section => section.id === sectionId);
      c.see_all_page.sections.splice(sectionToBeDeletedIdx, 1);
      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });

    amplitudeDemoCollectionBodyEdited('section_delete', sectionId);
  };

  const rearrangeSectionDemos = (r: DropResult): void => {
    if (!r.destination) return;

    const rearrangedArray = rearrangeArray(props.section.demos, r.source.index, r.destination.index);

    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        sections: c.see_all_page.sections.map(section => {
          if (section.id === props.section.id) {
            return { ...props.section, demos: rearrangedArray };
          }
          return section;
        })
      }
    }));
  };

  return (
    <div className={`grooveable ${showEditor ? 'opened' : 'closed'}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '0.5rem',
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
          key={props.section.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
            gap: '0.3rem'
          }}
        >
          <div>
            {props.section.title}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <Tooltip title="Delete button" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => {
                  showDeleteConfirm(
                    () => deleteSection(props.section.id),
                    'Are you sure you want to delete this section?',
                  );
                }}
              />
            </Tooltip>

            <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<EditOutlined />}
                type="text"
                size="small"
                style={{
                  ...buttonSecStyle,
                  color: showEditor ? '#7567ff' : 'unset'
                }}
                onClick={() => {
                  setShowEditor(prevState => !prevState);
                  amplitudeDemoCollectionBodyEdited('section_edit', props.section.id);
                }}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {showEditor && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            margin: '8x 12px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div
              className="typ-sm"
              style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>Title</span>
              <span
                className="typ-sm"
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.7rem'
                }}
              >
                URL slug {' '}
                <span
                  style={{
                    backgroundColor: '#e4e4e4',
                    borderRadius: '4px',
                    padding: '0 4px',
                  }}
                >
                  {props.section.slug}
                </span>
              </span>
            </div>
            <InputText
              value={props.section.title}
              onChange={(e) => {
                updateSectionTitle(e.target.value);
              }}
              type="text"
              style={{ height: '44px', width: '100%' }}
              onBlur={e => ampliteDemoCollectionSectionEdited(props.section.id, 'title', e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div className="typ-sm">Description</div>
            <InputText
              value={props.section.desc}
              onChange={e => updateSectionProp('desc', e.target.value)}
              type="text"
              style={{ height: '44px', width: '100%' }}
              onBlur={e => ampliteDemoCollectionSectionEdited(props.section.id, 'description', e.target.value)}
            />
          </div>

          <DraggableDemosSelector
            selectedDemos={props.section.demos}
            deleteDemoFn={deleteDemoFromSection}
            rearrangeFn={rearrangeSectionDemos}
            addDemoFn={(newDemo) => {
              updateSectionProp('demos', [...props.section.demos, newDemo]);
              ampliteDemoCollectionSectionEdited(props.section.id, 'demo_add', newDemo.rid);
            }}
            updateDemoFn={(newDemo) => {
              updateSectionProp('demos', props.section.demos.map(demo => {
                if (demo.rid === newDemo.rid) {
                  demo.desc = newDemo.desc;
                  demo.name = newDemo.name;
                  demo.thumbnail = newDemo.thumbnail;
                }
                return demo;
              }));
              ampliteDemoCollectionSectionEdited(props.section.id, 'demo_reload', newDemo.rid);
            }}
            selectDesc="Select demos to add in this section"
            emptyStateMsg="There are no demos in this section. Use the above drop down to select demo for this section."
          />
        </div>
      )}
    </div>
  );
}
