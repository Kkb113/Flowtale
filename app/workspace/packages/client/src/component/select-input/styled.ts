import { Select } from 'antd';
import type { SelectProps } from 'antd';
import styled from 'styled-components';

export const SelectInputContainer = styled.div`
  position: relative;
  width: 100%;

   label {
        position: absolute;
        top: -8px;
        left: 16px;
        display: flex;
        align-items: center;
        pointer-events: none;
        font-size: 12px;
        background-color: white;
    }
`;

export const SelectInput = styled(Select as React.FC<SelectProps>)`
  width: 100%;
  border: 1px dashed #BDBDBD !important;

  &:hover {
    border: 1px solid #747474 !important;
  }
  
  .ant-select-selector {
    height: 48px !important;
    border: none !important;
  }
  
  .ant-select-selection-item {
    padding: 8px !important;
  }
`;
