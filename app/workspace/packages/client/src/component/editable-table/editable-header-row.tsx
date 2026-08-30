import React from 'react';
import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { getRandomId } from '@fable/common/dist/utils';
import { Button, Popover } from 'antd';
import { DatasetConfig } from '../../types';
import * as GTags from '../../common-styled';

interface EditableHeaderRowProps {
  dataset: DatasetConfig;
}

export function EditableHeaderRow({ dataset, ...props }: EditableHeaderRowProps) : JSX.Element {
  return <tr {...props} />;
}

interface HeaderCellProps {
  dataset: DatasetConfig;
  onDelete: (title: string) => void;
  onRename: (title: string) => void
  children: (JSX.Element | string)[];
  title: string;
}

export function EditableHeaderCell(
  { dataset, ...props }: HeaderCellProps
): JSX.Element {
  return (
    <th
      style={{
        minWidth: '80px',
      }}
      key={getRandomId()}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          className="overflow-ellipsis"
          style={{ textAlign: 'center', flexGrow: '1', maxWidth: '150px', fontWeight: '500' }}
        >
          {props.children}
        </div>
        {
          props.title !== 'id' && props.title !== 'Delete' && (
            <Popover
              content={
                <div onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                >
                  <GTags.PopoverMenuItem
                    onMouseDown={() => props.onRename(props.title)}
                  >
                    <EditOutlined />&nbsp;&nbsp;&nbsp;Rename Column
                  </GTags.PopoverMenuItem>

                  <GTags.PopoverMenuItemDivider color="#ff735050" />
                  <GTags.PopoverMenuItem
                    onMouseDown={() => props.onDelete(props.title)}
                    style={{
                      color: '#ff7350'
                    }}
                  >
                    <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Column
                  </GTags.PopoverMenuItem>
                </div>
            }
              trigger="focus"
              placement="right"
            >
              <Button
                style={{ padding: 0, margin: 0 }}
                size="small"
                shape="circle"
                type="text"
                icon={<MoreOutlined />}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </Popover>
          )
        }
      </div>
    </th>
  );
}
