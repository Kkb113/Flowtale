import styled from 'styled-components';
import { Drawer } from 'antd';
import { ModalPosition } from './types';

export const TILE_STROKE_COLOR_ON_HOVER = '#160245';
export const TILE_STROKE_COLOR_DEFAULT = '#E0E0E0';
export const TILE_STROKE_COLORON_SELECT = '#160245';
export const MENU_ICN_DOTS_COLOR = '#160245';
export const MENU_ICN_BG_COLOR = '#E6E6E6';

export const SVGCanvas = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;

  .fade {
    opacity: 0.2;
  }

  image {
    cursor: pointer;
  }

  .imageHover:hover {
    outline: 2px solid lightgray;
  }

  line {
    cursor: pointer;
  }

  .canvasElArea {
    fill: transparent
  }

  .node {
    .droptg {
      fill: #15034517;
      stroke: #150345;
      stroke-dasharray: 2 3;

      &.sel {
        fill: #d0d0ff;
        stroke: #150345;
        stroke-width: 2;
        stroke-dasharray: none;
      }
    }

    .tg-hide {
      display: none;
    }

    .tg-show {
      display: block;

      &.rev {
        display: none;
      }
    }

  }
`;

export const CanvasMenuCon = styled.div`
  position: absolute;
  background: white;
  left: 30px;
  position: absolute;
  top: 30px;
  border-radius: 8px;
  padding: 30px 0px 0px 0px;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
  
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &:before {
    content: '';
    width: 100%;
    position: absolute;
    height: 30px;
    top: 0;
    background: #cdcdcd;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
  }

  & > div:first-child {
    margin-top: 0.75rem;
  }

  & > div:last-child {
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;

export const CanvasMenuItemCon = styled.div`
  display: flex;
  background: white;
  flex-direction: column;
  padding: 0 0.5rem;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;

export const MenuModal = styled.div<{xy: ModalPosition}>`
  left: ${props => (props.xy[2] === 'l' ? props.xy[0] : 'auto')}px;
  right: ${props => (props.xy[2] === 'r' ? props.xy[0] : 'auto')}px;
  top: ${props => props.xy[1]}px;
  position: absolute;
  font-size: 0.9rem;
  z-index: 2;
  border-radius: 16px;  
  border: 1px solid #EAEAEA;
  background: var(--White, #FFF);
  box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08);
  color: #16023E;
  padding: 1rem 0.5rem;

  div.menu-item {
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 1rem;
    line-height: 20px; 

    .subtext {
      font-size: 0.75rem;
      color: #747474;
    }

    &:hover {
      background: #F8F8F8;
      cursor: pointer;
    }
  }

  div.danger {
    color: red;
  }

`;

export const MenuModalMask = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  background: transparent;
`;

export const AnnEditorModalCon = styled.div`
  animation: fade-in 1.75s ease-out;
    
  @keyframes fade-in {
    0% {
      opacity: 0;
    }

    50% {
      opacity: 0;
    }

    75% {
      opacity: 1;
    }

    100% {
      opacity: 1;
    }
  }
`;

export const AnnEditorModalArrow = styled.svg<{top: number, left: number, applyTransition: boolean}>`
  position: absolute;
  top: ${props => `${props.top}px`};
  left: ${props => `${props.left}px`};
  transform: translateX(-50%);
  transition:${props => (props.applyTransition ? 'left 0.5s ease-in-out' : 'none')};
`;

export const AnnEditorModalWrapper = styled.div<{top: number}>`
  position: absolute;
  top: ${props => `${props.top}px`};
  left: 10px;
  right: 10px;
  bottom: 10px;
  width: calc(100% - 20px);
  background-color: white;
  transition: all 0.3s ease;
  border-radius: 20px;
  box-shadow: var(--card-box-shadow-active);
`;

export const AnnEditorModal = styled.div`
  height: 100%;
  margin: auto;
  border-radius: 20px;
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

export const JourneyAddedIcon = styled.div`
  position: absolute;
  background-color: #160245;
  width: 5px;
  height: 5px;
  z-index: 100;
  border-radius: 50%;
  top: 3px;
  right: 4px;
`;

export const MultiNodeModalWrapper = styled.div<{top: number, left: number, width: number, maxHeight: string}>`
  position: absolute;
  top: ${props => `${props.top}px`};
  left: ${props => `${props.left}px`};
  max-height: ${props => `${props.maxHeight}`};
  width:  ${props => `${props.width}px`};
  background-color: #f1f1f1;
  box-shadow: #9e96fa 0px 0px 1px 2px;
  transition: all 0.3s ease;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  height: 100%;
`;

export const MultiNodeModal = styled.div`
  height: 100%;
  margin: auto;
  border-radius: 20px;
  scrollbar-color: var(--fable-scrollbar-color);
  scrollbar-width: thin;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;

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

export const AnnNode = styled.div`
  height: ${(p :AnnNodeProps) => `${p.height}px`};
  width: ${(p :AnnNodeProps) => `${p.width}px`};
  border-radius: ${(p :AnnNodeProps) => `${p.borderRadius}px`};
  cursor: pointer;
  background-color: white;
  box-shadow: rgba(0, 0, 0, 0.7) 3px 5px 2px;
  margin: auto;
  margin-bottom: 20px;
  position: relative;
  opacity: 0;
  animation: fade-in 0.5s ease forwards;
  outline: ${(p :AnnNodeProps) => (p.isSelected ? `5px solid ${TILE_STROKE_COLORON_SELECT}` : '')};
  &:hover{
    outline: 5px solid ${TILE_STROKE_COLOR_ON_HOVER};
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }

    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

interface AnnNodeProps {
  height: number;
  width: number;
  borderRadius: number;
  isSelected: boolean;
}

export const StepNumberWrapper = styled.div`
  background: radial-gradient(95% 120% at 0px 120%, rgba(13, 18, 22, 0.7), rgba(0, 0, 0, 0));
  padding-right: 15px;
  display: flex;
  align-items: flex-end;
  hwight: 100%;
  width: fit-content;
  height: 30px;
`;

export const AnnNodeStepNumber = styled.p`
  bottom: 0;
  color: white;
  font-weight: 600;
  font-size: 12px;
  text-shadow: rgba(0,0,0,1) 2px 7px 15px, rgb(0,0,0) 2px 0px 11px;
  padding: 2px 6px;
  text-align: left;
  display: inline-block;
  margin: 0;
`;

export const AnnDisplayText = styled.div`
  position: absolute;
  top: 0;
  overflow: hidden;
  font-size: 12px;
  margin: 0;
  padding: 8px 2px;
  text-align: center;
  background: rgba(0,0,0,0.2);
  border-radius: 20px;
`;

export const MultiNodeModalClose = styled.div`
  display: flex; 
  flex-direction: row-reverse; 
  margin: 0px 10px;
  height: 20px;
`;

export const StyledDrawer = styled(Drawer)`
  .ant-radio {
    align-self: unset;
  }

  .ant-drawer-header-title {
    flex-direction: row-reverse;
  }

  h3 {
    font-weight: 500;
  }

  h4 {
    font-weight: 400;
  }

  .highlighted-link {
    color: white;
    background: #7567ff;
    font-weight: 500;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
  }
`;

export const CaptureCon = styled.div`
  position: absolute;
  background: white;
  right: 30px;
  position: absolute;
  top: 30px;
  border-radius: 8px;
  padding: 0px 0px 0px 0px;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
  
  display: flex;
  flex-direction: column;
  gap: 0.75rem;


  & > div:first-child {
    margin-top: 0.75rem;
  }

  & > div:last-child {
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;
