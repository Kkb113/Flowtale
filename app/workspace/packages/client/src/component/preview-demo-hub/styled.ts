import styled from 'styled-components';

export const ButtonCon = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 0;
  left: 0;
  top: 0;
  position: absolute;
  transform: translate(64px, 8px);
  z-index: 99;

  .ant-segmented {
    border-radius: 8px;
    transition: background 0.3s ease-out;

    .ant-segmented-item-selected {
      background: #160245;
      border-radius: 8px;
      color: white;
      font-weight: 500;
    }
  }
`;

export const PreviewIFrame = styled.iframe`
  border: none;
  background: white;
  box-shadow: rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px;
  border-radius: 8px;
`;
