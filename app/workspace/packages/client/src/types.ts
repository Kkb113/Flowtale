import { RespDemoEntity } from '@fable/common/dist/api-contract';
import { AnnotationPositions, CoverAnnotationPositions, CustomAnnotationPosition, EditFile, IAnnotationAudio, IAnnotationConfig, ITourDataOpts, JourneyData, JourneyFlow, Property, TourData, VideoAnnotationPositions } from '@fable/common/dist/types';
import { IAnnotationConfigWithScreenId } from './component/annotation/annotation-config-utils';
import { RenameDemoHubResult } from './action/creator';
import { Tx } from './container/tour-editor/chunk-sync-manager';
import { P_RespScreen } from './entity-processor';
import { Rect } from './component/base/hightligher-base';

export interface IAnnotationConfigWithLocation extends IAnnotationConfigWithScreenId {
  location: string;
}

export interface JourneyModuleWithAnns extends JourneyFlow {
  isPhony?: boolean;
  annsInOrder: IAnnotationConfigWithLocation[]
}

export const enum ElEditType {
  Text = 1,
  Image,
  Display,
  Blur,
  Mask,
  Input,
  InputValue
}

export type GlobalEditFile = EditFile<AllGlobalElEdits<ElEditType>>;

export interface BaseGlobalElEdit {
  type: ElEditType,
  timeInSec: number,
  fid: string,
  srnId: number,
}

export interface GlobalElEditText extends BaseGlobalElEdit {
  type: ElEditType.Text,
  oldValue: string,
  newValue: string | null,
}
export type EncodingTypeText = [timeInSec: number, oldValue: string, newValue: string | null, fid: string];
export const enum IdxEncodingTypeText {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
  FID,
}

export interface GlobalElEditInput extends BaseGlobalElEdit {
  type: ElEditType.Input,
  oldValue: string,
  newValue: string | null,
}

export interface GlobalElEditInputValue extends BaseGlobalElEdit {
  type: ElEditType.InputValue,
  oldValue: string,
  newValue: string | null,
}

export type EncodingTypeInput = [timeInSec: number, oldValue: string, newValue: string | null, fid: string];
export type EncodingTypeInputValue = [timeInSec: number, oldValue: string, newValue: string | null, fid: string];
export const enum IdxEncodingTypeInput {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
  FID,
}

export interface GlobalElEditImage extends BaseGlobalElEdit {
  type: ElEditType.Image,
  oldValue: string,
  newValue: string | null,
  height: string,
  width: string,
}
export type EncodingTypeImage = [
  timeInSec: number,
  oldValue: string,
  newValue: string | null,
  height: string,
  width: string,
  fid: string,
];

export const enum IdxEncodingTypeImage {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
  HEIGHT,
  WIDTH,
  FID,
}

export interface GlobalElEditBlur extends BaseGlobalElEdit {
  type: ElEditType.Blur,
  oldBlurValue: number,
  newBlurValue: number | null,
  oldFilterPropertyValue: string,
  newFilterPropertyValue: string | null,
}

export type EncodingTypeBlur = [
  timeInSec: number,
  oldBlurValue: number,
  newBlurValue: number | null,
  oldFilterPropertyValue: string,
  newFilterPropertyValue: string | null,
  fid: string,
];
export const enum IdxEncodingTypeBlur {
  TIMESTAMP = 0,
  OLD_BLUR_VALUE,
  NEW_BLUR_VALUE,
  OLD_FILTER_VALUE,
  NEW_FILTER_VALUE,
  FID,
}

export interface GlobalElEditDisplay extends BaseGlobalElEdit {
  type: ElEditType.Display,
  oldValue: string,
  newValue: string | null,
}
export type EncodingTypeDisplay = [timeInSec: number, oldValue: string, newVal: string | null, fid: string];
export const enum IdxEncodingTypeDisplay {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
  FID,
}

export interface GlobalElEditMask extends BaseGlobalElEdit {
  type: ElEditType.Mask,
  newStyle: string | null,
  oldStyle: string,
}
export type EncodingTypeMask = [timeInSec: number, newStyle: string | null, oldStyle: string, fid: string,];
export const enum IdxEncodingTypeMask {
  TIMESTAMP = 0,
  NEW_STYLE,
  OLD_STYLE,
  FID,
}

