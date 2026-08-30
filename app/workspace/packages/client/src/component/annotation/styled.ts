import styled, { keyframes, css, SimpleInterpolation } from 'styled-components';
import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationButtonLayoutType,
  AnnotationFontSize
} from '@fable/common/dist/types';
import { Rect } from '../base/hightligher-base';
import { generateShadeColor } from './utils';
import { getColorContrast } from '../../utils';

export const AnContent = styled.div<{
  bgColor: string,
  borderRadius: number,
  primaryColor: string,
  fontColor: string,
  padding: [number, number]
}>`
  --f-ann-bg-color: ${(p) => p.bgColor};
  --f-ann-border-radius: ${(p) => p.borderRadius}px;
  --f-ann-primary-color: ${(p) => p.primaryColor};
  --f-ann-font-color: ${(p) => p.fontColor};
  --f-ann-padding-x: ${(p) => p.padding[0]};
  --f-ann-padding-y: ${(p) => p.padding[1]};
  --f-pad-multi: 1px;

  --f-font-normal: 18px;
  --f-font-large: 24px;
  --f-font-huge: 30px;

  @media screen and (max-width: 480px) {
    --f-font-normal: 14px;
    --f-font-large: 18px;
    --f-font-huge: 22px;
    --f-ann-padding-x: ${(p) => p.padding[0] * 0.5};
    --f-ann-padding-y: ${(p) => p.padding[1] * 0.5};
    --f-pad-multi: 0.75px;
  }

  background: ${(p) => `linear-gradient(45deg, color-mix(in srgb, ${p.bgColor} 97%, white) 0%, color-mix(in srgb, ${p.bgColor} 97%, black) 100%)`};
  font-size: 1.1rem;
  position: absolute;
  border-radius: 4px;
  padding: 0;
  margin: 0;

  height: auto;
  * {
    height: auto;
  }

  .hide-span-child span {
    display: none;
  }

  a {
    color: inherit;
    text-decoration: underline dotted;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .f-progress {
    color: var(--f-ann-font-color);
  }

  .f-back-btn-icon {
    svg {
      fill: var(--f-ann-primary-color);
    }
  }

  .hide-span-child iframe,
  .fable-video-embed-frame {
    aspect-ratio: 16/9;
    width: 100%;
    border: none;
    border-radius: 16px;
  }

  .LeadForm__container {
    display: block;
    cursor: pointer;
    user-select: none;
    font-family: inherit;
    color: inherit;
    font-size: inherit;
    border-radius: var(--f-ann-border-radius);
    background-color: ${p => (getColorContrast(p.bgColor) === 'dark' ? '#ffffff1a' : '#bcbcbc1a')};
    border: none;
    margin-top: 0;
    padding: 0 calc(var(--f-ann-padding-x) * 0.75px) 1.5rem
  }

  .LeadForm__container.focused {
    outline: 2px solid var(--f-ann-primary-color);
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
    background: color-mix(in srgb, var(--f-ann-bg-color) 95%, white);
    display: inline-block;
    width: auto;
    align-self: baseline;
    color: color-mix(in srgb, var(--f-ann-font-color) 90%, white);
    filter: hue-rotate(180deg);
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
    box-shadow: 0 0 0 2px var(--f-ann-primary-color);
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
    -webkit-text-fill-color: ${(p) => p.fontColor};
    -webkit-box-shadow: 0 0 0px 1000px transparent inset;
    transition: background-color 5000s ease-in-out 0s;
    background-color: transparent;
  }
`;

export const AnInnerContainer = styled.div`
  display:flex;
  flex-direction:column;
  padding: calc(var(--f-ann-padding-x) * 1px);
  z-index: 9999;
  word-break: break-word;
`;

interface AnTextContentProps {
  fontFamily: string | null;
  fontColor: string | null;
  borderRadius: number;
}

export const AnTextContent = styled.div`
  font-weight: 500;

  p {
    margin: 0;
    font-weight: 500;
  }
  p img {
    margin-top: 0.2em;
    border-radius: ${(props: AnTextContentProps) => `${props.borderRadius}px`};
  }

  p, p.editor-paragraph {
    font-size: ${AnnotationFontSize.normal};
    font-family: ${(p: AnTextContentProps) => p.fontFamily || 'inherit'};
    color: ${(p: AnTextContentProps) => `${p.fontColor}`};
  }

  * {
    color: inherit;
    font-family: inherit;
  }
`;

interface ButtonConProps {
  justifyContent: string;
  borderTopColor: string;
  btnLength: number;
  flexDirection: 'row' | 'column';
  anPadding: string;
}

