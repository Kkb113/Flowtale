import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

export const IntroCardCon = styled.div<{ width?: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  width: ${(p) => p.width || '14rem'};
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  border-radius: 8px;
  background: #FFF;
  box-shadow: 0px 0px 10px 100vh rgb(0, 0, 0, 0.4);
  z-index: 1;

  animation: ${fadeIn} 0.3s ease-in;

  .intro-title {
    font-family: IBM Plex Sans;
    font-size: 22px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }

  .intro-description {
    font-family: IBM Plex Sans;
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
  }

  .button-con {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
    align-self: stretch;
  }

  & .button-con > button {
    display: flex;
    padding: 8px 16px;
    justify-content: center;
    align-items: center;
    gap: 8px;
    align-self: stretch;
    border-radius: 4px;
    cursor: pointer;

    font-size: 12px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }

  .btn-primary {
    color: #FFF;
    background: #7567FF;
    border: none;
  }

  .btn-secondary {
    border: 1px solid #D0D0FF;
    background: #FFF;
  }
`;
