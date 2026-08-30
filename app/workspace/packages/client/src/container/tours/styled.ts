import styled from 'styled-components';

export const TopPanel = styled.div`
  margin: 1rem;
  margin-bottom: 2rem;
`;

export const ToursHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const Text = styled.h4`
  color: #16023E;
  margin-top: 0px;
  font-style: italic;
`;

export const KPIGraphCon = styled.div<{annPublished: boolean}>`
  width: ${props => (props.annPublished ? '60%' : '100%')};
  outline: 1px solid rgba(0,0,0,0.075);
  padding: 1rem;
  border-radius: 0.5rem;
  box-sizing: 0px 4px 4px 0px rgba(0,0,0,0.05);
  padding-bottom: 2rem;
  box-sizing: content-box;
  background: white
`;
