import { motion } from 'framer-motion';
import styled from 'styled-components';

export const RootLayoutCon = styled.div<{equalSpaced: boolean, abs: boolean, fullheight: boolean}>`
  padding-left: 4.375rem;
  padding-right: ${props => (props.equalSpaced ? '4.375rem' : '0')};
  display: ${props => (props.abs ? 'block' : 'flex')};
  flex-direction: ${props => (props.abs ? 'unset' : 'column')};
  justify-content: ${props => (props.abs ? 'unset' : 'center')};
  height: 100%;
  overflow-y: ${props => (props.fullheight ? 'auto' : 'hidden')};
  scrollbar-color: var(--fable-scrollbar-color);
`;

export const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 31.75rem;
  gap: 40px;
  align-items: flex-start;
`;

export const MotionDivWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-items: flex-start;
`;

export const StepDotsWrapper = styled.div`
  display: flex;
  padding: 0.5rem 0;
  gap: 0.5rem;
  position: absolute;
  bottom: 2.25rem;
`;

export const Link = styled.a`
  text-decoration: none;
  color: #7567FF;
  font-weight: 600;
`;

export const Header = styled.h1`
  font-weight: 700;
  font-size: 3rem;
  line-height: 3.8rem;
  margin: 0;
  color: #16023E;
`;

export const Subtitle = styled.p`
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.625;
  margin: 0;
  color: #16023E;
`;

export const FlexColContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const SpanBlock = styled.span`
  display: block;
`;

export const BrowserCon = styled.img`
  position: absolute;
  right: 4.25%;
  width: 37rem;
  top: calc(50vh - 14rem);
  filter: drop-shadow(0px 32px 48px rgba(0, 0, 0, 0.25));
`;