export type GlobalElEdit = GlobalElEditText | GlobalElEditImage | GlobalElEditBlur
  | GlobalElEditDisplay | GlobalElEditMask | GlobalElEditInput | GlobalElEditInputValue

export interface GlobalElEditValueEncoding {
  [ElEditType.Text]: GlobalElEditText;
  [ElEditType.Image]: GlobalElEditImage;
  [ElEditType.Blur]: GlobalElEditBlur;
  [ElEditType.Display]: GlobalElEditDisplay;
  [ElEditType.Mask]: GlobalElEditMask;
  [ElEditType.Input]: GlobalElEditInput;
  [ElEditType.InputValue]: GlobalElEditInputValue
}

export interface EditValueEncoding {
  [ElEditType.Text]: EncodingTypeText;
  [ElEditType.Image]: EncodingTypeImage;
  [ElEditType.Blur]: EncodingTypeBlur;
  [ElEditType.Display]: EncodingTypeDisplay;
  [ElEditType.Mask]: EncodingTypeMask;
  [ElEditType.Input]: EncodingTypeInput;
  [ElEditType.InputValue]: EncodingTypeInputValue;
}

export const enum IdxEditEncodingText {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
}

export type AllEdits<K extends keyof EditValueEncoding> = Record<string, Partial<Record<K, EditValueEncoding[K]>>>;

export type AllGlobalElEdits<K extends keyof GlobalElEditValueEncoding> = Record<string, Partial<Record<K, GlobalElEditValueEncoding[K]>>>;

export type EditItem = [
  key: string,
  path: string,
  fid: string,
  type: ElEditType,
  isLocalEdit: boolean,
  timestamp: number,
  edit: Partial<EditValueEncoding[keyof EditValueEncoding]>,
  elIdentifierType: ElIdentifierType,
  isGlobalEdit: boolean,
];

export const enum IdxEditItem {
  KEY = 0,
  PATH,
  FID,
  TYPE,
  EDIT_TYPE_LOCAL,
  TIMESTAMP,
  ENCODING,
  EL_IDENTIFIER_TYPE,
  IS_GLOBAL_EDIT,
}

export enum ElIdentifierType {
  PATH = 0,
  FID,
}

export type NavFn = (uri: string, type: 'annotation-hotspot' | 'abs', openInSameTab?: boolean) => void;
export type AnnotationPerScreen = { screen: P_RespScreen, annotations: IAnnotationConfig[] };

export type TourDataChangeFn = (
  changeType: 'annotation-and-theme' | 'screen',
  screenId: number,
  changeObj: { config: IAnnotationConfig, opts?: ITourDataOpts | null, actionType: 'upsert' | 'delete' },
  tx?: Tx,
  isDefault?: boolean,
) => void;

export type onAnnCreateOrChangeFn = (
  screenId: number,
  config: IAnnotationConfig,
  actionType: 'upsert' | 'delete',
  opts: ITourDataOpts | null,
  tx?: Tx // TODO: remove optionality later
) => void;

export type FrameAssetLoadFn = (params: {
  foundAnnotation: boolean;
}) => void;

export type AnnotationMutationType = 'upsert' | 'delete';
export type AnnotationMutation = [
  screenId: number | null,
  updatedConfig: IAnnotationConfig,
  mutationType: AnnotationMutationType
];

export const enum IdxAnnotationMutation {
  ScreenId = 0,
  Config,
  MutationType,
}

export const enum Ops {
  None = 0,
  DuplicateTour
}

export interface IAnnotationConfigWithScreen extends IAnnotationConfig {
  screen: P_RespScreen;
  stepNumber: string;
}

export type SingleTimeline = Array<IAnnotationConfigWithScreen>;
export type Timeline = Array<SingleTimeline>;

export enum DestinationAnnotationPosition {
  next = 'next',
  prev = 'prev'
}

export type ScreenPickerMode = 'create' | 'navigate';

export type ScreenPickerData = {
  screenPickerMode: ScreenPickerMode;
  annotation: IAnnotationConfigWithScreen | null,
  position: DestinationAnnotationPosition,
  showCloseButton: boolean
}

export const STORAGE_PREFIX_KEY_QUERY_PARAMS = 'fable/qp';

export interface FlowProgress {
  main: string;
  totalSteps: number;
  completedSteps: number;
}

