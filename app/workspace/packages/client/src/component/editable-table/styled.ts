import styled from 'styled-components';

export const EditableTable = styled.div`
  display: flex;
  align-items: stretch;
  --button-width: 1.5rem;

  .empty-ds-con {
    width: 225px;
    height: 225px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 4px;
    text-align: center;
    margin-bottom: var(--button-width);
  }

  .add-row-btn,
  .add-col-btn {
    outline: none;
    border: none;
    background-color: #eeeeee;
    border-radius: 4px;
    color: gray;
    cursor: pointer;
    transition: background-color 300ms ease;
  }

  .add-row-btn:hover,
  .add-col-btn:hover {
    background-color: rgba(0,0,0,0.2);
  }

  .add-col-btn {
    display: block;
    width: var(--button-width);
    margin-bottom: var(--button-width);
    margin-left: 0.25rem;
  }

  .add-row-btn {
    display: block;
    height: var(--button-width);
    margin-top: 0.25rem;
  }
`;

export const ErrorMsg = styled.p`
  font-size: 14px;
  margin: 0px;
  color : red;
`;
