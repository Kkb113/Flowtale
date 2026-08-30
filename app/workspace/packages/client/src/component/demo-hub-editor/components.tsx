import { DeleteOutlined, HolderOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import FableLogo from '../../assets/fable-rounded-icon.svg';
import * as GTags from '../../common-styled';
import { buttonSecStyle } from '../screen-editor/annotation-creator-panel';
import { showDeleteConfirm } from './delete-confirm';
import { IDemoHubConfigDemo } from '../../types';
import CaretOutlined from '../icons/caret-outlined';
import { useEditorCtx } from './ctx';
import { getTourByRid } from './utils';
import { amplitudeQualStepOptionEdit } from '../../amplitude';

interface Props {
  selectedDemos: IDemoHubConfigDemo[];
  rearrangeFn: (r: DropResult) => void;
  deleteDemoFn: (rid: string) => void;
  addDemoFn: (newDemo: IDemoHubConfigDemo) => void;
  updateDemoFn: (newDemo: IDemoHubConfigDemo) => void;
  selectDesc: string;
  emptyStateMsg: string;
  amplitudeDemoReload ?: (demoRid : string) => void
}

export default function DraggableDemosSelector(props: Props): JSX.Element {
  const { tours, getTourData, getUpdatedAllTours } = useEditorCtx();

  async function updateDemo(demoRid : string) : Promise<void> {
    try {
      const tour = await getTourData(demoRid);
      if (tour) {
        const newDemo : IDemoHubConfigDemo = {
          rid: demoRid,
          desc: tour.description,
          thumbnail: tour.thumbnailUri.href,
          name: tour.displayName
        };

        props.updateDemoFn(newDemo);
      }
    } catch (e) {
      raiseDeferredError(e as Error);
    }
  }
  return (
    <>
      <div>
        <div className="typ-sm">{props.selectDesc}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <GTags.FableSelect
            showSearch
            suffixIcon={<CaretOutlined dir="down" />}
            bordered={false}
            style={{ width: '100%' }}
            size="large"
            options={Object.values(tours)
              .filter(tour => !props.selectedDemos.find(demo => demo.rid === tour.rid))
              .map(tour => ({
                value: tour.rid,
                label: tour.displayName,
              }))}
            onSelect={(val) => {
              const tour = getTourByRid(tours, val as string)!;

              const newDemo: IDemoHubConfigDemo = {
                name: tour.displayName,
                thumbnail: tour.thumbnailUri.href,
                rid: tour.rid,
                desc: tour.description,
              };

              props.addDemoFn(newDemo);
            }}
            className="typ-ip"
            value=""
          />
          <Tooltip title="Reload demos" overlayStyle={{ fontSize: '0.75rem' }}>
            <Button
              icon={<ReloadOutlined />}
              type="text"
              size="small"
              style={buttonSecStyle}
              onClick={() => {
                getUpdatedAllTours();
              }}
            />
          </Tooltip>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: '500' }}>
          Selected demos:
        </div>

        {props.selectedDemos.length ? (
          <DragDropContext onDragEnd={props.rearrangeFn}>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {props.selectedDemos.map((demo, index) => (
                    <Draggable
                      key={demo.rid}
                      draggableId={demo.rid + index}
                      index={index}
                    >
                      {(providedInner, snapshotInner) => (
                        <div
                          key={demo.rid}
                          ref={providedInner.innerRef}
                          {...providedInner.draggableProps}
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
                              key={demo.rid}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  alignItems: 'center'
                                }}
                              >
                                <img src={FableLogo} height={16} alt="Fable logo" />
                                <GTags.OurLink
                                  href={`/preview/demo/${demo.rid}`}
                                  target="_blank"
                                  style={{
                                    display: 'inline-block',
                                    margin: 0
                                  }}
                                >
                                  {demo.name}
                                </GTags.OurLink>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  justifyContent: 'end'
                                }}
                              >
                                <Tooltip title="Reload demo" overlayStyle={{ fontSize: '0.75rem' }}>
                                  <Button
                                    icon={<ReloadOutlined />}
                                    type="text"
                                    size="small"
                                    style={buttonSecStyle}
                                    onClick={() => {
                                      if (props.amplitudeDemoReload) {
                                        props.amplitudeDemoReload(demo.rid);
                                      }
                                      updateDemo(demo.rid);
                                    }}
                                  />
                                </Tooltip>
                                <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
                                  <Button
                                    icon={<DeleteOutlined />}
                                    type="text"
                                    size="small"
                                    style={buttonSecStyle}
                                    onClick={() => {
                                      showDeleteConfirm(
                                        () => props.deleteDemoFn(demo.rid),
                                        'Are you sure you want to delete this demo from the section?',
                                      );
                                    }}
                                  />
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="typ-sm">{props.emptyStateMsg}</div>
        )}
      </div>
    </>
  );
}
