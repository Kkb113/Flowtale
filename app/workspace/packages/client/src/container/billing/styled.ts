import styled from 'styled-components';

export const Heading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const TabCon = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  margin-bottom: 1rem;
  cursor: pointer;
  box-shadow: 2px 2px 1px 2px #918ac9;
  border-radius: 2px;

  .tab-item {
    padding: 0.5rem 2rem;
    border-radius: 4px;
    opacity: 0.8;
    transition: all 0.3s ease-out;

    :hover {
      opacity: 1;
    }
  }

  .active {
    background: #D0D0FF
  }
`;

export const PriceCon = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4rem;
`;

export const PlanPrice = styled.div`
  font-weight: 600;
  font-size: 4rem;
  display: flex;
  align-items: flex-end;
  gap: 1rem;
`;

export const FeatTitle = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

export const FeatList = styled.ul<{isScrollable: boolean}>`
  list-style-type: none;
  padding: 0;
  max-height: ${props => (props.isScrollable ? '280px' : 'max-content')};
  overflow: ${props => (props.isScrollable ? 'scroll' : 'auto')};
  font-size: 15px;

  & > li:not(:last-child) {
    margin-bottom: 0.4rem;
  }
`;

export const FeatCon = styled.div<{showScrollMore: boolean}>`
  margin-top: 1rem;
  filter: saturate(0.5);
  opacity: 0.8;

  &:after {
    content: '↓ Scroll for more';
    display: ${props => (props.showScrollMore ? 'block' : 'none')};
    font-size: 12px;
    color: #757575;
  }
`;

export const ABtn = styled.a`
  text-decoration: none;
  color: black;
  background: rgb(255, 188, 0);
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.3s ease-out;
  flex: 0 1 auto;

  &:hover {
    background: rgb(255, 238, 78);
  }
`;
