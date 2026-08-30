import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  title: string;
  helpText: string;
  active?: boolean;
  onClick?: () => void;
  id?: string;
}

export default function TabItem({ title, active, onClick, helpText, id }: Props): JSX.Element {
  return (
    <Tags.TabItem onClick={onClick} id={id} className="typ-reg">
      <Tags.TabTitle active={active}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        >
          <div>
            {title}
          </div>
          <Tooltip
            placement="bottomRight"
            title={
              <div color="#fff">{helpText}</div>
          }
          >
            <QuestionCircleOutlined className="ht-icn" />
          </Tooltip>
        </div>
        <Tags.TabActiveHighlight active={active} />
      </Tags.TabTitle>
    </Tags.TabItem>
  );
}
