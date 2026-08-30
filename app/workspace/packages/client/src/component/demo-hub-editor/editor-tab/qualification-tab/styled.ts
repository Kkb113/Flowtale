import styled from 'styled-components';

export const QualificationCollapseCon = styled.div`
  margin-left: 6px;

  .ant-collapse-item {
    margin-bottom: 0.75rem;
    border-radius: 8px !important;
    background: #e0e0e029;

    .ant-collapse-header {
      background: #e0e0e029;
    }

    .ant-collapse-content {
      background: #e0e0e029;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      border: none !important;
    }
  }

  .ant-collapse-item-active {
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  }

  .ant-collapse-content-active {
    border: none !important;
  }

  .ant-collapse {
    background: unset;
    border: none;
  }
`;