export const JOURNEY_PROGRESS_LOCAL_STORE_KEY = 'fable/journey';

export enum InternalEvents {
  DemoLoadingStarted = 'demo_loading_started',
  DemoLoadingFinished = 'demo_loading_finished',
  OnAnnotationNav = 'on_annotation_navigation',
  OnNavigation = 'on_navigation',
  JourneySwitch = 'journey_switch',
  OnCtaClicked = 'on_cta_clicked',
  LeadAssign = 'lead_assign',
  VoiceoverMediaStateChange = 'voiceover_media_state_change',
  OnSelectedElChange = 'on_sel_el_change',
}

export type VoiceoverMediaState = 'none' | 'paused' | 'playing' | 'ended' | 'overlay';

export enum ExtMsg {
  DemoLoadingStarted = 'demo-loading-started',
  DemoLoadingFinished = 'demo-loading-finished',
  OnNavigation = 'on-navigation',
  JourneySwitch = 'journey-switch',
  NavToAnnotation = 'navigate-to-annotation',
  UpdateDemo = 'update-demo',
}

interface MsgBase {
  sender: 'sharefable.com',
  type: ExtMsg,
}

export interface Msg<T> extends MsgBase {
  payload: T
}

export interface CommonPayloadProps {
  demoRid: string,
  demoDisplayName: string,
  demoUrl: string
}

export interface Payload_DemoLoadingStarted extends CommonPayloadProps { }
export interface Payload_DemoLoadingFinished {
  annConfigs: IAnnotationConfigWithScreenId[] | null,
  journeyData: JourneyModuleWithAnns[] | null
}
export interface Payload_JourneySwitch {
  fromJourney: string | null;
  currentJourney: string;
}
export interface Payload_Navigation {
  currentAnnotationRefId: string;
  annotationType: 'video' | 'text' | 'leadform' | 'audio' | 'voiceover';
  journeyIndex: number;
  box: Rect;
  screenId: number;
  annConfigType: 'cover' | 'default'
}

export interface Payload_NavToAnnotation {
  main?: string
  action?: 'prev' | 'next'
}

export interface Payload_UpdateDemo {
  type: ExtMsg.UpdateDemo,
  demoUpdated: boolean,
}

export interface Payload_AnnotationPos {
  top: number,
  left: number;
  width: number;
  height: number;
  dir: AnimEntryDir;
  currentAnnotationRefId: string;
  annotationType: 'cover' | 'default';
}

export interface Payload_TrackerAnnInfo {
  currentAnnotationRefId: string;
  annotationType: 'cover' | 'default';
}

export type MultiNodeModalData = {
  leftCoord: number,
  selectedMultiNode: IAnnotationConfigWithScreen[] | null
}

export interface queryData {
  hm: 0 | 1, // hide module
  ha: 0 | 1 // hide annotation
}

export type TourApplyAllChangeFn = (
  tx?: Tx,
) => void;

export const SCREEN_EDITOR_ID = 'fable-ann-editorial-modal';

export interface LeadActivityData {
  aid: string;
  sid: string;
  uts: string;
  payloadAnnId:string;
  payloadButtonId: string;
}

export interface LeadActivityWithTime extends LeadActivityData {
  timeSpenOnAnnInSec: number
}

export type AnnInverseLookupIndex = Record<string, {
    journeyName: string,
    isJourneyPhony: boolean;
    stepNo: number,
    ann: IAnnotationConfigWithLocation,
    flowIndex: number,
    flowLength: number,
  }>;

export enum TourMainValidity {
  Valid,
  Main_Not_Set,
  Main_Not_Present,
  Journey_Main_Not_Present,
}

export type JourneyOrOptsDataChange = (
  newOpts: ITourDataOpts | null,
  newJourney: JourneyData | null, tx?: Tx
  )=> void;

