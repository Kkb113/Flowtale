import styled from 'styled-components';

export const InputContainer = styled.label`
  padding: 4px 11px;
  background-color: white;
  border: 1px dashed #BDBDBD;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 40px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    border: 1px solid #747474;
  }
`;
