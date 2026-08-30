import { RightSquareFilled } from '@ant-design/icons';
import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0;
  overflow-y: hidden;
  background: linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%);
`;

export const PreviewFrameWrapper = styled.div<{ showOverlay: boolean }>`
  flex-grow: 1;
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: start;
  gap: 1rem;
  margin: 1rem;
  margin-bottom: 0;
  position: relative;
  transform-origin: 50% 0;

  .replay-overlay {
    position: absolute;    
    background-color: ${({ showOverlay }) => (showOverlay ? 'rgba(0, 0, 0, 0.8)' : '')};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .preview-frame {
    border: none;
  }
`;

export const QuickEditPanel = styled.div<{
  h: number;
  x: number;
  y: number;
}>`
  position: relative;
  top: 0;
  height: ${props => `${props.h}px`};
  transform: ${props => `translate(-${props.x}px, ${props.y}px)`};
  background: transparent;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
  font-size: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .panel-item {
    cursor: pointer;
  }
`;

export const HeaderCon = styled.div`
  align-self: stretch;
  position: static;
  background-color: #160245;
  color: #FFF;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
`;

export const QuickEditPopoverCon = styled.div<{drawBorder?: boolean, additionalPadding?: boolean}>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  background-color: white;
  padding: calc(10px + ${p => (p.additionalPadding ? '10px' : '0px')});
  border-radius: 10px;
  box-shadow: ${p => (p.drawBorder ? 'var(--card-box-shadow-active)' : 'none')};
  
  .close-btn {
    font-size: 0.65rem;
    cursor: pointer;
    align-self: flex-end;
  } 
`;

export const QuillyCon = styled.div`
  width: 80%;
  display: flex;
  margin-bottom: 1rem;
  gap: 0.5rem;
  align-items: end;
`;

export const QuillySubmit = styled(RightSquareFilled)<{disabled: boolean}>`
  cursor: ${props => (props.disabled ? 'not-allowed !important' : 'pointer')};
  color: ${props => (props.disabled ? '#777' : '#000')};
  font-size: 1.5rem;
`;

export const QuillyInputCon = styled.div`
  flex-grow:1;
  display: flex;
  flex-direction: column;

  textarea {
    background: #ffffff91;
    border: none;
    border-radius: 6px;
    box-shadow: var(--card-box-shadow-active);
    opacity: 0.8;
    height: 48px;
    padding: 4px 6px;
    transition: all 0.2s ease-out;

    &:focus, &:active, &:focus-visible {
      outline: none;
      opacity: 1;
    }
  }
`;

export const QuillyEditPanel = styled.div<{
  x: number;
  y: number;
}>`
  position: relative;
  top: 0;
  transform: ${props => `translate(-${props.x}px, ${props.y}px)`};
  background: transparent;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
  font-size: 1.5rem;

  .panel-item {
    cursor: pointer;
  }
`;

export const EditCon = styled.div`
  height: 90%;  
  flex-direction: column;
  justify-content: space-between;
`;

export const PopoverCon = styled.div`
  margin: auto;
  margin-bottom: -20px;
  display: flex;
  align-items: center;
  height: 100%;
  justify-content: center;
  transform: scale(0.9);
  flex-direction: column;
`;
