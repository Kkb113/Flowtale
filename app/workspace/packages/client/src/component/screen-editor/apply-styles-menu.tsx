import { MoreOutlined } from '@ant-design/icons';
import { Dropdown, Button as AntButton, } from 'antd';
import React, { useMemo } from 'react';
import * as Tags from './styled';

interface Props {
  onApplyGlobal?: () => void;
  onApplyAll?: () => void;
  isGlobal: boolean;
}

interface MenuItem {
  label: string;
  key: string;
}

interface MenuClickEventHandlerArguments {
  key: string;
}

function ApplyStylesMenu({ onApplyGlobal, onApplyAll, isGlobal } : Props) : JSX.Element {
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];
    if (onApplyAll) {
      items.push({ label: 'Apply to All', key: 'apply_to_all' });
    }
    if (onApplyGlobal) {
      items.push({ label: 'Apply Global Style', key: 'apply_globally' });
    }
    return items;
  }, [onApplyGlobal, onApplyAll]);

  const clickHandler = (info: MenuClickEventHandlerArguments): void => {
    if (info.key === 'apply_to_all' && onApplyAll) {
      onApplyAll();
    } else if (info.key === 'apply_globally' && onApplyGlobal) {
      onApplyGlobal();
    }
  };

  if (menuItems.length === 0) {
    return <></>;
  }

  return (
    <Tags.StyledPopover
      trigger="click"
      content={
        <Tags.PopoverMenuCon>
          {onApplyAll && (
            <Tags.PopoverMenu type="button" onClick={onApplyAll}>
              Apply to All
            </Tags.PopoverMenu>
          )}

          {onApplyGlobal && (
            <>
              <Tags.PopoverMenu type="button" onClick={onApplyGlobal}>
                Apply Global Style
              </Tags.PopoverMenu>
              <p className="typ-sm" style={{ padding: '0 0.5rem', margin: '0' }}>
                {isGlobal
                  ? 'Global style is already applied for this property'
                  : 'This property has been overridden locally.'}
              </p>
            </>
          )}
        </Tags.PopoverMenuCon>
      }
    >
      <AntButton
        size="small"
        shape="circle"
        type="text"
        icon={<MoreOutlined />}
      />
    </Tags.StyledPopover>
  );
}

export default ApplyStylesMenu;
