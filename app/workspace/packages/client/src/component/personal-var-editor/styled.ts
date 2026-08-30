import styled from 'styled-components';

export const VarEditorCon = styled.div<{
}>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
  padding: 0.5rem;
  border-radius: 1rem;

  p {
    margin: 0;
  }

  code {
    background-color: rgba(0,0,0,0.1);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .demo-url {
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1rem;
    width: 100%;

    .demo-url-title {
      font-size: 1rem;
    }

    code {
      display: flex;
      overflow-x: auto;
      width: 80%;
      
      .url-code {
        font-family: "IBM Plex Mono", monospace !important;
      }
    }
  }

  .typ-reg {
    code {
      font-size: 0.8rem;
    }
  }

  .per-var-input-con {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    max-height: 180px;
    overflow-y: auto;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(0,0,0,0.1);

    .per-var-input-wrapper {
      width: 90%;
    }

    .pers-vars-info {
      color: gray;
      font-size: 0.8rem;
      font-style: italic;
      margin: 0.25rem 0;
    }

    .pers-var-input {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      
      .pervar-label {
        display: flex;
        align-items: center;
        gap: 1rem;

        code {
          font-size: 0.8rem;
        }
      }
    }
  }

  .errors { 
    padding: 0rem 1rem 0 1rem;
    height: 80px;
    overflow-y: auto;

    .error {
      margin-bottom: 0.25rem;
      font-size: 0.8rem;
    }

    &.error:first-child {
      border-top: 2px solid rgba(0,0,0,0.2);
    }
  }

  .bottom-btns {
    display: flex;
    align-items: center;
    justify-content: right;
    gap: 1rem;
  }
`;

export const VarEditorCon2 = styled.div<{
  showAsPopup: boolean;
  showEditor: boolean;
  x: number;
  y: number;
  h:number
}>`
  position: relative;
  top: 0;
  height: ${props => `${props.h}px`};
  transform: ${props => `translate(-${props.x}px, ${props.y}px)`};
  box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  background: white;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;

  .heading {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .heading-h4 {
      padding: 0;
      margin: 0;
    }

    .close-btn {
      cursor: pointer;
      background-color: none;
      background: none;
      outline: none;
      border: none;
      font-size: 1.2rem;
      padding: 0.25rem 0.5rem;

      &:hover {
        background-color: rgba(0,0,0,0.1);
        border-radius: 100%;
        transition: background-color 200ms;
      }
    }
  }

  .popup-btn {
    display: ${props => (props.showAsPopup ? 'block' : 'none')};
    border-radius: 0.25rem;
    font-size: 1.5rem;
    padding: 0.375rem 0.5rem;
    background-color: transparent;
    color: black;
  }

  .loading-state {
    text-align: center;
  }

  .pers-var-editor {
  }
`;