export const SiteThemePresets = {
  light_green: { bg1: '#6DE195', bg2: '#C4E759' },
  dark_green: { bg1: '#41C7AF', bg2: '#54E38E' },
  light_blue: { bg1: '#ABC7FF', bg2: '#C1E3FF' },
  med_blue: { bg1: '#6CACFF', bg2: '#8DEBFF' },
  dark_blue: { bg1: '#5583EE', bg2: '#41D8DD' },
  violet: { bg1: '#A16BFE', bg2: '#DEB0DF' },
  viloet_pink: { bg1: '#D279EE', bg2: '#F8C390' },
  orange_yellow: { bg1: '#F78FAD', bg2: '#FDEB82' },
  maroon_violet: { bg1: '#BC3D2F', bg2: '#A16BFE' },
  pink_red: { bg1: '#A43AB2', bg2: '#E13680' },
  dark_red: { bg1: '#9D2E7D', bg2: '#E16E93' },
  light_pink: { bg1: '#F5CCF6', bg2: '#F1EEF9' },
  white: { bg1: '#F0EFF0', bg2: '#FAF8F9' },
  black: { bg1: '#121317', bg2: '#323B42' }
};

export interface SiteData {
    logo: Property<string>;
    title: string;
    navLink: Property<string>;
    ctaText: Property<string>;
    ctaLink: Property<string>;
    themePreset?: keyof typeof SiteThemePresets;
    bg1: string;
    bg2: string;
    headerBg: string;
    v: number;
}

export type SiteData_WithProperty = Pick<
SiteData,
  'logo' | 'navLink' | 'ctaText' | 'ctaLink'
>

export const SiteDateKeysWithProperty: Array<keyof SiteData_WithProperty> = ['logo', 'navLink', 'ctaText', 'ctaLink'];

export interface IframePos {
  left: number;
  top: number;
  height: number;
  width: number;
  heightOffset: number;
}

export interface ScreenSizeData {
  iframePos: IframePos,
  scaleFactor: number
}

export interface HiddenEls {
  displayNoneEls: HTMLElement[];
  visibilityHiddenEls: HTMLElement[];
  opacityZeroEls: HTMLElement[];
}

export const enum ScreenMode {
  DESKTOP = 'Desktop',
  MOBILE = 'Mobile'
}

export type ElPathKey = 'm_id' | 'id';

export interface FeatureAvailability {
  isAvailable: boolean,
  isInBeta: boolean,
  requireAccess: boolean,
}

export enum DemoHubPreviewEnumMsgType {
  UPDATE_CONFIG='UPDATE_CONFIG',
  PREVIEW_INIT='PREVIEW_INIT',
}

export interface DemoHubPreviewInit {
  type: DemoHubPreviewEnumMsgType.PREVIEW_INIT,
}

export interface DemoHubPreviewUpdateMsgData {
  type: DemoHubPreviewEnumMsgType.UPDATE_CONFIG,
  config: IDemoHubConfig,
}

export type DemoHubPreviewMsgData = DemoHubPreviewUpdateMsgData | DemoHubPreviewInit;

export type OnDemoHubConfigChangeFn = (demoHubConfig: IDemoHubConfig) => void

export const DemoHubConfigCtaType = ['primary', 'outline', 'link'] as const;
export declare type DemoHubConfigCtaTypeType = typeof DemoHubConfigCtaType[number];

export interface IDemoHubConfigCta {
  text: Property<string>;
  // this id is an derived fields from title.
  // Ideally id = text.replace(/\W+/, '-')
  // If this id changes reference to this cta will also be updated
  id: string;
  deletable: boolean;
  icon?: React.ReactNode;
  iconPlacement?: 'left' | 'right';
  __linkType: 'open_ext_url' | 'open_demo_modal',
  link: Property<string>;
  // by default fable adds two cta 1. See all demos & 2. Book a demo
  // Those are 'system' defined
  __definedBy: 'system' | 'user';
  type: Property<DemoHubConfigCtaTypeType>;
  style: Omit<SimpleStyle, 'borderColor' | 'bgColor'> & {bgColorProp : Property<string>};
}

export interface IDemoHubConfigSeeAllPageSection {
  title: string;
  // Slug is dervied from title
  // slug = title.substring(0,16).toLowerCase().replace(/\W+/, '-');
  id: string;
  slug: string;
  desc: string;
  demos: Array<IDemoHubConfigDemo>;
}

export interface IDemoHubConfigDemo {
  name: string;
  // For old demos (during dev or may be even in prod if we don't run migration),
  // this might not be present, in that case use a fallback image to show thumbnail
  thumbnail: string;
  rid: string;
  desc: string;
}

