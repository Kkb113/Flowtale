import styled from 'styled-components';

export const SkipLink = styled.a`
  position: absolute;
  left: -1000px;
  overflow: hidden;
  width: 1px;
  margin: 1rem;
  background-color: white;
  color: black;
  z-index: 1;

  &:focus {
    left: 0px;
    width: auto;
    padding: 0.5rem 1rem;
  }
`;