export const ButtonCon = styled.div`
  position: relative;
  display: flex;
  justify-content: ${(props: ButtonConProps) => props.justifyContent};
  align-items: flex-end;
  padding-top: calc(var(--f-ann-padding-y) * 1px);
  gap: 2rem;
  flex-direction: ${(props: ButtonConProps) => props.flexDirection};

  ${(props: ButtonConProps) => (
    props.btnLength !== 2 || props.flexDirection === 'column'
      ? `& > p {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) translateY(-50%); 
        padding: 0 10px;
      }`
      : ''
  )}
`;

export const Progress = styled.p<{bg: string; fg: string, fontFamily: string}>`
  font-size: 1rem;
  margin: 0;
  backdrop-filter: blur(8px);
  background-color: #0000ff00;
  color: ${props => props.fg}a8;
  font-family: ${props => props.fontFamily};
`;

export const ABtn = styled.button`
  border-radius: 2px;
  font-size: var(--f-font-normal);
  font-weight: bold;
  box-sizing: border-box;
  text-align: center;


  border-radius: ${(props: BtnConf) => `${props.borderRadius}px`};

  order: ${(props: BtnConf) => (props.idx === 0 ? -1 : 0)};

  border: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Outline) return `1px solid ${p.color}`;
    return 'none';
  }};

  background: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Primary) return p.color;
    return '#ffffff00';
  }};
  
  color: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Primary) return getColorContrast(p.color) === 'dark' ? '#fff' : '#000';
    return getColorContrast(p.bg) === 'dark' ? '#fff' : '#000';
  }};
  
  &.f-ann-btn {
    color: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Primary) return getColorContrast(p.color) === 'dark' ? '#fff' : '#000';
    return getColorContrast(p.bg) === 'dark' ? '#fff' : '#000';
  }};
  }

  padding: ${(p: BtnConf) => {
    if (p.size === AnnotationButtonSize.Large) {
      return p.noPad ? '0px 0px' : 'calc(12 * var(--f-pad-multi)) calc(22 * var(--f-pad-multi))';
    } if (p.size === AnnotationButtonSize.Medium) {
      return p.noPad ? '0px 0px' : 'calc(8 * var(--f-pad-multi)) calc(18 * var(--f-pad-multi))';
    }
    return p.noPad ? '0px 0px' : 'calc(4 * var(--f-pad-multi)) calc(12 * var(--f-pad-multi))';
  }};
  font-family: ${(p: BtnConf) => p.fontFamily || 'inherit'};
  &:hover {
    cursor: pointer;
    text-decoration: ${(p: BtnConf) => (p.btnStyle === 'link' ? 'underline' : 'none')};
  }
  width:  ${(p: BtnConf) => (p.btnLayout === 'default' ? 'auto' : '100%')};
  opacity: 0.8;
  transition: opacity 0.2s ease-out;

  &:hover {
    opacity: 1;
  }
`;

export interface BtnConf {
  btnStyle: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  color: string;
  fontFamily: string | null;
  btnLayout: AnnotationButtonLayoutType;
  borderRadius: number;
  idx?: number;
  bg: string;
  noPad?: boolean;
}

interface AnHotspotProps {
  selColor: string;
  box: Rect;
  scrollX: number;
  scrollY: number;
  shouldAnimate: boolean;
}

const createBoxShadowKF = (selColor: string) : SimpleInterpolation => keyframes`
  50% {box-shadow: 0 0 0 4px ${selColor};}
`;

export const BoxShadowKFRule = css`
  ${({ selColor }: { selColor: string }) => css`
    ${createBoxShadowKF(selColor)} 2s infinite;
  `}
`;

export const AnHotspot = styled.div`
  background: transparent;
  cursor: pointer;
  animation: ${(p: AnHotspotProps) => (p.shouldAnimate ? BoxShadowKFRule : 'none')};
  border-radius: 4px;
  position: absolute;
  top: ${(p: AnHotspotProps) => `${p.box.top}px`};
  left: ${(p: AnHotspotProps) => `${p.box.left}px`};
  width: ${(p: AnHotspotProps) => `${p.box.width}px`};
  height: ${(p: AnHotspotProps) => `${p.box.height}px`};
  transition: all 0.3s ease-in-out;

  &:hover {
    background-color: color-mix(in srgb, ${(p: AnHotspotProps) => p.selColor} 10%, rgba(0, 0, 0, 0.1));
  }
`;

export const AnBubble = styled.div<{bubbleWidth: number}>`
  width: ${(p) => `${p.bubbleWidth}px`}; 
  height: ${(p) => `${p.bubbleWidth}px`}; 
  cursor: pointer;
`;