export interface DemoHubQualificationSidePanel {
  conStyle: SimpleStyle;
  cardStyle: SimpleStyle;
}

export interface IDemoHubConfigQualification {
  id: string;
  __type: 'simple_linear';
  title: string;
  // Slug is dervied from title
  // slug = title.substring(0,16).toLowerCase().replace(/\W+/, '-');
  slug: string;
  entries: Array<SelectEntry | LeadFormEntry | TextEntry>
  // STANDARD_CLASS_NAME `sidepanel-con` `sidepanel-card` `sidepanel-sticy-cta`
  // `sidepanel-card-title` `sidepanel-card-desc-text`
  sidePanel: DemoHubQualificationSidePanel;
  qualificationEndCTA: string[];
}

export interface IDemoHubConfig {
  // monotonically increasing version
  v: number;

  lastUpdatedAt: number;

  logo: Property<string>;

  companyName: Property<string>;

  // In fable we take this value from a dropdown.
  // Here if it's string, it can be any valid google font name
  // TODO what value to enter
  fontFamily: Property<string>;

  // Base font size that would be set as part of the body of the page.
  // All the other fontsize would be set as rem
  baseFontSize: number;

  // this contains list of all ctas.
  // These ctas are used in other different components.
  // By default fable adds some defualt cta to some default component.
  // STANDARD_CLASS_NAME: `cta cta-{{id}}`
  cta: IDemoHubConfigCta[];

  see_all_page: {
    // STANDARD_CLASS_NAME:
    //  container `header`,  logo `logo`, title `title`,
    //  cta con `cta-con`
    header: {
      title: string;
      style: Omit<SimpleStyle, 'borderRadius' | 'borderColor'>;
      // id of the ctas
      ctas: string[]
    };

    // STANDARD_CLASS_NAME `body-text`
    body: {
      // This text is only added for /see-all page
      text: string;
      style: Omit<SimpleStyle, 'borderRadius' | 'borderColor'>;
    };

    // STANDARD_CLASS_NAME
    // container `section`, title `title`, desc `desc`
    // demo card con `demo-con
    sections: IDemoHubConfigSeeAllPageSection[];
    // STANDARD_CLASS_NAME
    // container `demo-card`, thumbnail `thumb`, title `title`
    demoCardStyles: {
     card: SimpleStyle;
     cta: {
      style: Omit<SimpleStyle, 'borderColor' >,
      text: string
    }
    }
    demoModalStyles: {
      overlay: Omit<SimpleStyle, 'borderColor' | 'borderRadius' | 'fontColor'>;
      body: SimpleStyle;
    },
    leadForm: {
      showLeadForm: boolean;
      skipLeadForm: boolean;
      continueCTA: {
        style: Omit<SimpleStyle, 'borderColor'>,
        text: string
     }
    }
  }
  qualification_page: {
    // STANDARD_CLASS_NAME:
    //  container `header`,  logo `logo`, title `title`,
    //  cta con `cta-con`
    header: {
      title: string;
      style: Omit<SimpleStyle, 'borderRadius' | 'borderColor'>;
      // id of the ctas
      ctas: string[];
    };

    // STANDARD_CLASS_NAME `body-text`
    body: {
      // This text is only added for /see-all page
      text: string;
      style: Omit<SimpleStyle, 'borderRadius' | 'borderColor'>;
    };
    qualifications: IDemoHubConfigQualification[];
  }
  leadform: {
    primaryKey: string;
    bodyContent: string;
    displayText: string;
  },
  customScripts: string;
  customStyles: string;
}

export interface SelectEntryOption {
    id: string;
    title: string;
    desc?: string;
    demos: IDemoHubConfigDemo[];
}

// STANDARD-CLASS-NAME `q-con` `title` `desc` `cta-con` `opts-con`
export interface SelectEntry extends EntryBase {
  type: 'single-select' | 'multi-select';
  __ops: 'or';
  options: SelectEntryOption[];
}

export interface TextEntry extends EntryBase {
  type: 'text-entry';
}

export interface LeadFormEntry extends EntryBase {
  type: 'leadform-entry',
  // INFO when  when clicked on continue -- we would do lead form validation
}

