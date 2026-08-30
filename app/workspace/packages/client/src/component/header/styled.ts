import styled from 'styled-components';
import { Popover } from 'antd';
import { WarningFilled } from '@ant-design/icons';

export const ConLogoImg = styled.img`
  height: 2.5rem;
`;

export const Con = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  background: ${(props) => props.theme.colors.dark.idle.background};
  position: relative;
  z-index: 9;
  box-shadow: 0 1px 4px -2px ${(props) => props.theme.colors.dark.idle.background};
`;

export const LogoCon = styled.div`
  margin: 0.35rem 1.5rem;
  padding: 0.35rem 1.5rem;
  font-size: 1rem;
`;

export const RMenuCon = styled.div`
  margin: 0.25rem 1.5rem;
  padding: 0.25rem 1.5rem;
  display: flex;
`;

export const LMenuCon = styled.div`
  margin: 0rem 1.5rem;
  display: flex;
  align-items: center;

  &:hover {
    .show-on-hover {
      visibility: visible;
    }
  }

  .show-on-hover {
    visibility: hidden;
  }
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;

  .ant-btn-icon {
    margin-inline-end: 4px !important;
  }

  .sec-btn {
    border: 1px solid white !important;
    font-weight: 500;
  }

  span.sec-btn {
    border: none !important;
  
    button {
      border-color: white;
    }
  }

  span.sec-btn:hover {
    border: none !important;  
    transform: translate(2px, -2px);
  }

  .sec-btn:hover {
    border: 1px solid white !important;
    color: white !important;
    transform: translate(2px, -2px);
  }

  .edit-btn {
    font-weight: 500;
    border: 1px solid #212121 !important;
    padding: 0px 0.8rem;
    height: 30px;
    border-radius: 16px;
    background-color: #7ceaf3;
    color: black;
  }

  .edit-btn:hover {
    transform: translate(2px, -2px);
    color: black !important;
  }
`;

export const CodeCon = styled.div`
  display: block;
  border: 1px solid lightgray;
  padding: 0.5rem;
  border-radius: 12px;
  position: relative;
  background: #2e3440;
`;

export const CanvasOptionsCon = styled.div`
  width: 180px;
`;

export const MainNotSetCon = styled.div`
  margin: 2rem 0;
`;

export const MainNotSetContent = styled.p`
  font-size: 17px;
  margin: 1.5rem 0;
  font-size: 1rem;

  &:first-child {
    margin-top: 0.5rem;
  }

  a {
    margin-left: 8px;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    color: #616161;
    text-decoration: dotted underline;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const WarningIcon = styled(WarningFilled)`
  color: #fedf64;

  :hover {
    color: #ff9800;
  }
`;

export const DrawerBodyCon = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 45px);
`;
