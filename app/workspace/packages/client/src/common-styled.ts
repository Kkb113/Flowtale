import styled from 'styled-components';
import { Modal, Checkbox, Input, ColorPicker as AntColorPicker, Button, Select, Radio, Collapse, Popover, Segmented } from 'antd';
import { AnnotationButtonSize } from '@fable/common/dist/types';
import { getColorContrast } from './utils';

export const ColCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
`;

export const RowCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
`;

export interface TxtProp {
  color?: string
}

export const Txt = styled.div`
  color: ${(props: TxtProp) => (props.color ? props.color : 'unset')};

  &.editable {
    cursor: text;
  }

    &.editable:hover {
      box-shadow: 0 0 0 1px blue;
    }

  &.subhead {
    opacity: 0.65;
    line-height: 1.1rem;
    margin-top: 0.25rem;
    white-space: pre-line;
  }

  &.subsubhead {
    opacity: 0.65;
    line-height: 0.85rem;
    font-size: 0.85rem;
  }

  &.title {
    font-size: ${(props) => props.theme.typography.size.heading3};
    font-weight: 600;
  }

  &.title2 {
    font-weight: 600;
  }

  &.subtitle {
    font-weight: 400;
    font-size: 0.75rem;
  }

  &.link {
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }

  &.faded {
    opacity: 0.65;
  }

  &.markeditable {
    cursor: text;
  }

  &.markeditable:hover {
    box-shadow: 0 0 0 1px black;
    background: #D0D0FF;
  }

  &.oneline {
    display: inline-block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.emph {
    font-weight: bold;
  }

  span.kb-key {
    background: lightgray;
    color: #000;
    padding: 0 4px;
    border-radius: 4px;
    font-style: italic;
  }
`;

export const BodyCon = styled.div`
  display: flex;
  flex-direction: column;

  &.centered {
    justify-content: center;
    align-items: center;
  }

  scrollbar-color: var(--fable-scrollbar-color);
  scrollbar-width: thin;

  .disabled {
    pointer-events: none !important;
    opacity: 0.5 !important;
  }

  .left-gutter {
    padding-left: 3%;
  }
`;

export const SidePanelCon = styled.aside<{ flat?: boolean }>`
  height: 100%;
  width: fit-content;
  border-right: 1px solid #bdbdbd;
  z-index: 2;
`;

export const MainCon = styled.div`
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;

  scrollbar-color: var(--fable-scrollbar-color);
  scrollbar-width: thin;
  
  .ant-tabs-tab-btn {
    color: #160245 !important;
  }

  .ant-tabs-ink-bar {
    background: #160245 !important;
  }
`;

export const HeaderCon = styled.div`
  width: 100%;
  height: 48px; 
`;

export const PreviewAndActionCon = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  background: #F5F5F5;
`;

export const EmbedCon = styled.div`
  flex-grow: 1;
  background: #F5F5F5;
  margin: 1rem;
`;

export const EditPanelCon = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ddd;
  scrollbar-color: var(fable-scrollbar-color);
  scrollbar-width: thin;
  overflow-y: auto;

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
`;

export const PopoverMenuItemDivider = styled.div<{ color?: string }>`
  padding: 0.5rem 0rem 0;
  margin: 0.5rem 0.5rem 0;
  border-top: ${props => `1px solid ${props.color || '#eaeaea'}`};
`;

export const PopoverMenuItem = styled.div<{ nonit?: boolean }>`
  cursor: ${props => (props.nonit ? 'default' : 'pointer')};
  padding: 0.25rem 0.75rem;
  border-radius: 2px;
  &:hover {
    background: ${props => (props.nonit ? 'initial' : '#eaeaea')};
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
    pointer-events: none;
    &:hover {
      background: initial;
    }
  }
`;

export const Avatar = styled.img<{ sl?: boolean, glow?: boolean }>`
  width: ${props => (props.sl ? 1.75 : 1)}rem;
  height: ${props => (props.sl ? 1.75 : 1)}rem;
  border-radius: 50%;
  box-shadow: ${props => (props.glow ? '0 0 1px 1px white' : 'none')}
`;

export const BorderedModal = styled(Modal)<{
  donotShowHeaderStip?: boolean;
  containerBg?: string;
}>`
    box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
    border-radius: 16px;
    border-top: double 4px transparent;
    background-image: ${props => (props.donotShowHeaderStip ? undefined : 'linear-gradient(white, white), linear-gradient(to right,  #FF7450 0%, #FF7450 33.33%, #FEDF64 33.33%, #FEDF64 66.67%, #7567FF 66.67%, #7567FF 100%)')};
    background-clip: padding-box, border-box;

    .ant-modal-content {
      border-radius: 16px;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
      background: ${props => props.containerBg}
    }

    .modal-title {
      margin:  0 0 0.5rem 0;
      color: rgba(0, 0, 0, 0.88);
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .modal-content-cont {
      margin: 1.5rem 1rem 0 1rem;
    }

    .button-two-col-cont {
      display: flex;
      gap: 1rem;
      margin: 1.5rem 1rem 1.5rem 1rem;
    }

    &.apply-all{
      padding-bottom: 0px;
      
      p {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-weight: 500;
      }
    }
`;

