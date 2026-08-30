import { Collapse, Popover } from 'antd';
import styled from 'styled-components';

export const PopoverCon = styled.div`
  width: 220px;

  .title {
    margin-bottom: 0.75rem;
  }
`;

export const PopoverMenuItem = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 24px;
  justify-content: space-between;
  border-radius: 8px;
  background: ${({ selected }) => (selected ? '#F6F5FF' : '#FFF')};
  font-weight: ${({ selected }) => (selected ? '500' : 'normal')};

  padding: 12px 16px;
  margin: 8px 0;
  color: #212121;
  font-family: IBM Plex Sans;

  cursor: pointer;

  ${({ selected }) => (selected
    ? `&::after {
        content: url('https://res.cloudinary.com/di2flcikt/image/upload/f_auto,q_auto/v1/hosting/krqawjthgtj8izph6ldc');
      }`
    : ''
  )};


  &:hover {
    background: #F6F5FF;
  }
`;

export const Header = styled.div`
  position: static;
  background-color: #160245;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #FFF;
  font-family: IBM Plex Sans;
  line-height: normal;

  .right-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .publish-btn {
      padding-left: 16px;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
    }

    .action-icon {
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.15s ease-in;
      width: 18px;
      cursor: pointer;
    }
  }
`;

// ~~~~~~~~~~~~~~~~~~~~~~ MODAL BODY ~~~~~~~~~~~~~~~~~~~~~~

export const ModalBodyCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
  color:  #212121;
  font-family: IBM Plex Sans;
  .sec-head {
    margin: 0.5rem 0;
  }

  .section-con {
    display: flex;
    gap: 0.5rem;
    flex-direction: column;
  }

  .pub-btn-txt-con {
    display: flex;
    justify-content: space-between;
    background-color: #fedf64;
    border-radius: 10px;
    color: black;
    padding: 10px;
    align-items: center;
    border: 1px solid gray;
  }

  p {
    margin: 0.15rem;
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pseudo-link {
    border-bottom: 1px dotted gray;
    cursor: pointer;

    &:hover {
      border-bottom: 1px solid gray !important;
    }
  }

  .collapse-content {
    padding: 0px 25px;
  }

  .ant-collapse-header {
    background: white;
    align-items: center !important;

    border-top-left-radius: 15px !important;
    border-top-right-radius: 15px !important;
    border-bottom-right-radius: 15px !important;
    border-bottom-left-radius: 15px !important;
  }

  .ant-collapse-item-active > .ant-collapse-header {
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
  }

  .ant-collapse-content {
    background: white !important;

    border-top-left-radius: 15px !important;
    border-top-right-radius: 15px !important;
    border-bottom-right-radius: 15px !important;
    border-bottom-left-radius: 15px !important;
  }

  .ant-collapse-item-active > .ant-collapse-content {
    border-top-right-radius: 0px !important;
    border-top-left-radius: 0px !important;
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #7567FF !important;
    border-color: #7567FF !important;
  }

  .cta-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 20px 0;
  }

  .cta-color {
    grid-template-columns: repeat(3, 1fr);
  }

  .cta-input-label {
    color: #16023e;
  }

  .cta-input-c {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.15rem;
  }

  .ant-input{
    border-color: #D9D9D9;
  }
  .ant-input:hover{
    border-color: #D9D9D9;
  }

  @media only screen and (max-width: 1050px){
    .cta-info {
      grid-template-columns: repeat(1, 1fr);
    }

    .cta-color {
      grid-template-columns: repeat(1, 1fr);
    }
  }
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;
  display: flex;
`;

export const StyledPopover = styled(Popover)`
  .ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #EAEAEA !important;
    background: var(--White, #FFF) !important;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const BackgroundGradientImg = styled.img`
  filter: blur(194px);
  position: absolute;
  top: 0px;
  right: 0px;
  left: 0px;
  height: 100vh;
  width: 100vw;
  z-index: -1;
  object-fit: cover;  
`;

export const URLCon = styled.div`
  background: #2e3440;
  border: 1px solid #2e3440;
  color: rgb(164, 190, 140) !important;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;

  .url-content {
    white-space: nowrap;
    padding: 0.7rem;
    scrollbar-color: var(--fable-scrollbar-color);
    scrollbar-width: thin;
    overflow-y: hidden;
    overflow-x: auto;
  
    &::-webkit-scrollbar-track {
      padding: 2px 0;
      background-color: var(--fable-scrollbar-track);
      border-radius: 10px;
      border: 1px solid #F3F4F6;
    }
  
    &::-webkit-scrollbar {
      margin: 4px 0;
      height: 4px;
      width: 6px;
    }
  
    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: var(--fable-scrollbar-thumb);
    } 
  }

  .open-link-con {
    background-color: #ebebeb;
    color: #7a7a7a;
    padding: 0.3rem;
    margin-left: 0.2rem;
    border-radius: 4px;
    cursor: pointer;
    width: 15px;
    height: 15px;
    display: flex;
    justify-content: center;
  }
`;

export const CopyHandelerCon = styled.div`
  display: flex;
  position: absolute;
  right: 0.5rem;
  z-index: 999;

  .copy-outline, .check-outline {
    background-color: #7567FF;
    color: white;
    padding: 0.3rem;
    margin-left: 0.2rem;
    border-radius: 4px;
    cursor: pointer;
    width: 15px;
    height: 15px;
    display: flex;
    justify-content: center;
  }
`;

export const EmbedCon = styled.div`
  padding: 1.5rem 0.5rem 0.5rem;
  border-top: 1px solid #E0E0E0;

  .header {
    color: #16023e;
    margin-bottom: 1rem;
  }
`;

export const ThemeCard = styled.div<{bg: string}>`
  display: inline-block;
  width: 60px;
  height: 90px;
  border-radius: 12px;
  position: relative;

  &:before {
    content: '';
    position: absolute;
    height: 18px;
    width: 100%;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    filter: hue-rotate(45deg);
    background: ${props => props.bg};
  }

  &:not(:last-child) {
    margin-right: 1.5rem;
  }

  &:hover {
    cursor: pointer;

    &:after {
      content: '';
      position: absolute;
      height: 4px;
      width: 80%;
      left: 10%;
      bottom: -8px;
      border-radius: 2px;
      background: #9E9E9E;
    }
  }

  &.sel {
    &:after {
      content: '';
      position: absolute;
      height: 4px;
      width: 80%;
      left: 10%;
      bottom: -8px;
      border-radius: 2px;
      background: #BDBDBD;
    }
  }
`;

export const ColorThemeCon = styled.div`
  width: 100%;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: scroll;
  scrollbar-color: var(--fable-scrollbar-color);

  .card-con {
    width: max-content;
    padding:2px 2px 12px;
  }
`;

export const AntCollapse = styled(Collapse)`
  .ant-collapse-header {
    padding-inline-start: 0px !important;
  }
`;

export const DomainRestrictCon = styled.div`
  margin: 1rem 0px 0.25rem;
  background: #fedf64;
  display: inline-block;
  padding: 1px 4px;
  border-radius: 4px;
`;

export const DomainSelectCon = styled.div`
  margin-top: 1rem;
`;
