import styled from 'styled-components';
import { BoxShadowKFRule } from '../annotation/styled';

export const SecCon = styled.div`
  background: #f5f5f5;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const CommonSecOptionCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 500px;
`;

export const CommonSecActionCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const SectionOptionsCon = styled.div`
  background: #fff;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  border-radius: 8px;
`;

export const OptionTitle = styled.div`
`;

export const DummyElMask = styled.div<{ selColor: string, shouldAnimate: boolean }>`
  animation: ${(props) => (props.shouldAnimate ? BoxShadowKFRule : 'none')};
  position: absolute;
  background: transparent;
  box-shadow: ${(props) => props.selColor} 0px 0px 0px ${(props) => (props.shouldAnimate ? '0px' : '2px ')};
  height: 50px;
  width: 100px;
  bottom: 0;
  transform: translateY(140%);
`;

export const AnnotationPreviewCon = styled.div<{fontFamily: string}>`
  * {
    font-family: ${(props) => props.fontFamily || 'inherit'} !important;
  }
`;

export const BtnCon = styled.div`
  flex: 1;
  padding: 0rem 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;

  --f-pad-multi: 1px;
`;
