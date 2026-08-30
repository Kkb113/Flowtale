import styled from 'styled-components';
import { Popover } from 'antd';

export const StyledPopover = styled(Popover)`
margin-left: calc(100% - 16px);
.ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #EAEAEA !important;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const PopoverMenuCon = styled.div`
  width: 180px;
`;

export const PopoverMenu = styled.button`
  display: block;
  background-color: white;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  color: #16023E;

  &:hover {
    background-color: #F8F8F8;
  }
`;
