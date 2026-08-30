import styled from 'styled-components';

interface ProgressIndicatorConProps {
  top: number;
  left: number;
  width: number;
  completion: number;
  fg: string;
  bg: string;
  color: string;
}

export const ProgressIndicatorCon = styled.div`
  top: ${(props: ProgressIndicatorConProps) => `${props.top}px`};
  left: ${(props: ProgressIndicatorConProps) => `${props.left}px`};
  position: absolute;
  width: ${(props: ProgressIndicatorConProps) => `${props.width}px`};
  margin: 0 0px;
  display: flex;
  position: relative;
  height: 10px;
  border-radius: 2px;
  z-index: 9;

  &:before {
    content: '';
    position: absolute;
    top: 0px;
    height: 2px;
    border-radius: 1px;
    width: ${props => `${props.completion}%`};
    background: ${p => p.fg};
    // box-shadow: ${p => `${p.bg} -1px 1px 3px 0px`};
    transition: width 0.3s ease-in-out;
    color: #00000000;
  }

  // &:after {
  //   content:'';
  //   top: 0px;
  //   height: 4px;
  //   left: calc(${props => `${props.completion}%`} - 4px);
  //   width: 4px;
  //   border-radius: 6px;
  //   background: ${p => `${p.bg}`};
  //   box-shadow: ${p => `${p.fg} 0px 0px 1px 2px`};
  //   position: absolute;
  //   transition: all 0.2s ease-out;
  //   opacity: 1;
  // }

  &:hover {
    &:after {
      opacity: 0;
    }

    &:before {
      content: attr(data-progress);
      height: 14px;
      font-size: 10px;
      font-weight: 500;
      text-align: center;
      color: ${p => p.color};
      transition: all 0.2s ease-out;
      background: ${p => p.bg};
      box-shadow: ${p => `${p.fg} -1px 1px 3px 0px`};
      white-space: nowrap;
    }
  }
`;
