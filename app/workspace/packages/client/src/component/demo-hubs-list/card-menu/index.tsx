import { DeleteOutlined, EditOutlined, MoreOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button as AntButton, Popover, Button, } from 'antd';
import React, { Dispatch, SetStateAction } from 'react';
import * as GTags from '../../../common-styled';
import { ModalState } from '../types';

interface Props {
    changeModalState : Dispatch<SetStateAction<ModalState>>
}

function DemoOptionsMenu(props : Props) : JSX.Element {
  return (
    <Popover
      content={
        <div onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        >
          <GTags.PopoverMenuItem
            onMouseDown={e => {
              props.changeModalState({ type: 'rename', show: true });
            }}
          >
            <EditOutlined />&nbsp;&nbsp;&nbsp;Rename demo hub
          </GTags.PopoverMenuItem>
          <GTags.PopoverMenuItemDivider color="#ff735050" />
          <GTags.PopoverMenuItem
            onMouseDown={e => {
              props.changeModalState({ type: 'delete', show: true });
            }}
            style={{
              color: '#ff7350'
            }}
          >
            <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete demo hub
          </GTags.PopoverMenuItem>
        </div>
      }
      placement="right"
    >
      <Button
        size="small"
        shape="circle"
        id="TG-3"
        type="text"
        style={{ padding: 0, margin: 0 }}
        icon={<MoreOutlined />}
      />
    </Popover>
  );
}

export default DemoOptionsMenu;
