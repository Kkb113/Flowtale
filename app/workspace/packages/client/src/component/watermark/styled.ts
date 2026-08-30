import styled from 'styled-components';

export const WatermarkCon = styled.a`
  font-size: 12px;
  display: flex;
  place-items: center;
  gap: 0.5rem;
  cursor: pointer;
  text-decoration: none !important;
  justify-content: end;
  
  &:hover {
    text-decoration: underline !important;
  }
`;

export const LogoWatermark = styled.a`
  position: absolute;
  transform: translate(-100%, -100%);
  cursor: pointer;
  text-decoration: none !important;  
  transform-origin: 0 0;
  
  img {
    transition: scale 0.15s ease-in-out;
    height: 36px;
  }

  img:hover {
    scale: 1.15;
  }
`;
