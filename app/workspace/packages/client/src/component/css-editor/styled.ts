import styled from 'styled-components';

export const EditorCon = styled.div`
  padding: 0;

  textarea {
    margin: 0;
    padding: 0;
    font-size: 12px;
    resize: vertical;
    width: calc(100% - 16px);
    padding: 4px 8px;
    min-height: 120px;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    color: #616161;
    :focus-visible {
      outline: none;
      border: none;
    }
  }
`;

export const InfoTextCon = styled.div`
  font-size: 12px;
  overflow-x: auto;
  width: 100%;
  white-space: nowrap;
  margin-bottom: 4px;

  &::-webkit-scrollbar {
    width: 1px;
    height: 1px;
  }

  pre {
    margin: 0 4px;
    display: inline-block;
    color: #1d62f0;
    font-weight: 500;
  }
`;

export const EditorBtn = styled.span`
  cursor: pointer;
  transition: all 0.2s ease-out;

  &:hover {
    transform: translate(1px, -1px);
  }


  &.primary {
    border: 1px solid #757575;
    background: #757575;
    color: white;
    padding: 2px 4px;
    border-radius: 4px;
  }

  &.outline {
    border: 1px solid #757575;
    padding: 2px 4px;
    border-radius: 4px;
    color: #757575;
  }

  &.link {
    border: 1px solid transparent;
    padding: 2px 4px;
    border-radius: 4px;
    color: #616161;
  }
`;
