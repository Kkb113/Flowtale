import styled from 'styled-components';
import { CheckCircleFilled } from '@ant-design/icons';
import { getColorContrast } from '../../utils';
import { EntryBase, SimpleStyle } from '../../types';
import * as DHTags from '../demo-hub-see-all/styled';

export const RootCon = styled(DHTags.DHPage)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  padding-top: 60px;
  box-sizing: border-box;
  
  .animated {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
`;

export const MainCon = styled.div<{
  borderRadius: string;
}>`
  flex-grow: 1;
  max-height: 100%;
  overflow-y: hidden;
  position: relative;
  margin: 1rem;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
  border-radius: ${props => props.borderRadius};
  border: none;
`;

export const BaseEntryCon = styled.div<{isVisible: boolean, styleData: SimpleStyle}>`
  position: absolute;
  background-color: white;
  height: 100%;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  color: ${p => p.styleData.fontColor};
  background-color: ${p => p.styleData.bgColor};
  border-color: ${p => p.styleData.borderColor};
  padding: 2rem;
  overflow: auto;
  box-sizing: border-box;

  .q-inner-con-full-w{
  height: calc(100% - 4rem);
  }
`;

export const BaseEntryContent = styled.div<{maxWidth: 'full' | 'content', styleData: SimpleStyle}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  height: 100%;
  max-width: ${props => (props.maxWidth === 'content' ? '450px' : '100%')};
  margin: auto;
  color: ${p => p.styleData.fontColor};
  padding: 2rem 1rem;
  
  &.compact {
    gap: 0.25rem;
  }

  .line1.compact {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }
`;

export const BaseEntryCTACon = styled.div`
  display: flex;
  gap: 1rem;
`;

export const StepTitle = styled.h1<{styleData: SimpleStyle}>`
  margin: 0;
  padding: 0;
  font-size: 1.8rem;
  font-weight: 500;
  color: ${p => p.styleData.fontColor};

  &.compact {
    font-size: 1.5rem;
  }
`;

export const StepDesc = styled.p<{styleData: SimpleStyle}>`
  margin: 0;
  padding: 0;
  font-size: 1.2rem;
  margin: 1rem 0;
  line-height: 1.25;
  color: ${p => p.styleData.fontColor};
`;

export const ContinueSkipCTA = styled.button<{data: EntryBase['continueCTA']}>`
  color: ${p => p.data.style.fontColor};
  border-radius: ${p => p.data.style.borderRadius}px;
`;

export const CTACon = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    background: white;
    display:none;
    padding: 40px 0;
    width: 100%;
    right: 1px;
    z-index: 999999;
    position: absolute;
    top: 65px;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;

    &.open-cta-con {
        display: flex;
    }
  }
`;

export const RespCTACon = styled.div`
  display: flex;
  .menu-icon {
    display: none;
  }
      
  @media (max-width: 768px) {
    .menu-icon {
      font-size: 30px;
      display: flex;
    }
  }
`;

export const CheckFilledIcon = styled(CheckCircleFilled)`
  color: #7567FF;
`;

export const EmptyCircle = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid #9E9E9E;
`;

export const SelectionOptionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  justify-content: center;
  gap: 1rem;
  font-size: 1.15rem;
  margin-bottom: 1rem;
  width: 100%;
`;

// background-color: ${p => `color-mix(in srgb, ${p.styleData.borderColor} 30%, ${getColorContrast(p.styleData.bgColor) === 'dark' ? 'black' : 'white'})`};
export const SelectOption = styled.div<{styleData: SimpleStyle}>`
  background-color: white;
  display: flex;
  gap: 0.25rem;
  justify-content: flex-start;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem;
  color: ${p => p.styleData.fontColor};
  background-color: transparent;
  border: 2px solid ${p => p.styleData.borderColor};
  border-radius: ${p => p.styleData.borderRadius / 2}px;
  width: 500px;
  cursor: pointer;
  transition: all 0.2s ease-out;

  &:hover {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
  }

  .line1 {
    display: flex;
    justify-content: space-between;
    width: 100%;
    gap: 0.25rem;
  }

  .opt-subtitle {
    font-size: 0.85rem;
    text-align: left;
    opacity: 0.85;
  }

  .opt-title {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 220px;
    font-weight: 600;
    text-align: left;
    flex: 1 10 auto;
  }
`;