export const AnMediaContainer = styled.div`
  transform-origin: 0px 0px;
  border-radius: 8px;
  * {
    height: auto;
  }
`;

export const MediaCon = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
`;

export const AnVideo = styled.video`
  width: 100%;
  border-radius: 24px;
  box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px;
  object-fit: cover;
`;

export const AnAudioCon = styled.div<{ bgColor: string }>`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px;
  background: ${p => `${p.bgColor}`};
  display: flex;
  align-items: center;
  canvas {
    height: 50px;
    width: 100%;
  }
`;

export const AnMediaControls = styled.div<{showOverlay: boolean}>`
  transition: all 0.2s ease-in-out;
  background-color: ${(p) => (p.showOverlay ? 'rgba(0, 0, 0, 0.4)' : 'transparent')};
  height: 100%;
  border-radius: 24px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
`;

export const LoaderCon = styled.div`
    height: 4px;

  * {
    height: 4px;
  }
`;

export const AnMediaCtrlBtnsCon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
`;

export const AnMediaCtrlBtn = styled.button<{ showButton: boolean }>`
  color: white;
  background-color: transparent;
  font-size: 2rem !important;
  border: none;
  display: ${p => (p.showButton ? 'flex' : 'none')};
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;

  > span.anticon {
    display: block;
    height: 1em;
  }

  transition: all 0.2s ease-in-out;

  &:hover {
    transform: scale(1.2);
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
  }
`;

export const ReplayButton = styled.button<{ pcolor: string, showButton: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  height: 56px;
  width: 56px;
  border-radius: 50%;
  background: ${p => generateShadeColor(p.pcolor, 200)};
  color: ${p => `${p.pcolor}`};
  font-size: 1.6rem;
  border: none;
  display: ${p => (p.showButton ? 'flex' : 'none')};
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease-in-out;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  > span.anticon {
    display: block;
    height: 1em;
  }
`;

export const Loader = styled.div`
  width: 48px;
  height: 48px;
  border: 5px solid #FFF;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
   @keyframes rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
   }
`;

const bottomToTop = keyframes`
  from {
    bottom: -1rem;
    opacity: 0;
  }

  to {
    bottom: 0.5rem;
    opacity: 1;
  }
`;

export const NavButtonCon = styled.div<{ pcolor: string, padding: [number, number] }>`
  --f-ann-padding-x: ${(p) => p.padding[0]};
  --f-ann-padding-y: ${(p) => p.padding[1]};
  --f-pad-multi: 1px;

  @media screen and (max-width: 480px) {
    --f-ann-padding-x: ${(p) => p.padding[0] * 0.5};
    --f-ann-padding-y: ${(p) => p.padding[1] * 0.5};
    --f-pad-multi: 0.75px;
  }

  position: absolute;
  display: flex;
  justify-content: space-between;
  align-items: center;
  bottom: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;

  animation: ${bottomToTop} 0.2s ease-in-out;

  .serial-num {
    color: ${p => generateShadeColor(p.pcolor, -200)};
  }

  .next-btn {
    color: ${p => generateShadeColor(p.pcolor, 200)};
    background: ${p => `${p.pcolor}bf`};

    &:hover {
      background: ${p => `${p.pcolor}`};
    }
  }

  .back-btn {
    background: ${p => generateShadeColor(p.pcolor, 200)};
    opacity: 0.8;
    color: ${p => `${p.pcolor}`};

    &:hover {
      opacity: 1;
    }
  }
`;

const helpBubblePulse = keyframes`
  0% {
    transform: scale(1);
    opacity: .75;
  }
  25% {
    transform:scale(1);
    opacity:.75;
  }
  100% {
    transform:scale(2.5);
    opacity:0
  }
`;

export const HelpBubble = styled.a<{selColor?: string, bubbleDiameter: number}>`
  display: block;
  position: absolute;
  z-index: 2;
  cursor: pointer;
  left: 0px;
  top: 0px;

  &:after {
    content: "";
    background-color: ${({ selColor }) => selColor || 'rgba(117,103,255)'};
    width: ${({ bubbleDiameter }) => bubbleDiameter}px;
    height: ${({ bubbleDiameter }) => bubbleDiameter}px;
    border-radius: 50%;
    position: absolute;
    display: block;
    top: 1px;
    left: 1px;
  }
