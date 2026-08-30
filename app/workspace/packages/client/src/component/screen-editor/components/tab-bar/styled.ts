import styled from 'styled-components';

interface TabActiveProp {
  active?: boolean;
}

export const TabItemsCon = styled.div`
  display: flex;
  border-bottom: 1px solid #DDDDDD;
`;

export const TabItem = styled.div`
  text-align: center;
  cursor: pointer;
  margin-left: 1.5rem;
`;

export const TabTitle = styled.span`
  display: inline-block;
  padding: 10px 0;    
  position: relative;
  color: #000;
  text-shadow: ${(props: TabActiveProp) => (props.active ? '1px 0 #9E9E9E' : 'none')};

  .ht-icn {
    visibility: hidden;
    font-size: 0.75rem;
  }

  &:hover {
    .ht-icn {
      visibility: visible;
    }
  }
`;

export const TabActiveHighlight = styled.div`
  position: absolute;
  width: calc(100% - 16px);
  height: ${(props: TabActiveProp) => (props.active ? '3px' : '0px')};
  background-color: #160245;
  border-radius: 1.5px;
  bottom: -3px;
`;