export interface EntryBase {
  id: string;
  title: string;
  // Slug is dervied from title
  // slug = title.substring(0,16).toLowerCase().replace(/\W+/, '-');
  slug: string;
  desc?: string;
  style: SimpleStyle;
  // STANDARD-CLASS-NAME `cta-$continue`
  continueCTA: {
    text: string;
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: string;
    icon?: Icon;
    iconPlacement?: 'left' | 'right';
    __linkType: 'continue_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system';
    type: DemoHubConfigCtaTypeType;
    style: Omit<SimpleStyle, 'bgColor' | 'borderColor'>;

  };
  // If skip button is not present then this is undefined
  // STANDARD-CLASS-NAME `cta-$skip`
  skipCTA: {
    text: string;
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: string;
    icon?: Icon;
    iconPlacement?: 'left' | 'right';
    __linkType: 'skip_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system';
    type: DemoHubConfigCtaTypeType;
    style: Omit<SimpleStyle, 'bgColor' | 'borderColor'>;
  }
  showSkipCta: boolean;
}

export interface Icon {
  // ant icons
}

export interface SimpleStyle {
  bgColor: string;
  borderColor: string;
  fontColor: string;
  borderRadius: number;
  bgColorProp?: Property<string>;
}

export interface Vpd {
  width: number;
  height: number;
}

export interface P_RespDemoHub extends RespDemoEntity {
  configFileUri: URL;
  thumbnailUri: URL;
  displayableUpdatedAt: string;
}

export type RenameDemoHubFn = (demoHub: P_RespDemoHub, newName: string) => Promise<RenameDemoHubResult>;

export const AI_PARAM = 'ai=1';

export enum PerVarType {
  TEXT,
  DATASET
}

export type PerVarData = Record<string, {type: PerVarType, val: string}>

export interface LSSavedPersVarData {
  rid: string;
  perVars: PerVarData;
}

export interface TableComponents {
  body?: {
    row?: (props: any) => JSX.Element,
    cell?: (props: any) => JSX.Element,
  },
  header?: {
    cell?: (props: any) => JSX.Element
    row?: (props: any) => JSX.Element,
  },
}

export type TableColumn = {
  id: number;
  name: string;
  desc: string;
};

export type TableRow = {
  [key: string]: string;
};

export type Table = {
  columns: TableColumn[];
  rows: TableRow[];
  colSeq: number;
};

export interface DatasetConfig {
  v: number,
  lastUpdatedAt: number | -1,
  data: {
    table: Table
  }
}

export interface DemoState {
  id: number;
  text: string;
  nextButtonText?: string;
}

export interface DemoStateWithAnnRefId extends DemoState{
  annRefId: string;
}

export enum QuillyInPreviewProgress {
  NOT_STARTED='NOT_STARTED',
  ROOT_ROUTER = 'ROOT_ROUTER',
  LLM_CALL_FOR_TOUR_UPDATE = 'LLM_CALL_FOR_TOUR_UPDATE',
  UPDATE_TOUR = 'UPDATE_TOUR',
  LOAD_TOUR = 'LOAD_TOUR'
}

export interface UpdateDemoUsingQuillyError {
  hasErr: boolean;
  errMsg: string;
  isSkillNa: boolean;
}

export interface AnnVoiceOverDetail extends IAnnotationAudio{
  isSuccessful: boolean,
}

export type OpenAIVoices = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export type Positions = AnnotationPositions
  | VideoAnnotationPositions
  | CustomAnnotationPosition
  | CoverAnnotationPositions;

export type AnimEntryDir = 'l' | 't' | 'r' | 'b';
export enum QuadrantType {
  TopLeft,
  TopRight,
  BottomLeft,
  BottomRight,
  Reset,
  Custom
}

export interface BaseQuadrant {
  to: QuadrantType
}

export interface CustomQuadrant extends BaseQuadrant{
  to: QuadrantType.Custom;
  scale: number;
  top: number;
  left: number;
}

export interface DefaultQuadrant extends BaseQuadrant{
  to: QuadrantType.TopLeft | QuadrantType.TopRight | QuadrantType.BottomLeft
  | QuadrantType.BottomRight | QuadrantType.Reset
}

export type Quadrant = CustomQuadrant | DefaultQuadrant;

export enum INTERACTIVE_MODE {
  INTERACTIVE_TOUR= 'Interactive Tour',
  INTERACTIVE_VIDEO= 'Interactive Video'
}