`;

export const HelpBubbleOuterDot = styled.span<{ selColor?: string, bubbleDiameter: number }>`
  margin: 1px;
  display: block;
  text-align: center;
  opacity: 1;
  background-color: ${({ selColor }) => selColor || 'rgba(117,103,255)'};
  width: ${({ bubbleDiameter }) => bubbleDiameter}px;
  height: ${({ bubbleDiameter }) => bubbleDiameter}px;
  border-radius: 50%;
  animation: ${helpBubblePulse} 1.5s linear infinite;
`;

export const HelpBubbleInnerDot = styled.span<{ selColor?: string, bubbleDiameter: number }>`
  background-position: absolute;
  display: block;
  text-align: center;
  opacity: 1;
  background-color: ${({ selColor }) => selColor || 'rgba(117,103,255)'};
  width: ${({ bubbleDiameter }) => bubbleDiameter}px;
  height: ${({ bubbleDiameter }) => bubbleDiameter}px;
  border-radius: 50%;
  -webkit-animation: ${helpBubblePulse} 1.5s linear infinite;
  -moz-animation: ${helpBubblePulse} 1.5s linear infinite;
  -o-animation: ${helpBubblePulse} 1.5s linear infinite;
  animation: ${helpBubblePulse} 1.5s linear infinite;

  &:after {
  content: "";
  background-position: absolute;
  display: block;
  text-align: center;
  opacity: 1;
  background-color: ${({ selColor }) => selColor || 'rgba(117,103,255, 0.5)'};
  width: ${({ bubbleDiameter }) => bubbleDiameter}px;
  height: ${({ bubbleDiameter }) => bubbleDiameter}px;
  border-radius: 50%;
  -webkit-animation: ${helpBubblePulse} 1.5s linear infinite;
  -moz-animation: ${helpBubblePulse} 1.5s linear infinite;
  -o-animation: ${helpBubblePulse} 1.5s linear infinite;
  animation: ${helpBubblePulse} 1.5s linear infinite;
  }
`;

export const Con = styled.div`
  position: fixed;
`;

export const SoundWavePlaceholderCon = styled.div<{ bgColor: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: space-between;
  height: 64px;
  margin: auto;
  --boxSize: 8px;
  --gutter: 4px;
  width: calc((var(--boxSize) + var(--gutter)) * 5);

  @-webkit-keyframes quiet {
    25% {
      transform: scaleY(0.6);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(0.8);
    }
  }
  @keyframes quiet {
    25% {
      transform: scaleY(0.6);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(0.8);
    }
  }
  @-webkit-keyframes normal {
    25% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(0.6);
    }
  }
  @keyframes normal {
    25% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(0.6);
    }
  }
  @-webkit-keyframes loud {
    25% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(1.2);
    }
  }
  @keyframes loud {
    25% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.4);
    }
    75% {
      transform: scaleY(1.2);
    }
  }

  .box {
    transform: scaleY(0.4);
    height: 100%;
    width: var(--boxSize);
    background: ${(props) => props.bgColor};
    -webkit-animation-duration: 1.2s;
    animation-duration: 1.2s;
    -webkit-animation-timing-function: ease-in-out;
    animation-timing-function: ease-in-out;
    -webkit-animation-iteration-count: infinite;
    animation-iteration-count: infinite;
    border-radius: 8px;
  }

  .box1 {
    -webkit-animation-name: quiet;
    animation-name: quiet;
  }

  .box2 {
    -webkit-animation-name: normal;
    animation-name: normal;
  }

  .box3 {
    -webkit-animation-name: quiet;
    animation-name: quiet;
  }

  .box4 {
    -webkit-animation-name: loud;
    animation-name: loud;
  }

  .box5 {
    -webkit-animation-name: quiet;
    animation-name: quiet;
  }
`;

export const AnnotationCardCon = styled.div`
  .anticon:before {
    display: none;
  }
`;

export const VoiceoverBtnOverlay = styled.div<{ height: number, width: number,
  bgColor: string, top: number, left: number}>`
  --f-pad-multi: 1px;
  --f-font-normal: 18px;
  --f-font-large: 24px;
  --f-font-huge: 30px;

    @media screen and (max-width: 480px) {
    --f-pad-multi: 0.75px;
    --f-font-normal: 14px;
    --f-font-large: 18px;
    --f-font-huge: 22px;
  }
    
  width: ${(p) => `${p.width}px`}; 
  height: ${(p) => `${p.height}px`}; 
  top: ${(p) => `${p.top}px`};
  left: ${(p) => `${p.left}px`};
  position: absolute;
  background-color: ${(p) => `${p.bgColor}cc`};
  background-color-opacity: 0.8; 
  justify-content: center;
  align-items: center;
  display: flex; 
  flex-direction: column;
  gap: 20px;
  backdrop-filter: blur(4px);
`;
