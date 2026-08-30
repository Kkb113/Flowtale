import styled from 'styled-components';

export const getBorderRadiusOfFrame = (heightOffset: number): string => (heightOffset === 0 ? '4px' : '0 0 4px 4px');

export const getBorderWidthOfFrame = (heightOffset: number): number => (heightOffset ? 2 : 1);

export const EmbedFrame = styled.iframe<{heightOffset : number}>`
  height: 100%;
  width: 100%;
  border: none;
  box-shadow: none;
  border-radius: ${({ heightOffset }) => getBorderRadiusOfFrame(heightOffset)};
`;
