import { Slider, InputNumber, Input, Switch, Collapse, Dropdown, Popover } from 'antd';
import styled from 'styled-components';

export const EditPanelSec = styled.div`
  display: flex;
  padding: 0;
  flex-direction: column;
`;

export const EditCtrlCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.5rem;
`;

export const EditCtrlLabel = styled.div`
  
  &.with-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 75%;
  }
`;

export const EditCtrlLI = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CtrlSlider = styled(Slider)`
  display: block;
  width: 9rem;
`;

export const CtrlTxtEditBox = styled(Input.TextArea)`
  border-radius: 8px;
  border: 2px solid #ddd;
  padding: 0.875rem 1rem;
`;

export const EditLICon = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export const EditLIPCon = styled.div`
  background: #d0d0ff;
  padding: 0.25rem 1rem;
  border-radius: 10px;
  margin: 0.25rem 1rem;
  &:hover {
    cursor: pointer;
    box-shadow: 0 0 0 1px #7567ff;
  }
`;

export const ListActionBtn = styled.span`
  color: #16023e;

  &:hover {
    text-decoration: underline;
  }
`;

export const AnotCrtPanelCon = styled.div`
  display: flex;
  padding: 0;
  border-radius: 8px;
  flex-direction: column;

  .ver-center {
    display: flex;
    align-items: center;
  }

  .ann-text-errors {
    display: flex;
    justify-content: end;
    padding: 0.25rem 0.5rem;
  }
`;

export const AnotCrtPanelSec = styled.div`
  display: flex;
  flex-direction: ${(p: AnotPanelSecOri) => (p.row ? 'row' : 'column')};
  align-items: ${(p: AnotPanelSecOri) => (p.row ? 'center' : 'unset')};
  justify-content: ${(p: AnotPanelSecOri) => (p.row ? 'space-between' : 'unset')};
  width: 100%;
  margin-bottom: 0.25rem;
`;

export const BtnCtrlCon = styled.div<{ annBgColor: string }>`
  background-color: #fff;
  opacity: 0.8;
  background-image:  ${props => `repeating-radial-gradient( circle at 0 0, transparent 0, color-mix(in srgb, ${props.annBgColor} 50%, white) 7px ), repeating-linear-gradient( ${props.annBgColor}55, ${props.annBgColor} );`};

  .ant-btn-icon {
    color: black !important;
  }
  padding: 4px;
  border-radius: 4px;
`;

export const AABtnCtrlLine = styled.div<{ annBgColor: string }>`
  display: flex;
  flex-direction: column;
  margin-bottom: 0.15rem;
  margin-top: 0.15rem;
  padding: 0.15rem;
  border-radius: 4px;

  .a-head {
    display: flex;
    align-items: center;
    justify-content: space-between ;
  }

  .n-vis {
    visibility: hidden;
  }

  .n-details {
    padding: 0.15rem;
    margin: 0.15rem;
  }

  &:hover {
    .n-vis {
      visibility: visible;
    }
  }

  &.sel {
    /* background: #f5f5f5; */
  }
`;

export const ActionMenuCon = styled.div`
  margin-bottom: 1rem;
`;

export const ActionMenuConBar = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.15rem 0.75rem;
  background: #f5f5f5;
`;

export const AnnotationHotspotSelector = styled.div`
  max-width: 400px;
  margin: 0.25rem 0rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 8px;

  &:hover {
    cursor: pointer;
    box-shadow:  0 0 0 1px #7666ff;
  }
`;

export const ButtonSecCon = styled.div`
  display: flex;
  & > *:not(:last-child) {
    margin-right: 0.5rem;
  }
`;

export const CreateNewAnnotationBtn = styled.div`
  color: #9393F0;
  cursor: pointer;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  opacity: 1;
  animation: fade 1s ease;

  @keyframes fade{
    0%{opacity: 0;}
    25%{opacity: 0;}
    100%{opacity: 1;}
  }

  p {
    text-align: center;
  }

  img {
    transition: transform 0.2s ease-out;
    height: 57px !important;
    width: 57px !important;
  }

  &:hover {
    img {
      transform: translate(2px, 2px);
    }
  }
`;

export const AnnotationBtnCtn = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  position: absolute;
  left: 0;
  right: 0;
`;

export const AnnotationPanelCollapse = styled(Collapse)<{ bg: string }>`
  border-radius: 4px;
  margin-top: 1.5rem;
  border-top: 1px solid rgb(221, 221, 221);
  border-bottom: 1px solid rgb(221, 221, 221);
  z-index: 1;
  
  .ant-collapse-header {
    padding: 0.75rem 0 0 0 !important;
    background: ${props => props.bg}
  }

  .ant-collapse-content-box {
    padding: 0 0 0.75rem 0 !important;
  }
`;

export const InfoText = styled.p`
  padding: 0 1rem;
  margin: 2px 0 0 1.5rem;
  color: #333333;
  text-align: left;
