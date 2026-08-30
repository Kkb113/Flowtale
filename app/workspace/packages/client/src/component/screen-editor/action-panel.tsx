import { QuestionCircleOutlined } from '@ant-design/icons';
import React, { ReactElement, useState } from 'react';
import { Tooltip } from 'antd';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import CaretOutlined from '../icons/caret-outlined';
import UpgradeIcon from '../upgrade/icon';

interface IProps {
  id?: string;
  icon?: ReactElement;
  title?: string;
  helpText?: string;
  withGutter?: boolean;
  alwaysOpen?: boolean
  sectionActionElWhenOpen?: ReactElement
  isFeatureRestricted?: boolean;
  setShowUpgradeModal?: (open: boolean)=>void;
}

function ActionPanel(props: React.PropsWithChildren<IProps>): JSX.Element {
  const [collapsed, setCollapsed] = useState(!props.alwaysOpen);

  return (
    <Tags.ActionPanel className={`${props.id ?? ''} ${collapsed ? 'closed' : 'opened'}`} gutter={!!props.withGutter}>
      {props.title && (
        <Tags.ActionPanelTitleCon
          id={props.id}
          onClick={() => {
            props.isFeatureRestricted
              ? props.setShowUpgradeModal!(true)
              : setCollapsed(!collapsed);
          }}
          className={`typ-h2 ${collapsed ? '' : 'selected'}`}
        >
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <div className="title">
              {props.icon ? (<>{props.icon}&nbsp;&nbsp;</>) : ''}
              {props.title}
            </div>
            {props.isFeatureRestricted && <UpgradeIcon />}
            {props.helpText && (
              <Tooltip
                placement="bottomRight"
                overlayStyle={{ fontSize: '0.75rem' }}
                title={props.helpText}
              >
                <QuestionCircleOutlined className="ht-icn" />
              </Tooltip>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '0.35rem',
            alignItems: 'center',
          }}
          >
            {!collapsed && props.sectionActionElWhenOpen && (props.sectionActionElWhenOpen)}
            {!props.alwaysOpen && (
              collapsed ? (
                <CaretOutlined dir="down" />
              ) : (
                <CaretOutlined dir="up" />
              )
            )}
          </div>
        </Tags.ActionPanelTitleCon>
      )}
      {!collapsed && (
        <div className="body typ-reg" style={{ padding: '0.25rem 0' }}>
          {props.children}
        </div>
      )}
    </Tags.ActionPanel>
  );
}

export default ActionPanel;
