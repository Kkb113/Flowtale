import { RespScreen, SchemaVersion } from './api-contract';

export enum ProxyAttrs {
  href = 'href',
  src = 'src',
  style = 'style',
  cssRules = 'cssRules',
  srcset = 'srcset',
  'xlink:href' = 'xlink:href',
  'adoptedStylesheets' = 'adoptedStylesheets',
}

export type ProxyUrlMap = {
  [key in ProxyAttrs]?: string[];
};

export interface RectWithFId {
  x: number;
  y: number;
  width: number;
  height: number;
  fid: string;
}

export interface InteractionCtx {
  type: 'click',
  focusEl: RectWithFId,
  candidates: RectWithFId[]
}

export interface SerNode {
  type: number;
  name: string;
  attrs: Record<string, string | null>;
  props: {
    content?: string;
    nodeProps?: {
      type?: string;
      value?: string | boolean | number;
      checked?: boolean;
    };
    cssRules?: string;
    proxyUrlMap: ProxyUrlMap;
    isStylesheet?: boolean;
    textContent?: string | null;
    isInlineSprite?: boolean;
    absoluteUrl?: string;
    spriteId?: string;
    isHidden?: boolean;
    isShadowHost?: boolean;
    isShadowRoot?: boolean;
    origHref?: string | null;
    base64Img?: string;
    rect?: {
      height: number;
      width: number;
    };
    adoptedStylesheets?: string[];
    aidxdy?: AiDxDy;
  };
  chldrn: SerNode[];
  sv: number;
}

export interface AiDxDy {
    dx: number,
    dy: number
}
export interface SerNodeWithPath extends SerNode {
  path: string;
}

export interface PostProcess {
  type: 'asset' | 'iframe' | 'elpath' | 'object' | 'inline-sprite';
  path: string;
}

export interface SerDoc {
  iriReferencedSvgEls: Record<string, string>;
  frameUrl: string;
  userAgent: string;
  name: string;
  title: string;
  postProcesses: Array<PostProcess>;
  icon: SerNodeWithPath | null;
  docTree?: SerNode;
  docTreeStr: string;
  rect: {
    height: number;
    width: number;
  };
  baseURI: string;
  isHTML5: boolean;
  frameId?: string | null
}

export interface CapturedViewPort {
  h: number;
  w: number;
}

export interface ScreenData {
  version: string;
  vpd: CapturedViewPort;
  docTree: SerNode;
  isHTML4: boolean;
}

export interface EditFile<T> {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
  edits: T;
}

export interface TourEntity {
  type: 'screen' | 'qualification';
  ref: string;
}

export interface TourScreenEntity extends TourEntity {
  type: 'screen';
  annotations: Record<string, IAnnotationOriginConfig>;
}

export interface IChronoUpdatable {
  monoIncKey: number;
  createdAt: number;
  updatedAt: number;
}

export interface ITourDataOpts extends IChronoUpdatable {
  lf_pkf: string; // stands for lead form primary key
  primaryColor: Property<string>;
  annotationBodyBackgroundColor: Property<string>;
  annotationBodyBorderColor: Property<string>;
  annotationFontFamily: Property<string | null>;
  annotationFontColor: Property<string>;
  main: string;
  borderRadius: Property<number>;
  showFableWatermark: Property<boolean>;
  annotationPadding: Property<string>;
  showStepNum: Property<boolean>;
  reduceMotionForMobile: boolean;
}

export type TourDataOpts_WithProperty = Pick<
   ITourDataOpts,
  'primaryColor'| 'annotationBodyBackgroundColor' |'annotationBodyBorderColor'
  | 'annotationFontFamily' |'annotationFontColor' | 'borderRadius' | 'showFableWatermark'
  | 'annotationPadding' | 'showStepNum'
>

export interface ITourLoaderData {
  logo: {url: Property<string>},
  loader: {
      url: string;
      type: 'gif' | 'lottie' | '';
  },
  lastUpdatedAtUTC: number;
  loadingText: Property<string>;
  version: string;
}

export interface ScreenDiagnostics {
  type: string,
  reason: string,
  code: number,
}