`;

export const AnimatedInfoText = styled.p`
  padding: 0 1rem;
  margin: 0 0 0 1.5rem;
  color: #333333;
  text-align: left;
  display: inline-block;
`;

export const AnnTimelineCon = styled.div`
  padding-top: 1rem;
  border-top: 1px solid #D9D9D9;
  margin-top: 1rem;
`;

export const VerticalBar = styled.div`
  height: 1.1rem;
  border-left: 1px solid #747474;
  position: absolute;
  left: 0.91rem;
  bottom: 0;
  transform: translateY(1.1rem);
`;

export const EditTabCon = styled.div`
  justify-content: center;
  display: flex;
  flex-direction: column;
  margin: 0 1rem 1rem 1rem;
`;

interface AnotPanelSecOri {
  row?: boolean;
}

export const ActionPanel = styled.div<{ gutter: boolean }>`
  padding: ${props => (props.gutter ? '0.75rem 1.5rem 0.75rem' : '0.75rem 1rem 0.75rem')};
  border-bottom: 1px solid #dddddd;
  cursor: pointer;

  .ant-collapse-header {
    padding: 8px 12px !important;
  }

  .ant-collapse-content-box {
    padding: 4px 12px 12px 12px !important;
  }
`;

export const ActionPanelTitleCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0.65;
  // font-size: 1rem;

  .ht-icn {
    font-size: 0.75rem;
    display: none;
  }

  &.selected {
    opacity: 1;
  }

  &:hover {
    opacity: 1;

    .ht-icn {
      display: unset;
    }
  }

  .title {
    // font-weight: 600;
    display: flex;
    align-items: center;
  }
`;

export const ActionPanelAdditionalActionIconCon = styled.span`
  padding: 2px 4px;
  border-radius: 2px;
  &:hover {
    background: #E0E0E0;
    cursor: pointer;
  }

`;

export const ActionPanelPopOverCon = styled.div`
  .ant-popover-inner {
    padding: 4px !important;
    background: #f6f6f6 !important;
  }
`;

export const ActionBtnCon = styled.div`
  margin: 1rem auto;
  margin-bottom: 0rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

export const CTALinkInputCont = styled.div`
  display: flex;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
  align-items: center;
  height: 100%;
`;

export const InputText = styled(Input)`
  border-radius: 8px;
  border: 1px dashed #BDBDBD;
  height: 100%;
  width: 125px;
  background: white;

  &:hover, &:focus {
    background: white;
    border: 1px solid #747474 ;
    box-shadow: none;
  }

`;

export const InputNumberBorderRadius = styled(InputNumber)`
  width: 120px;
  height: 100%;
  border-radius: 8px;
  border: 1px dashed #BDBDBD;

  .ant-input-number,
  .ant-input-number-wrapper, 
  .ant-input-number-input-wrap,
  .ant-input-number-group-addon,
  input {
    height: 100%;
    border: none;
  }

  .ant-input-number:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  }
`;

export const StyledSwitch = styled(Switch)`
  height: 20px;
  width: 32px;
 
  .ant-switch-handle {
    height: 16px ;
    width: 16px;
  }

  &.ant-switch-checked {
    background: #757575 !important;
    background-color: #757575 !important;
  }

  &:where(.css-dev-only-do-not-override-byeoj0).ant-switch.ant-switch-checked .ant-switch-handle {
    inset-inline-start: calc(100% - 18px);
  }
`;

export const ScreenResponsiveIpCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 1rem 0 1rem;
`;

export const AnnPositioningInput = styled.div<{
  fullWidth: number,
  panelWidth: number,
  panelHeight: number,
}>`
  position: relative;
  width: ${(props) => `${props.fullWidth}px`};
  height: ${(props) => `${props.fullWidth}px`};
  background-color: #fff;
  border: 1px solid #bdbdbd;
  border-radius: 4px;

  cursor: default;

  .ann-pos-panel {
    position: absolute;
    display: flex;
    justify-content: space-between;
  }

  .ann-pos-panel-left {
    flex-direction: column;
    top: ${props => `${props.panelWidth}px`};
    left: 0;
    width: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-right {
    flex-direction: column;
    top: ${props => `${props.panelWidth}px`};
    right: 0;
    width: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-top {
    top: 0;
    left: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-bottom {
    bottom: 0;
    left: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-center {
    position: absolute;
    left: ${props => `${props.panelWidth}px`};
    top: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
    height: ${props => `${props.panelHeight}px`};
    background-color: #6d6d6d;
    background: #fff;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
  }
`;

export const AnnPositionInputBox = styled.div<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  background-color: transparent;
  cursor: pointer;

  div {
    width: 50%;
    height: 50%;
    background-color: ${props => (props.isSelected ? '#160245' : '#bdbdbd')};
    border-radius: 2px;
  }

  &:hover {
    background-color: ${props => `${props.isSelected ? '#7567ff' : '#9f96fa'}`};

    div {
      background-color: ${props => `${props.isSelected ? '#160245' : 'black'}`};
    }
  }
