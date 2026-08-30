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
    outline : 1px solid #e6e6e6;
    :focus-visible {
      border: none;
    }
  }
`;