export const CTABtn = styled.button`
  font-size: 12px;
  font-weight: 500;
  font-family: "IBM Plex Sans", sans-serif;
  color: ${(p: CTABtnConf) => (getColorContrast(p.color) === 'dark' ? '#fff' : '#000')};
  background: ${(p: CTABtnConf) => (p.color)};
  border-radius: ${(p: CTABtnConf) => (p.borderRadius)}px;
  border: none;
  cursor: pointer;
  padding: ${(p: CTABtnConf) => {
    if (p.size === AnnotationButtonSize.Large) {
      return '12px 22px';
    } if (p.size === AnnotationButtonSize.Medium) {
      return '8px 18px';
    }
    return '4px 12px';
  }};
`;

export interface CTABtnConf {
  size: AnnotationButtonSize;
  color: string;
  borderRadius: number;
}

interface CheckboxProps {
  showafterlabel?: string;
}

export const OurCheckbox = styled(Checkbox)<CheckboxProps>`
  .ant-checkbox.ant-checkbox-checked > .ant-checkbox-inner {
    border-color: #747474;
    background-color: #747474;
  }

  .ant-checkbox > .ant-checkbox-inner {
    border-color: #747474;
    background-color: transparent;
  }

  &.ant-checkbox-wrapper {
    flex-direction: ${(props: CheckboxProps) => (props.showafterlabel ? 'row-reverse' : 'unset')};
  }
`;

export const OurRadio = styled(Radio)`
  .ant-radio-checked {
    border-color: #747474;
    background-color: #747474;
  }

  .ant-radio > .ant-radio-inner {
    border-color: #747474;
    background-color: transparent;
  }
`;

export const OurCollapse = styled(Collapse)<{ shadow?: string }>`
  margin-top: 10px;
  background: white;
  border-radius: 0.5rem !important;
  box-shadow: ${props => props.shadow || 'var(--card-box-shadow-secondary)'};

  .ant-collapse-item {
    border-bottom: solid #d8d8db;
  }

  .ant-collapse-item:last-child {
    border-bottom: none;
  }
`;

export const OurLink = styled.a<{ inline?: boolean }>`
  color: #424242;
  text-decoration: dotted underline;
  display: ${props => (props.inline ? 'inline' : 'block')};
  margin-bottom: 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

export const SimpleInput = styled(Input)`
  padding: 4px 11px;
  background-color: white;
  border: 1px dashed #BDBDBD !important;
  border-radius: 8px;
  cursor: text;
  height: 50px;

  &:hover {
    border: 1px solid #747474 !important;
  }
`;

export const ColorPicker = styled(AntColorPicker)`
  background: #fff;
  border: 1px dashed #BDBDBD;
  min-width: 120px;
  border-radius: 8px;
  display: flex;
  justify-content: flex-start;
  height: 40px;
  position: relative;
  .ant-color-picker-color-block{ 
    border-radius: 50% !important;
    position: absolute;
    right: 10px;
  }
  .ant-color-picker-color-block-inner,
  .ant-color-picker-color-block {
    width: 20px !important;
    height: 20px !important;
  }

  &:hover {
    border: 1px solid #747474 ;
  }
`;

export const DashedBtn = styled(Button)`
  color: black !important;

  .ant-btn-icon {
    color: #747474;
  }

  &.fullWidth {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px dashed #bdbdbd;
    background: #FFF;
    width: 100%;
    height: 48px;
  }

  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
    background: transparent !important;
    transition: none !important;
  } 
`;

export const FableSelect = styled(Select)`
  border-radius: 8px;
  background: #fff;
  border: 1px dashed #bdbdbd;
  height: 40px;
  min-width: 125px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  }
  
  .ant-select-clear {
    transform: translate(-100%, -100%);
  }

  .ant-select-selector {
    font-size: inherit !important;
    font-weight: inherit !important;
    font-family: inherit !important;
  }
`;

export const BottomPanel = styled.div`
  flex-grow: 1;
  margin: 1rem 0;
  scrollbar-width: thin;
  scrollbar-color: var(--fable-scrollbar-color);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--fable-scrollbar-thumb);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #F1F1F1;
  }
`;

export const HelpCenterLink = styled.a`
  color: #424242;
  text-decoration: dotted underline;
  display: block;
  margin-bottom: 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

export const LoaderBar = styled.div`
  height: 4px;
  background-color: transparent;
  width: 100%;
  top: 0;
  left: 0;
  position: absolute;
`;

