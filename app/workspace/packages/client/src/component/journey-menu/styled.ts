import { CreateJourneyPositioning } from '@fable/common/dist/types';
import { Button } from 'antd';
import styled from 'styled-components';
import { getColorContrast } from '../../utils';

export interface DropdownConf {
  positioning: CreateJourneyPositioning;
  top?: number;
  left?: number;
  transformTranslateX?: number;
}

export const DropdownCon = styled.div`
  z-index: 9999;
  position: absolute; 
  left: ${(p: DropdownConf) => (`${p.left}px` || '20px')};
  transform: ${(p: DropdownConf) => (`translate(${p.transformTranslateX}%, 0%)`)};
  ${(p: DropdownConf) => ((p.top ? `top: ${p.top}px;` : 'bottom: 40px;'))};
  height: 0px;
  width: 0px;
`;

export const JourneyCon = styled.div<{maxW: string, moduleTheme: 'light' | 'dark'}>`
  background-color: ${props => (props.moduleTheme === 'light' ? '#eaeaea' : '#3c3c3c')};
  color: ${props => (props.moduleTheme === 'dark' ? '#fff' : '#171717')};
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
  border: 1px solid ${props => (props.moduleTheme === 'light' ? '#424242' : '#fff')};
  padding: 24px 0;
  width: 340px;
  max-width: ${props => `${props.maxW}`};

  .flow-item {
    &.sel {
      background-color: ${(props) => (props.moduleTheme === 'light' ? '#dddddd' : '#4b4b4b')};
    }

    &:hover {
      background-color: ${(props) => (props.moduleTheme === 'light' ? '#dddddd' : '#4b4b4b')};
      border-radius: 5px;
    }
  }

  .superscript {
    font-size: 11px;
    opacity: 0.7;
    transform: translate(-2px, -4px);
    display: inline-block;
  }
`;

interface FLowItemConf {
  disabled: boolean;
}

export const FLowItemCon = styled.div<FLowItemConf>`
  cursor: pointer;
  display: flex;
  gap: 5px;
  align-items: center;
  margin: 0px;
  padding: 15px;
  position: relative;
  opacity: ${props => (props.disabled ? 0.5 : 1)};
`;

export const FLowTitle = styled.p`
  margin: 0;
  margin-bottom: 0.5rem;
  padding: 0px 16px;
  font-size: 16px;
  font-weight: bold;
`;

export const FlowHeader1 = styled.div`
  margin: 0;
  font-weight: 600;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  word-break: break-word;
  line-height: 1rem;
  margin-bottom: 4px;
`;

export const FlowHeader2 = styled.p`
  margin: 0;
  font-weight: 400;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
  line-height: 1.2rem;
`;

export const IndexButton = styled(Button)<IndexBtnConf>`
  height: 40px;
  padding: 5px 10px;
  width: ${props => (props.applywidth === 'true' ? '40px !important' : 'auto')}; 
  background: ${props => `${props.color} !important`};
  color:  ${props => `${getColorContrast(props.color) === 'dark' ? '#fff' : '#000'}`};
  font-family: "IBM Plex Sans", sans-serif;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 2px 2px 0 rgba(72, 5, 255, 0.06);
  transition: all 0.3s;
  &:hover{
    color:  ${props => `${getColorContrast(props.color) === 'dark' ? '#fff' : '#000'} !important`};
  }
  transform: ${props => `scale(${props.scalefactor})`};
  transform-origin: ${props => (props.positioning === CreateJourneyPositioning.Left_Bottom
    ? 'bottom left' : 'bottom right')};
`;

interface IndexBtnConf {
  color: string;
  applywidth: 'true' | 'false';
  scalefactor: number;
  positioning: CreateJourneyPositioning;
}

export const IndexButtonContent = styled.div`
  display: flex;
  flex-direction: column;
  text-align: start;
  margin-left: 9px;
`;