export type ITourDiganostics = Record<number, ScreenDiagnostics[]>

export interface TourDataWoScheme {
  opts: ITourDataOpts,
  entities: Record<string, TourEntity>;
  diagnostics: ITourDiganostics;
  journey: JourneyData;
}

export interface TourData extends TourDataWoScheme {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
}

export enum LoadingStatus {
  NotStarted,
  InProgress,
  Done,
  Error
}

// ---- types for Annotation ----

export enum CustomAnnotationPosition {
  TOP_LEFT = 'c-top-left',
  TOP_CENTER = 'c-top-center',
  TOP_RIGHT = 'c-top-right',
  RIGHT_TOP = 'c-right-top',
  RIGHT_CENTER = 'c-right-center',
  RIGHT_BOTTOM = 'c-right-bottom',
  BOTTOM_RIGHT = 'c-bottom-right',
  BOTTOM_CENTER = 'c-bottom-center',
  BOTTOM_LEFT = 'c-bottom-left',
  LEFT_BOTTOM = 'c-left-bottom',
  LEFT_CENTER = 'c-left-center',
  LEFT_TOP = 'c-left-top'
}

export enum CoverAnnotationPositions {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum AnnotationPositions {
  Auto = 'auto',
}

export enum VideoAnnotationPositions {
  BottomRight = 'bottom-right',
  BottomLeft = 'bottom-left',
  Center = 'center',
  Follow = 'follow',
}

export interface IAnnotationHotSpot {
  type: 'button',
}

export enum AnnotationButtonStyle {
  Primary = 'primary',
  Link = 'link',
  Outline = 'outline'
}

export enum AnnotationButtonSize {
  Large = 'large',
  Medium = 'medium',
  Small = 'small'
}

export type IAnnotationButtonType = 'next' | 'prev' | 'custom';

export interface IAnnotationButton {
  id: string;
  type: IAnnotationButtonType
  text: Property<string>;
  style: Property<AnnotationButtonStyle>;
  size: Property<AnnotationButtonSize>;
  exclude?: boolean;
  // This is used to sort buttons for display
  // next button normally have very high order since it would be towards the end
  // prev button normally have very low order since it would be towards the start
  // all the other buttons are in between
  order: number;
  // TODO right now hotspots are created from here for. Later on with other entity check where
  // the hotspot could be created
  hotspot: ITourEntityHotspot | null;
}

export type IAnnotationButton_WithProperty = Pick<
IAnnotationButton,
  'text' | 'style' | 'size'
>

export interface ITourEntityHotspot {
  type: 'el' | 'an-btn',
  on: 'click',
  target: string;
  actionType: 'navigate' | 'open';
  actionValue: Property<string>;
  openInSameTab?: boolean;
}

export type EAnnotationBoxSize = 'small' | 'medium' | 'large' | 'custom';

export const AnnotationButtonLayout = ['default', 'full-width'] as const;
export declare type AnnotationButtonLayoutType = typeof AnnotationButtonLayout[number];

export const AnnotationSelectionShape = ['box', 'pulse'] as const;
export declare type AnnotationSelectionShapeType = typeof AnnotationSelectionShape[number];

export const AnnotationSelectionEffect = ['regular', 'blinking'] as const;
export declare type AnnotationSelectionEffectType = typeof AnnotationSelectionEffect[number];

export const ScrollAdjustment = ['auto', 'scroll', 'sticky'] as const;
export declare type ScrollAdjustmentType = typeof ScrollAdjustment[number];

export type CustomAnnDims = {
  width: number,
}

export interface IAnnotationVoiceover {
  updatedAt: number;
  voiceUsed: string;
}

export interface IAnnotationOriginConfig extends IChronoUpdatable {
  id: string;
  refId: string;
  grpId: string;
  zId: string;
  bodyContent: string;
  displayText: string;
  positioning: AnnotationPositions | VideoAnnotationPositions | CustomAnnotationPosition | CoverAnnotationPositions,
  buttons: IAnnotationButton[],
  type: 'cover' | 'default',
  size: EAnnotationBoxSize,
  customDims: CustomAnnDims,
  isHotspot: boolean,
  hideAnnotation: boolean,
  videoUrl: string;
  hotspotElPath: string | null;
  videoUrlHls: string;
  videoUrlMp4: string;
  videoUrlWebm: string;
  showOverlay: boolean;
  buttonLayout: AnnotationButtonLayoutType;
  selectionShape: Property<AnnotationSelectionShapeType>;
  selectionEffect: Property<AnnotationSelectionEffectType>;
  targetElCssStyle: string;
  annCSSStyle: string;
  annotationSelectionColor: Property<string>;
  isLeadFormPresent: boolean;
  m_id: string;
  scrollAdjustment: ScrollAdjustmentType;
  audio: null | IAnnotationAudio;
  voiceover: null | IAnnotationVoiceover;
  markedImage: string | null;
}

export type IAnnotationConfig_WithProperty = Pick<
   IAnnotationOriginConfig,
  'selectionEffect' | 'selectionShape' | 'annotationSelectionColor'
>

export interface IAnnotationAudio {
  webm: string;
  hls: string;
  // fb is the fallback url, the url which is sent for transcoding
  fb: {
    url: string;
    type: 'audio/webm' | 'audio/mpeg';
  }
}

// TODO perform this conversion, client side
export interface IAnnotationConfig extends IAnnotationOriginConfig {
  syncPending: boolean;
}

export interface Coords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum AnnotationFontSize {
  normal = 'var(--f-font-normal)',
  large = 'var(--f-font-large)',
  huge = 'var(--f-font-huge)'
}

export interface ThemeCandidature {
  colorList: string[];
  borderRadius: Array<number | 'global'>;
}

export const DEFAULT_BORDER_RADIUS = 4;

export enum NODE_NAME {
  div = 'div',
  a = 'a',
  button = 'button',
}

export type ThemeColorCandidatPerNode = {
  [key in NODE_NAME]: Record<string, number>;
}

export type ThemeBorderRadiusCandidatePerNode = {
  [key in NODE_NAME]: Record<string, number>;
}

export interface ThemeStats {nodeColor: ThemeColorCandidatPerNode, nodeBorderRadius: ThemeBorderRadiusCandidatePerNode}

export enum CmnEvtProp {
  FIRST_NAME = 'first_name',
  LAST_NAME = 'last_name',
  EMAIL = 'email',
  TOUR_URL = 'tour_url',
  DEMO_HUB_RID = 'demo_hub_rid'
}

export interface JourneyData {
  positioning: CreateJourneyPositioning;
  title: string;
  flows: JourneyFlow[];
  cta?: JourneyCTA;
  primaryColor: Property<string>;
  hideModuleOnLoad: boolean;
  hideModuleOnMobile: boolean;
}

export interface JourneyCTA {
  size: Property<AnnotationButtonSize>;
  text: Property<string>;
  navigateTo: Property<string>;
}

export interface JourneyFlow {
  header1: string;
  header2: string;
  main: string;
  mandatory: boolean;
}

export enum CreateJourneyPositioning {
  Left_Bottom= 'leftbottom',
  Right_Bottom= 'rightbottom'
}

export interface Property<T> {
  type: PropertyType,
  from: string,
  _val: T,
}

export enum PropertyType {
  REF,
  LITERAL,
}

export interface IGlobalConfig {
  logo: string;
  companyUrl: string;

  demoLoadingText: string;
  fontFamily: string;
  primaryColor: string;
  annBodyBgColor: string;
  annBorderColor: string;
  fontColor: string;
  annBorderRadius: number;
  annConPad: string;
  selColor: string;
  selShape: AnnotationSelectionShapeType;
  selEffect: AnnotationSelectionEffectType;
  showStepNo: boolean;
  showWatermark: boolean;

  nextBtnText: string;
  nextBtnStyle: AnnotationButtonStyle;
  prevBtnText: string;
  prevBtnStyle: AnnotationButtonStyle;
  customBtn1Text: string;
  customBtn1Style: AnnotationButtonStyle;
  customBtn1URL: string;
  ctaSize: AnnotationButtonSize;

  monoIncKey: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}
