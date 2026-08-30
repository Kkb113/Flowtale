import styled, { keyframes } from 'styled-components';
import { Modal, Tabs, Button } from 'antd';

export const ScreenPickerContainer = styled(Modal)`    
    .ant-modal-content {
      height: 90vh;
      top: -50px;
    }

    .ant-modal-body{
      height: 100%;
    }

    .ant-modal-content .anticon {
      color: #000;
    }
  `;

export const ScreenPicker = styled.div`
    display: flex;
    flex-direction: row;
    gap: 1rem;
    padding: 0.25rem;
    position: relative;
    flex-wrap: wrap;
    scrollbar-color: var(--fable-scrollbar-color);
    scrollbar-width: thin;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar-track {
      padding: 2px 0;
      background-color: var(--fable-scrollbar-track);
      border-radius: 10px;
      border: 1px solid #F3F4F6;
    }
  
    &::-webkit-scrollbar {
      margin: 4px 0;
      height: 4px;
      width: 6px;
    }
  
    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: var(--fable-scrollbar-thumb);
    }
  `;

export const ScreenPickerTabs = styled(Tabs)`
      height: 100%;

      .ant-tabs-content {
        height: 100%;
      }

      .ant-tabs-tabpane {
        height: 100%;
      }
  `;

export const ScreenTab = styled.div`
      height: 100%;
      display: flex;
      flex-direction: column;
  `;

const bottomToTop = keyframes`
  0% {  opacity: 0; }
  100% { opacity: 1; }
`;

export const Screen = styled.div<{bordered?: boolean, dontSelect?: boolean}>`
    background: #FFFFFF;
    border-radius: 10px;
    padding: 0.5rem;
    width: 214px;
    height: 180px;
    flex-basis: 17%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 16px;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    transition: box-shadow 0.2s ease-in-out;
    outline: ${(props) => (props.bordered ? '1px dashed #16023e' : 'none')};
    
    &:hover {
      cursor: ${(props) => (props.dontSelect ? 'inherit' : 'pointer')};
      outline: ${(props) => (props.dontSelect ? 'none' : '1px solid #16023e')};
    }  
  `;

export const ScreenThumbnail = styled.img`
    height: 7rem;
    object-fit: cover;
    box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
    border-radius: 0.5rem;
`;

export const ScreenContent = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 0.75rem;
  flex-grow: 1;
  overflow: auto;
  justify-content: space-between;

  .card-title{
    font-size: 1rem;
    font-weight: 500;
    height: 1.5rem;
    overflow: hidden;
  }
  .shorten {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const ScreenLink = styled.div`
    display: flex;
    column-gap: 0.5rem;
    height: 1.3rem; 
    overflow: hidden;
  `;

export const ScreenTitleIconCon = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  `;

export const UploadImgCont = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  gap: 1rem;
`;

export const ErrorMsg = styled.div`
    color: red;
    margin-top: 0.5rem;
    text-align: center;
  `;

export const Blur = styled.div`
    position: absolute;
    bottom: 0;
    width: 97%;
    height: 60px;
    position: absolute;
    filter: blur(1px);
    background-color: rgba(255,255,255, 0.45);
  `;

export const FlexColCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
`;

export const ScreenPickerCon = styled.div`
  position: fixed;
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  /* padding-top: 6.125rem; */
  align-items: center;
  background-color: transparent;
  backdrop-filter: blur(32px) saturate(0.25);
  z-index: 1020;
  top: 0;
  left: 0;
  animation: ${bottomToTop} 0.3s ease-out;
`;

export const CloseIcon = styled.img`
  position: absolute;
  height: 2rem;
  width: 2rem;
  top: 40px;
  right: 40px;
  cursor: pointer;
  background: #ffffffc4;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease-out;

  &:hover {
    background: #ffffff;
  }
`;

export const FableLogo = styled.img`
  position: absolute;
  width: 90px;
  top: 40px;
  left: 70px;
`;

export const PolkaDotGridBg = styled.div`
  position: absolute;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  background-color: #FFFFFF;
  opacity: 0.4;
  background-image: radial-gradient(#bfbfc0 1px, #FFFFFF 1px);
  background-size: 20px 20px;
`;

export const MsgCon = styled.div`
  margin-top: 6.125rem;

  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Heading = styled.div`
  color: #222;
  text-align: center;
`;

export const SubHeading = styled.div`
  color: #16023E;
  text-align: center;
`;

export const ScreenCardCon = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  padding: 1rem;

  scrollbar-color: var(--fable-scrollbar-color);
  scrollbar-width: thin;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar-track {
    padding: 2px 0;
    background-color: var(--fable-scrollbar-track);
    border-radius: 10px;
    border: 1px solid #F3F4F6;
  }

  &::-webkit-scrollbar {
    margin: 4px 0;
    height: 4px;
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: var(--fable-scrollbar-thumb);
  }
`;

export const LoadNextCon = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: auto;
`;

export const ScreenOptionPopoverCon = styled.div`
  max-width: 320px;

  .title {
    font-size: 1rem;
    font-weight: 500;
  }
`;