`;

export const AnnotationLI = styled.div`
  position: relative;
  background: #fff;
  padding: 0.65rem 0 0.25rem;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  width: 90%;
  border-top: 1px solid #DDD;
  border-bottom: 1px solid #DDD;

  &:hover {
    cursor: pointer;
  }
`;

export const AnotCrtPanelSecLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;

`;

export const AnnDisplayText = styled.div`
  display: flex;
  flex-direction: column;
  width: calc(100% - 2rem);
  margin-right: 10px;

  .steps {
    display: inline-block;
    font-weight: 500;
    display: flex;
  }

  .head {
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
  }
`;

export const ApplyAllTxt = styled.div`
  margin: 0px;
  color: #aaa; 
  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

export const ConnectableAnnsCon = styled.div`
  margin: 1rem;
  display: flex;
  flex-direction: column;
`;

export const NavigateToCon = styled.div`
  max-height: 45vh;
  overflow-y: scroll;
  scrollbar-color: var(--fable-scrollbar-color);
  scrollbar-width: unset !important;
  opacity: 0;
  animation-name: fadeIn;
  animation-duration: 1s;
  animation-delay: 0.1s;
  animation-fill-mode: forwards;

  @keyframes fadeIn{
    0%{
      opacity:0;
    }
    100%{
      opacity:1;
    }
  }

  &::-webkit-scrollbar-track {
    padding: 2px 0;
    border-radius: 10px;
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
`;

export const ConnectableAnnCon = styled.div`
  cursor: pointer;
  margin: 10px 0;
  border-radius: 10px;
  padding: 5px;
  &:hover {
    background-color: #eee;
  }
`;

export const ConnectableAnnText = styled.p`
  margin: 0;
  padding: 0;
  font-family: "IBM Plex Sans", sans-serif;
`;

export const TitleCon = styled.div`
  display: flex;
  gap: 6px;

  .ht-icn {
    font-size: 0.75rem;
  }
`;

export const BackBtnHelpText = styled.div`
  font-size: 10px;
  line-height: 14px;
  background: #ffffffba;
  padding: 1px 3px;
  margin-top: 4px;
  border-radius: 4px;
`;

export const ABtnConf = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;

  --f-pad-multi: 1px;
`;

export const ScreenModeItems = styled.div`
  color: #16023E;

  p {
    margin: 0;
    display: flex;
    gap: 15px;
  }
`;

export const ResponsiveIpCon = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin: 0 2px;
  flex-grow: 1;
  background: #424242;
  color: white;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
`;

export const DeviceCon = styled.div`
  margin: 3px;
  padding: 3px;
  cursor: pointer;

  &:hover{
    color: #616161;
    background: white;
    margin: 3px;
    border-radius: 4px;
  }
`;

export const CreatorPanelTopMenuCon = styled.div`
  margin-right: 0.5rem;
`;

export const FPOCon = styled.div`
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .divider {
    width: 100%;
    border-top: 1px solid lightgray;
  }

  .copy-item {
    cursor: pointer;
    opacity: 0.75;

    &:hover {
      opacity: 1;

      .del {
        visibility: visible;
      }
    }

    .del {
      display: inline-block;
      visibility: hidden;
      margin-left: 0.5rem;
      padding: 0 2px;
      border-radius: 4px;

      &:hover {
        box-shadow: 0 0 0 1px gray;
      }
    }
  }

  .color-view {
    height: 10px;
    width: 10px;
    display: inline-block;
    border-radius: 10px;
  }

  .selble {
    padding: 4px 8px;
    cursor: pointer;
    border: 1px dashed lightgray;
    border-radius: 8px;

    &:hover {
      border: 1px solid gray;
    }
  }
`;

export const OneAndMultiBtn = styled.div<{more?: boolean}>`
  display: inline-block;
  position: relative;
  transform: translate(${props => (props.more ? '-0.25rem' : '0px')}, 0px);
  transition: transform 0.2s ease-out;

  button:after {
    content: '...';
    position: absolute;
    transform: rotate(-90deg) translate(-1px, -12px);
    visibility: ${props => (props.more ? 'visible' : 'hidden')};
  }
`;

export const EditUpgradeBtnCon = styled.div`
  position: relative; 
  width: 115px;
`;

export const Pill = styled.div`
  background-color: gray;
  color: white;
  padding: 6px;
  border-radius: 16px;
  font-weight: 500;
`;

export const UploadMediaLabel = styled.label`
  margin: 0 auto;
  background-color: #fff;  
  border: 1px solid #16023E; 
  color: #16023E;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease-out;
  padding: 0.75rem 1.5rem;
  border-radius: 24px;
  width: fit-content;
  
  &:hover {
    transform: translate(2px, -2px);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

export const StyledPopover = styled(Popover)`
.ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #EAEAEA !important;
    background: var(--White, #FFF) !important;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const PopoverMenuCon = styled.div`
  width: 180px;
`;

export const PopoverMenu = styled.button`
  display: block;
  background-color: white;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  color: #16023E;

  &:hover {
    background-color: #F8F8F8;
  }
`;
