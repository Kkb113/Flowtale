import { FrameSettings } from '@fable/common/dist/api-contract';
import styled from 'styled-components';
import { IframePos } from '../../types';
import { MAC_FRAME_HEIGHT } from '../../utils';

export const Frame = styled.div<{iframePos : IframePos, mode : FrameSettings, scaleFactor : number, zIndex: number}>`
  width: ${({ iframePos, scaleFactor }) => `${iframePos.width * (1 / scaleFactor)}px`};;
  height: ${MAC_FRAME_HEIGHT}px;
  position: absolute;
  top: ${({ iframePos, scaleFactor }) => `${iframePos.top - (MAC_FRAME_HEIGHT * scaleFactor)}px`};
  left: ${({ iframePos }) => `${iframePos.left}px`};
  background-color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#dedad6' : '#171717')};
  border-radius: 0.5rem 0.5rem 0 0;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: scale(${({ scaleFactor }) => `${scaleFactor}`});
  transform-origin: 0 0%;
  z-index: ${({ zIndex }) => zIndex};

  .anim-con {
    transition: opacity 0.3s ease-in-out;

    &.show {
      opacity: 1;
    }

    &.hide {
      opacity: 0;
    }
  }

  .ctrl-btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;

    .ctrl-btn {
      border-radius: 100%;
      width: 10px;
      height: 10px;
    }
  }

  .central-options {
    margin: 0;
    padding: 0;
    display: flex;
    position: relative;
    gap: 0.5rem;
    align-items: center;
    width:  ${({ iframePos, scaleFactor }) => (iframePos.width * (1 / scaleFactor) < 960 ? '50%' : 'auto')};

    .central-btn {
      border: none;
      outline: none;
      background-color: transparent;
      cursor: pointer;
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};
    }

    .central-title {
      margin: 0;
      padding: 0.125rem 0.5rem;
      font-size: 0.875rem;
      background-color:${({ mode }) => (mode === FrameSettings.LIGHT ? '#f4f4f0' : '#404040')};
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: ${({ iframePos, scaleFactor }) => (iframePos.width * (1 / scaleFactor) < 960 ? '80%' : '480px')};
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};

      .module-btn {
        flex: 1 1 auto;
        text-align: center;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 480px;
      }
    }
   
    .module-root-con {
      position: absolute;
      top: 32px;
      width: 100%;
    }
  }

  @keyframes module-menu {
    0% {
      opacity: 0
    }

    100% {
      opacity: 1
    }
  }

  .right-btns {
    display: flex;
    gap: 0.5rem;
    button {
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};
    }
  }
`;