export const LoaderProgress = styled.div<{bcolor: string, bwidth: number, bradius: number, bopacity: number}>`
  height: 100%;
  border-radius: ${p => `${p.bradius}px`};
  background-color: ${p => `${p.bcolor}`};
  width: ${p => `${p.bwidth}%`};
  transition: width 0.2s ease-out;
  opacity: ${p => `${p.bopacity}`};
`;

export const DemoHeaderCon = styled.div`
  height: 48px; 
  font-size: 14px;
  font-weight: 700;
  width: 100%; 
`;

interface LeadFormProps {
  fontColor: string;
  borderRadius: number;
  bgColor: string;
  fontSizeNormal?: string;
  fontSizeLarge?: string;
  fontSizeHuge?: string;
  scaleDownLeadForm?: boolean;
}

export const LeadFormEntryCon = styled.div<LeadFormProps>`
  --f-font-normal: ${(props: LeadFormProps) => props.fontSizeNormal ?? '18px'};
  --f-font-large: ${(props: LeadFormProps) => props.fontSizeLarge ?? '24px'};
  --f-font-huge: ${(props: LeadFormProps) => props.fontSizeHuge ?? '30px'};

  @media screen and (max-width: 389px) {
    --f-font-normal: ${(props: LeadFormProps) => props.fontSizeNormal ?? '14px'};
    --f-font-large: ${(props: LeadFormProps) => props.fontSizeLarge ?? '18px'};
    --f-font-huge: ${(props: LeadFormProps) => props.fontSizeHuge ?? '22px'};
  }

--f-ann-font-color: ${(props: LeadFormProps) => props.fontColor};
--f-ann-border-radius: ${(props: LeadFormProps) => `${props.borderRadius}px`};
--f-ann-bg-color: ${(props: LeadFormProps) => props.bgColor};

  br {
    display: block;
    content: '';
    margin-top: 1.25rem;
  }

  p {
    & > img {
      border-radius: ${(props: LeadFormProps) => (props.borderRadius ? `${props.borderRadius}px` : '4px')};
      box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
    }
  }

  ${(props : LeadFormProps) => (
    props.scaleDownLeadForm && `
      p {
        margin: 0.5rem 0;

        &:has(span#fable-lead-form) {
          margin: 0 1rem;
          transform: scale(0.9) translate(0px, -2rem);
        }
      }
    `
  )}

  .LeadForm__container {
    display: block;
    cursor: pointer;
    user-select: none;
    font-family: inherit;
    color: inherit;
    font-size: inherit;
    border-radius: var(--f-ann-border-radius);
    border: none;
    margin-top: 0;
    padding: 0 calc(var(--f-ann-padding-x) * 0.75px) 1.5rem
  }

  .LeadForm__container.focused {
    outline: 2px solid var(--f-ann-font-color);
  }

  .LeadForm__inner {
    width: 100%;
    cursor: default;
    display: flex;
    flex-direction: column;
  }

  .LeadForm__optionContainer {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    margin: 0px;
  }

  .LeadForm__inputValidation {
    transform: translate(1rem, 1rem);
    background: #f87171;
    display: inline-block;
    width: auto;
    align-self: baseline;
    color: black;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 14px;
    visibility: hidden;
    margin-bottom: 6px;
  }

  .LeadForm__optionInputWrapper {
    flex: 1;
    display: flex;
    width: 100%;
    border: none;
    box-shadow: 0 0 0 2px var(--f-ann-font-color);
    padding: 4px 0;
    border-radius: 5px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }

  .LeadForm__optionInputInAnn {
    width: 100%;
    font-size: inherit;
    display: flex;
    flex: 1px;
    font-size: 1.35rem;
    border: 0px;
    padding: 8px 16px;
    color: var(--fable-ann-font-color);
    background-color: transparent;
    font-weight: bold;
    outline: 0px;
    z-index: 0;
  }

  .LeadForm__optionInputInAnn:focus {
    background-color: transparent;
  }
  
  .LeadForm__optionInputInAnn::placeholder {
    font-weight: normal;
    color: var(--f-ann-font-color);
    opacity: 0.75;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:focus,
  select:-webkit-autofill,
  select:-webkit-autofill:hover,
  select:-webkit-autofill:focus {
    -webkit-text-fill-color: ${(props: LeadFormProps) => props.fontColor};
    -webkit-box-shadow: 0 0 0px 1000px transparent inset;
    transition: background-color 5000s ease-in-out 0s;
    background-color: transparent;
  }
`;

export const StyledPopover = styled(Popover)`
.ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #160245 !important;
    background: var(--White, #FFF) !important;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
  }
`;

export const PopoverOption = styled.button`
  display: block;
  background-color: white;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #16023E;

  &:hover {
    background-color: #F8F8F8;
  }
`;

export const OurSegmented = styled(Segmented)`
      border-radius: 8px;
      transition: background 0.3s ease-out;

      .ant-segmented-item-selected {
        background: #160245;
        border-radius: 8px;
        color: white;
        font-weight: 500;
      }
`;
