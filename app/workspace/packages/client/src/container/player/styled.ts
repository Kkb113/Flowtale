import styled from 'styled-components';
import { IframePos } from '../../types';

export const FullScreenModal = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 10000;
`;

export const CenteredSection = styled.div`
  min-width: 320px;
  position: absolute;
  top:50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  text-align: center;

  h2 {
    font-size: 2rem;
  }

  h2, p {
    margin: 0;
    padding: 0;
  }
`;

export const SecondaryBtn = styled.div`
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5rem 2rem;
`;

export const ViewDemoOverlayCon = styled.div<{
  iframePos : IframePos,
  width?: number | null,
  height?: number | null,
  top?: number;
  left?: number;
  borderRadius?: string
}>`
  width: ${(props) => `${props.width ? props.width : props.iframePos.width}px`};
  height: ${(props) => `${props.height ? props.height : props.iframePos.height}px`};
  top: ${(props) => `${props.top ? props.top : props.iframePos.top}px`};
  left: ${(props) => `${props.left ? props.left : props.iframePos.left}px`};
  border-radius: ${props => props.borderRadius || '6px'};
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  justify-content: center;
  align-items: center;
  display: flex;
  flex-direction: column;

  .con {
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  .wm {
    margin-bottom: 1rem;
    color: #fafafa;
    font-size: 1.15rem;
    font-weight: 500;
    justify-self: flex-start;
    font-style: italic;

    img {
      display: inline-block;
      height: 14px;
      margin: 0 4px 0 8px;
    }

    a {
      color: #fafafa;
      text-decoration: none;
    }
  }
`;
