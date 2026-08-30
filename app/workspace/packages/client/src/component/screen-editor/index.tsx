import {
  AimOutlined,
  ArrowsAltOutlined,
  DesktopOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  FormatPainterOutlined,
  HomeOutlined,
  LoadingOutlined,
  MobileOutlined,
  PictureOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { FrameSettings, ReqTourPropUpdate, Responsiveness, ScreenType } from '@fable/common/dist/api-contract';
import { DEFAULT_BLUE_BORDER_COLOR } from '@fable/common/dist/constants';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import {
  CmnEvtProp,
  IAnnotationButtonType,
  IAnnotationConfig,
  IGlobalConfig,
  ITourDataOpts,
  JourneyData,
  ScreenData
} from '@fable/common/dist/types';
import { getCurrentUtcUnixTime, getDefaultTourOpts, getRandomId, getSampleConfig } from '@fable/common/dist/utils';
import { Button, Dropdown, MenuProps, Modal, Popover, Switch, Tooltip } from 'antd';
import { nanoid } from 'nanoid';
import React from 'react';
import { UpdateScreenFn } from '../../action/creator';
import {
  amplitudeDeviceModeChange,
  amplitudeNewAnnotationCreated,
  amplitudeReselectElement,
  amplitudeResponsivenessChange,
  amplitudeScreenEdited,
  propertyCreatedFromWithType
} from '../../amplitude';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import ExpandIcon from '../../assets/creator-panel/expand-arrow.svg';
import MaskIcon from '../../assets/creator-panel/mask-icon.png';
import NewAnnotation from '../../assets/creator-panel/new-annotation.svg';
import NewCoverAnnotation from '../../assets/creator-panel/new-cover-annotation.svg';
import NewMultiAnnotation from '../../assets/creator-panel/new_multi_annotation.svg';
import * as GTags from '../../common-styled';
import { FABLE_AUDIO_MEDIA_CONTROLS, SCREEN_DIFFS_SUPPORTED_VERSION } from '../../constants';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import { convertTupleToGlobalElEdit, P_RespScreen, P_RespSubscription, P_RespTour } from '../../entity-processor';
import { FeatureForPlan } from '../../plans';
import {
  AllEdits,
  AllGlobalElEdits,
  AnnotationPerScreen,
  DestinationAnnotationPosition, EditItem,
  EditValueEncoding,
  ElEditType,
  ElPathKey,
  FrameAssetLoadFn, GlobalElEditValueEncoding, IAnnotationConfigWithScreen, INTERACTIVE_MODE, IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeInput,
  IdxEncodingTypeMask,
  NavFn,
  ScreenMode,
  Timeline,
  TourDataChangeFn,
  onAnnCreateOrChangeFn
} from '../../types';
import EditingInteractiveDemoGuidePart2 from '../../user-guides/editing-interactive-demo-guide/part-2';
import SelectorComponent from '../../user-guides/selector-component';
import { UserGuideMsg } from '../../user-guides/types';
import {
  AEP_HEIGHT,
  ANN_EDIT_PANEL_WIDTH,
  RESP_MOBILE_SRN_HEIGHT,
  RESP_MOBILE_SRN_WIDTH,
  doesBtnOpenALink,
  extractHandlebarsFromAnnotations,
  getAnnTextEditorErrors,
  getAnnotationWithScreenAndIdx,
  getFidOfNode,
  isEventValid,
  isFeatureAvailable,
  isTourResponsive,
} from '../../utils';
import {
  IAnnotationConfigWithScreenId,
  shallowCloneAnnotation,
  updateAnnotationZId,
  updateAnnotationHideAnnotation,
} from '../annotation/annotation-config-utils';
import FocusBubble from '../annotation/focus-bubble';
import {
  addNewAnn
} from '../annotation/ops';
import { AnnUpdateType } from '../annotation/types';
import { getAnnotationByRefId } from '../annotation/utils';
import CaretOutlined from '../icons/caret-outlined';
import Loader from '../loader';
import Upgrade from '../upgrade';
import AEP from './advanced-element-picker';
import AnnotationCreatorPanel from './annotation-creator-panel';
import ImageMaskUploadModal from './components/image-mask-modal';
import TabBar from './components/tab-bar';
import TabItem from './components/tab-bar/tab-item';
import UploadButton from './components/upload-button';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import FormatPasteOptions from './format-paste';
import { annotationTabHelpText, editTabHelpText } from './helptexts';
import ListActionBtn from './list-action-btn';
import PreviewWithEditsAndAnRO from './preview-with-edits-and-annotations-readonly';
import ScreenImageBrusher from './screen-image-brushing';
import * as Tags from './styled';
import { StoredStyleForFormatPaste, StyleKeysToBeStored, StyleObjForFormatPaste } from './types';
import { addImgMask, hideChildren, restrictCrtlType, unhideChildren } from './utils/creator-actions';
import { uploadImgFileObjectToAws } from '../../upload-media-to-aws';
import { WarningIcon } from '../header/styled';

const BLUR_VALUE = 8;

const INPUT_TYPE_WITHOUT_PLACEHOLDER = [
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
];

const userGuides = [EditingInteractiveDemoGuidePart2];

const { confirm } = Modal;

// Input is used to store edit for placeholder and InputValue is used to store edits for input value
const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Input = 'inp',
  Mixed = 'm',
  None = 'n',
  InputValue = 'inpval'
}

const PASTE_STYLE_STORAGE_KEY = 'fable/psh';

function getStoredStyleForFormatPasting(): StoredStyleForFormatPaste | null {
  try {
    const str = sessionStorage.getItem(PASTE_STYLE_STORAGE_KEY);
    if (!str) return null;
    return JSON.parse(str);
  } catch (e) {
    raiseDeferredError(e as Error);
  }
  return null;
}

type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement | HTMLInputElement >>;

export interface ITimelineConfig {
  currentScreenAnnotations: IAnnotationConfigWithScreenId[];
  nextScreen: P_RespScreen | undefined;
  prevScreen: P_RespScreen | undefined;
  nextAnnotation: string | null;
  prevAnnotation: string | null;
}

enum TabList {
  Annotations,
  Edits
}

interface IOwnProps {
  journey: JourneyData | null;
  screen: P_RespScreen;
  navigate: NavFn;
  screenData: ScreenData;
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  tour: P_RespTour;
  tourDataOpts: ITourDataOpts;
  timeline: Timeline,
  onAnnotationCreateOrChange: onAnnCreateOrChangeFn;
  onScreenEditStart: () => void;
  toAnnotationId: string;
  onScreenEditFinish: () => void;
  onScreenEditChange: (forScreen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  onGlobalEditChange: (editChunks: AllGlobalElEdits<ElEditType>) => void;
  allAnnotationsForTour: AnnotationPerScreen[];
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void;
  commitTx: (tx: Tx) => void;
  setAlert: (msg?: string) => void;
  isScreenLoaded: boolean;
  onDeleteAnnotation?: (deletedAnnRid: string) => void;
  updateScreen: UpdateScreenFn;
  subs: P_RespSubscription | null;
  newAnnPos: null | DestinationAnnotationPosition;
  resetNewAnnPos: ()=>void;
  onTourDataChange: TourDataChangeFn;
  updateConnection: (fromMain: string, toMain: string)=> void;
  shouldCreateNewFlow: boolean;
  screenMode: ScreenMode;
  setScreenMode: React.Dispatch<React.SetStateAction<ScreenMode>>;
  elpathKey: ElPathKey;
  updateElPathKey: (elPath: ElPathKey)=> void;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  featurePlan: FeatureForPlan | null;
  // hideAnnForCapture: boolean;
  globalOpts: IGlobalConfig;
  allGlobalEdits: EditItem[]
}

const enum ElSelReqType {
  NA = 0,
  EditEl,
  AnnotateEl,
  ElPicker
}

interface IOwnStateProps {
  viewScale: number;
  selectorComponentKey: number;
  isInElSelectionMode: boolean;
  elSelRequestedBy: ElSelReqType;
  selectedEl: HTMLElement | null;
  aepSyncing: boolean;
  selectedAnnotationId: string;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
  editItemSelected: string;
  stashAnnIfAny: boolean;
  selectedHotspotEl: HTMLElement | null;
  selectedAnnReplaceEl: HTMLElement | null;
  selectionMode: 'hotspot' | 'annotation' | 'replace' | 'reselect';
  activeTab: TabList;
  showImageMaskUploadModal: boolean;
  imageMaskUploadModalError: string;
  imageMaskUploadModalIsUploading: boolean;
  selectedAnnotationCoords: string | null;
  isAssetLoaded: boolean;
  selectedCoords: string | null;
  reselectedEl: HTMLElement | null;
  formatPasteStyle: StoredStyleForFormatPaste | null;
  showFormatPastePopup: boolean;
  editFeaturesAvailable: EditFeaturesAvailable[];
  persVarsTextWarnings: string[];
}

enum EditFeaturesAvailable {
  Blur = 'blur',
  ShowHide = 'show_hide',
  ReplaceImage = 'replace_image',
  UpdateText = 'update_text',
  UploadMask = 'upload_mask'
}

export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private readonly frameConRef: React.MutableRefObject<HTMLDivElement | null>;

  private iframeElManager: DomElPicker | null = null;

  private microEdits: AllEdits<ElEditType>;

  private microGlobalEdits: AllGlobalElEdits<ElEditType>;

  private lastSelectedAnnId = '';

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.frameConRef = React.createRef();
    this.microEdits = {};
    this.microGlobalEdits = {};

    this.state = {
      viewScale: 1,
      selectorComponentKey: 0,
      isInElSelectionMode: true,
      elSelRequestedBy: ElSelReqType.AnnotateEl,
      selectedEl: null,
      stashAnnIfAny: false,
      targetEl: null,
      editTargetType: EditTargetType.None,
      editItemSelected: '',
      aepSyncing: false,
      selectedAnnotationId: '',
      selectedHotspotEl: null,
      selectedAnnReplaceEl: null,
      selectedAnnotationCoords: null,
      selectionMode: 'annotation',
      activeTab: TabList.Annotations,
      showImageMaskUploadModal: false,
      imageMaskUploadModalError: '',
      imageMaskUploadModalIsUploading: false,
      isAssetLoaded: false,
      selectedCoords: null,
      reselectedEl: null,
      formatPasteStyle: getStoredStyleForFormatPasting(),
      showFormatPastePopup: false,
      editFeaturesAvailable: [],
      persVarsTextWarnings: []
    };
  }

  showDeleteConfirm = (e: EditItem): void => {
    const path = e[IdxEditItem.PATH];
    const fid = e[IdxEditItem.FID];
    const elType = e[IdxEditItem.TYPE];
    const encoding = e[IdxEditItem.ENCODING];
    const el = this.state.selectedEl;

    if (el) {
      el.dataset.deleted = 'true';
    }

    confirm({
      title: 'Are you sure you want to delete this edit?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes',
      okType: 'danger',
      onOk: () => {
        switch (elType) {
          case ElEditType.Text: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Text];
            this.addToMicroEdit(path, fid, ElEditType.Text, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEditEncodingText.OLD_VALUE],
              null,
              fid,
            ]);
            this.flushMicroEdits();
            el!.textContent = tEncoding[IdxEditEncodingText.OLD_VALUE];
            break;
          }

          case ElEditType.Input: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Input];
            this.addToMicroEdit(path, fid, ElEditType.Input, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeInput.OLD_VALUE],
              null,
              fid,
            ]);
            this.flushMicroEdits();
            (el as HTMLInputElement).placeholder = tEncoding[IdxEncodingTypeInput.OLD_VALUE];
            break;
          }

          case ElEditType.InputValue: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.InputValue];
            this.addToMicroEdit(path, fid, ElEditType.InputValue, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeInput.OLD_VALUE],
              null,
              fid,
            ]);
            this.flushMicroEdits();
            (el as HTMLInputElement).value = tEncoding[IdxEncodingTypeInput.OLD_VALUE];
            break;
          }

          case ElEditType.Image: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Image];
            this.addToMicroEdit(path, fid, ElEditType.Image, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeImage.OLD_VALUE],
              null,
              encoding[IdxEncodingTypeImage.HEIGHT]!,
              encoding[IdxEncodingTypeImage.WIDTH]!,
              fid,
            ]);
            this.flushMicroEdits();
            (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.OLD_VALUE];
            (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.OLD_VALUE];
            break;
          }

          case ElEditType.Blur: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Blur];
            this.addToMicroEdit(path, fid, ElEditType.Blur, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeBlur.OLD_BLUR_VALUE],
              null,
              tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!,
              null,
              fid,
            ]);
            this.flushMicroEdits();
            el!.style.filter = tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!;
            break;
          }

          case ElEditType.Display: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Display];
            this.addToMicroEdit(path, fid, ElEditType.Display, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeDisplay.OLD_VALUE],
              null,
              fid,
            ]);
            this.flushMicroEdits();
            el!.style.display = tEncoding[IdxEncodingTypeDisplay.OLD_VALUE]!;
            break;
          }

          case ElEditType.Mask: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Mask];
            this.addToMicroEdit(path, fid, ElEditType.Mask, [
              getCurrentUtcUnixTime(),
              null,
              tEncoding[IdxEncodingTypeMask.OLD_STYLE]!,
              fid,
            ]);
            this.flushMicroEdits();

            el?.setAttribute('style', tEncoding[IdxEncodingTypeMask.OLD_STYLE]);
            unhideChildren(el!);
            break;
          }

          default:
            break;
        }
      },
    });
  };

  static setDimensionAttributes = (selectedImageEl: HTMLElement): [dimH: string, dimW: string] => {
    const styles = getComputedStyle(selectedImageEl);
    const originalHeight = styles.height;
    const originalWidth = styles.width;

    const originalStyleAttrs = selectedImageEl.getAttribute('style');
    selectedImageEl.setAttribute(
      'style',
      `${originalStyleAttrs || ''}; 
        height: ${originalHeight} !important; 
        width: ${originalWidth} !important; 
        object-fit: cover !important;`
    );
    return [originalHeight, originalWidth];
  };

  static changeSelectedImage = (selectedImageEl: HTMLElement, uploadedImageSrc: string): [string, string] => {
    if (selectedImageEl.nodeName.toUpperCase() === 'SVG') {
      const newImgEl = document.createElement('img');
      newImgEl.src = uploadedImageSrc;
      newImgEl.srcset = uploadedImageSrc;
      const dimensions = ScreenEditor.setDimensionAttributes(selectedImageEl);
      selectedImageEl.replaceWith(newImgEl);
      return dimensions;
    }
    if (selectedImageEl.nodeName.toUpperCase() === 'IMG') {
      const el = selectedImageEl as HTMLImageElement;
      el.src = uploadedImageSrc;
      el.srcset = uploadedImageSrc;
      return ScreenEditor.setDimensionAttributes(selectedImageEl);
    }
    return ['', ''];
    // TODO https://github.com/sharefable/app/issues/48 #2
  };

  // TODO Use this utility to extract imgSrc from different kinds of
  // elements such as div (where imgSrc is assigned to background-image prop
  // of css) or img (where imgSrc is found in src attr of the tag)
  static getOriginalImgSrc = (imgEl: HTMLElement): string => {
    if (imgEl.nodeName.toUpperCase() === 'IMG') {
      const el = imgEl as HTMLImageElement;
      return el.src;
    }
    return '';
  };

  static getBlurValueFromFilter(filterStr: string): number {
    const match = filterStr.match(/(^|\s+)blur\((\d+)(px|rem)\)(\s+|$)/);
    if (!match) {
      return 0;
    }
    return +match[2];
  }

  static updateBlurValueToFilter(filterStr: string, value: number): string {
    const match = filterStr.match(/(^|\s+)blur\((\d+)(px|rem)\)(\s+|$)/);
    let newFilter;
    if (match) {
      newFilter = `${filterStr.substring(0, match.index)} blur(${value}px) ${filterStr.substring(
        match.index! + match[0].length
      )}`;
    } else if (filterStr === 'none') {
      newFilter = `blur(${value}px)`;
    } else {
      newFilter = filterStr ? `${filterStr} blur(${value}px)` : `blur(${value}px)`;
    }
    return newFilter;
  }

  static getEditTypeComponent(edit: EditItem, shouldShowLoading = false): JSX.Element {
    const encoding = edit[IdxEditItem.ENCODING];
    if (edit[IdxEditItem.TYPE] === ElEditType.Text && shouldShowLoading) {
      amplitudeScreenEdited('text', encoding[IdxEditEncodingText.NEW_VALUE] as string);
    }

    switch (edit[IdxEditItem.TYPE]) {
      case ElEditType.Text:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <FontSizeOutlined />
              <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Edited to</div>
              <div className="typ-sm" style={{ flexShrink: 2, margin: '0 4px' }}>
                {encoding[IdxEditEncodingText.NEW_VALUE]}
              </div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      case ElEditType.Input:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <RetweetOutlined />
              <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Placeholder changed to</div>
              <div className="typ-sm" style={{ flexShrink: 2, margin: '0 4px' }}>
                {encoding[IdxEncodingTypeInput.NEW_VALUE]}
              </div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      case ElEditType.Blur:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FilterOutlined />
                <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Blured text</div>
              </div>
              {shouldShowLoading && <LoadingOutlined title="Saving..." />}
            </div>
          </Tags.EditLICon>
        );
      case ElEditType.Display:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <EyeOutlined />
                <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Hide element</div>
              </div>
              {shouldShowLoading && <LoadingOutlined title="Saving..." />}
            </div>
          </Tags.EditLICon>
        );

      case ElEditType.Image:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <PictureOutlined />
              <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Image edited</div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      case ElEditType.Mask:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <img src={MaskIcon} alt="" width={16} />
              <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Mask added</div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      case ElEditType.InputValue:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <RetweetOutlined />
              <div className="typ-sm" style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Input value changed to</div>
              <div className="typ-sm" style={{ flexShrink: 2, margin: '0 4px' }}>
                {encoding[IdxEncodingTypeInput.NEW_VALUE]}
              </div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      default:
        return <></>;
    }
  }

  static getEditTargetType(el: HTMLElement): {
    targetType: EditTargetType;
    target?: HTMLElement;
  } {
    const nestedEditTargetTypes = (function rec(el2: HTMLElement): EditTargets {
      if (el2.nodeType === Node.TEXT_NODE) {
        return {
          [EditTargetType.Text]: [el2],
          [EditTargetType.Img]: [],
          [EditTargetType.Input]: [],
          [EditTargetType.InputValue]: []
        };
      }

      if (el2.nodeName) {
        if (el2.nodeName.toLowerCase() === 'img' || el2.nodeName.toLowerCase() === 'svg') {
          return {
            [EditTargetType.Text]: [],
            [EditTargetType.Img]: [el2],
            [EditTargetType.Input]: [],
            [EditTargetType.InputValue]: []
          };
        }

        if (el2.nodeName.toLowerCase() === 'div' || el2.nodeName.toLowerCase() === 'span') {
          const bgImage = getComputedStyle(el2).backgroundImage;
          if (bgImage.search(/^url\(/) !== -1) {
            return {
              [EditTargetType.Text]: [],
              [EditTargetType.Img]: [el2],
              [EditTargetType.Input]: [],
              [EditTargetType.InputValue]: []
            };
          }
        }

        if (el2.nodeName.toLowerCase() === 'input' || el2.nodeName.toLowerCase() === 'textarea') {
          if (el2.getAttribute('value')) {
            return {
              [EditTargetType.Text]: [],
              [EditTargetType.Img]: [],
              [EditTargetType.Input]: [],
              [EditTargetType.InputValue]: [el2]
            };
          }
          // If element is of type input and does not have value we edit placeholder
          return {
            [EditTargetType.Text]: [],
            [EditTargetType.Img]: [],
            [EditTargetType.Input]: [el2],
            [EditTargetType.InputValue]: []
          };
        }
      }

      const children = Array.from(el2.childNodes);
      const targetByTypes: EditTargets = {
        [EditTargetType.Text]: [],
        [EditTargetType.Img]: [],
        [EditTargetType.Input]: [],
        [EditTargetType.InputValue]: []
      };

      for (const child of children) {
        const targetType = rec(child as HTMLElement);
        for (const [tType, tTargets] of Object.entries(targetType)) {
          targetByTypes[tType].push(...tTargets);
        }
      }
      return targetByTypes;
    }(el));

    const noOfTexts = nestedEditTargetTypes[EditTargetType.Text].length;
    const noOfImgs = nestedEditTargetTypes[EditTargetType.Img].length;
    const noOfInputs = nestedEditTargetTypes[EditTargetType.Input].length;
    const noOfInputsValue = nestedEditTargetTypes[EditTargetType.InputValue].length;

    if (noOfImgs === 1 && noOfTexts === 0 && noOfInputs === 0 && noOfInputsValue === 0) {
      return {
        targetType: EditTargetType.Img,
        target: nestedEditTargetTypes[EditTargetType.Img][0] as HTMLElement,
      };
    }

    if (noOfTexts === 1 && noOfImgs === 0 && noOfInputs === 0 && noOfInputsValue === 0) {
      return {
        targetType: EditTargetType.Text,
        target: nestedEditTargetTypes[EditTargetType.Text][0] as HTMLElement,
      };
    }

    if (noOfInputs === 1 && noOfTexts === 0 && noOfImgs === 0 && noOfInputsValue === 0) {
      return {
        targetType: EditTargetType.Input,
        target: nestedEditTargetTypes[EditTargetType.Input][0] as HTMLElement,
      };
    }

    if (noOfInputs === 0 && noOfTexts === 0 && noOfImgs === 0 && noOfInputsValue === 1) {
      return {
        targetType: EditTargetType.InputValue,
        target: nestedEditTargetTypes[EditTargetType.InputValue][0] as HTMLElement,
      };
    }

    return {
      targetType: EditTargetType.Mixed,
    };
  }

  getFidOfNodeWrapper = (node: Node, elPath: string): string => {
    if (this.props.screenData.version !== SCREEN_DIFFS_SUPPORTED_VERSION) {
      return `elpath/${elPath}`;
    }
    return getFidOfNode(node);
  };

  handleSelectedImageChange = (imgEl: HTMLElement) => async (e: any): Promise<void> => {
    const originalImgSrc = ScreenEditor.getOriginalImgSrc(imgEl);
    const selectedImage = e.target.files[0];
    if (!selectedImage) {
      return;
    }
    const newImageUrl = await uploadImgFileObjectToAws(selectedImage);
    const [dimH, dimW] = ScreenEditor.changeSelectedImage(imgEl, newImageUrl?.cdnUrl || '');

    const path = this.iframeElManager!.elPath(imgEl);
    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    let origVal = imgEl.getAttribute(attrName);
    if (origVal === null) {
      origVal = originalImgSrc || '';
      imgEl.setAttribute(attrName, origVal);
    }
    const fid = this.getFidOfNodeWrapper(imgEl, path);
    this.addToMicroEdit(path, fid, ElEditType.Image, [getCurrentUtcUnixTime(), origVal, newImageUrl?.cdnUrl || '', dimH, dimW, fid], true, false);
    amplitudeScreenEdited('replace_image', '');
    this.flushMicroEdits();
  };

  uploadImgMask = async (maskImgFile: File): Promise<void> => {
    const el = this.state.selectedEl!;

    this.setState({ imageMaskUploadModalIsUploading: true, imageMaskUploadModalError: '' });

    try {
      const newImageUrl = await uploadImgFileObjectToAws(maskImgFile);
      // TODO resize is not supported anymore
      const resizedImgUrl = '';
      hideChildren(el);

      const oldElInlineStyles = el.getAttribute('style') || '';
      const newElInlineStyles = addImgMask(el, resizedImgUrl, newImageUrl?.cdnUrl || '');

      const path = this.iframeElManager!.elPath(el);

      const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Mask}`;
      let origVal = el.getAttribute(attrName);
      if (origVal === null) {
        origVal = oldElInlineStyles;
        el.setAttribute(attrName, origVal);
      }

      const fid = this.getFidOfNodeWrapper(el, path);
      this.addToMicroEdit(path, fid, ElEditType.Mask, [getCurrentUtcUnixTime(), newElInlineStyles, oldElInlineStyles, fid], true, false);
      this.flushMicroEdits();
      amplitudeScreenEdited('mask_el', '');
    } catch (err) {
      this.setState({ imageMaskUploadModalError: 'Something went wrong' });
    } finally {
      this.setState({ imageMaskUploadModalIsUploading: false, showImageMaskUploadModal: false });
    }
  };

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener('keydown', this.onKeyDownHandler);
    window.removeEventListener('message', this.receiveMessage, false);
    if (this.frameConRef.current) {
      this.frameConRef.current.removeEventListener('click', this.goToSelectionMode);
    }
  }

  receiveMessage = (e: MessageEvent<{ type: UserGuideMsg.OPEN_ANNOTATION }>): void => {
    if (isEventValid(e) && e.data.type === UserGuideMsg.OPEN_ANNOTATION) {
      this.setState({ selectorComponentKey: Math.random() });
    }
  };

  componentDidMount(): void {
    window.addEventListener('message', this.receiveMessage, false);

    if (this.frameConRef.current) {
      this.frameConRef.current.addEventListener('click', this.goToSelectionMode);
    }
    document.addEventListener('keydown', this.onKeyDownHandler);
    this.setState(() => {
      let selectedAnnotationId = this.props.toAnnotationId;
      if (this.props.newAnnPos !== null) {
        selectedAnnotationId = '';
        this.lastSelectedAnnId = this.props.toAnnotationId;
      }
      return { selectedAnnotationId };
    });

    if (this.props.featurePlan) {
      this.handleEditsFeatureAvailable();
    }
  }

  addAllEditsFeature(): void {
    const arr = [];
    for (const entry of Object.values(EditFeaturesAvailable)) {
      arr.push(entry);
    }
    this.setState({ editFeaturesAvailable: arr });
  }

  handleEditsFeatureAvailable(): void {
    const editsFeature = this.props.featurePlan!.edit_and_personalize_demo;
    if (editsFeature) {
      if (editsFeature.value.includes('*')) {
        this.addAllEditsFeature();
      } else {
        const editFeaturesAvailable = editsFeature.value as EditFeaturesAvailable[];
        this.setState({ editFeaturesAvailable });
      }
    } else {
      this.addAllEditsFeature();
    }
  }

  findPositionToAddAnnotation(): [IAnnotationConfig, DestinationAnnotationPosition, boolean] {
    const lastAnnId = this.lastSelectedAnnId;
    let validAnn = null;

    if (lastAnnId) {
      validAnn = getAnnotationByRefId(lastAnnId, this.props.allAnnotationsForTour);
    }

    if (validAnn) {
      for (const pos of Object.values(DestinationAnnotationPosition)) {
        if (this.props.newAnnPos === pos && doesBtnOpenALink(validAnn, pos)) {
          return [validAnn, pos, false];
        }
      }

      return [validAnn, DestinationAnnotationPosition.next, true];
    }

    const ann = this.props.allAnnotationsForScreen.slice(0).reverse().at(-1)!;
    if (doesBtnOpenALink(ann, 'next')) {
      return [ann, DestinationAnnotationPosition.prev, false];
    }

    return [ann, DestinationAnnotationPosition.next, true];
  }

  async componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>): Promise<void> {
    if (prevProps.toAnnotationId !== this.props.toAnnotationId || prevProps.newAnnPos !== this.props.newAnnPos) {
      // Clear any previous left over mask
      this.iframeElManager?.clearMask();
      this.setState(() => {
        let selectedAnnotationId = this.props.toAnnotationId;
        if (this.props.newAnnPos !== null) {
          selectedAnnotationId = '';
          this.lastSelectedAnnId = this.props.toAnnotationId;
        }
        return { selectedAnnotationId, activeTab: TabList.Annotations };
      });

      if (this.props.newAnnPos !== null) {
        this.setState({ selectedEl: null });
        this.goToSelectionMode()();
      }
    }

    if (prevState.isInElSelectionMode !== this.state.isInElSelectionMode) {
      if (this.state.isInElSelectionMode) {
        this.props.onScreenEditStart();
        this.iframeElManager?.enable();
      } else {
        this.iframeElManager?.disable();
        this.props.onScreenEditFinish();
      }
    }

    if (this.state.reselectedEl !== prevState.reselectedEl && this.state.reselectedEl) {
      window.removeEventListener('click', this.callback);
      this.handleReselectAnn(this.state.selectedEl!, this.state.reselectedEl, 'reselect');
      this.iframeElManager!.clearMask(HighlightMode.Pinned);
      this.setState({ reselectedEl: null });
    }

    if (this.state.activeTab === TabList.Annotations) {
      if (!this.state.selectedAnnotationId
        && prevState.selectedEl !== this.state.selectedEl
        && this.state.selectedEl
        && !this.isFullPageAnnotation(this.state.selectedEl)
      ) {
        // If an element from screen is selected an no selectedAnnotationId is in state i.e. element is selected by
        // clicking on screen; probable intent is to create a new annotaiton or edit element
        const annId = this.getAnnotatonIdForEl(this.state.selectedEl!, this.props.elpathKey);
        if (annId) {
          // Check if an existing annotation is attached to the element, if yes then don't create new annotation,
          // instead navigate to already created annotation. As we don't support adding multiple annotation to same
          // element
          this.navigateToAnnotation(`${this.props.screen.id}/${annId}`);
          this.setState({ selectedAnnotationId: annId });
        }
      }

      if (prevState.selectedAnnotationId !== this.state.selectedAnnotationId
        || this.props.elpathKey !== prevProps.elpathKey) {
        if (this.state.selectedAnnotationId) {
          this.selectElementIfAnnoted();
          this.setState({ elSelRequestedBy: ElSelReqType.AnnotateEl });
          if (this.props.newAnnPos) this.props.resetNewAnnPos();
        }
        this.lastSelectedAnnId = this.state.selectedAnnotationId || prevState.selectedAnnotationId;
      }
    }

    if (this.state.activeTab === TabList.Edits
      && this.state.selectedEl !== prevState.selectedEl
      && this.state.selectedEl) {
      this.highlightEditElIfSelected(this.state.selectedEl);
    }

    if (prevProps.allAnnotationsForTour !== this.props.allAnnotationsForTour) {
      const prevConfig = getAnnotationByRefId(this.state.selectedAnnotationId, prevProps.allAnnotationsForTour);
      const currConfig = getAnnotationByRefId(this.state.selectedAnnotationId, this.props.allAnnotationsForTour);

      if (currConfig && prevConfig?.annotationSelectionColor._val !== currConfig.annotationSelectionColor._val) {
        this.iframeElManager?.updateConfig('selectionColor', currConfig.annotationSelectionColor._val);
      }
    }

    if (prevState.activeTab !== this.state.activeTab) {
      traceEvent(
        AMPLITUDE_EVENTS.SCREEN_TAB_SELECTED,
        { screen_tab: this.state.activeTab === 0 ? 'annotation' : 'edit' },
        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
      );
    }

    if (prevProps.screenMode !== this.props.screenMode) {
      if (this.props.screenMode === ScreenMode.DESKTOP) {
        this.setState({ viewScale: 1 });
        this.props.updateElPathKey('id');
      } else {
        this.props.updateElPathKey('m_id');
        setTimeout(() => {
          const vpdW = RESP_MOBILE_SRN_WIDTH;
          const vpdH = RESP_MOBILE_SRN_HEIGHT;

          const frameConRect = this.frameConRef.current?.getBoundingClientRect();

          const scaleX = frameConRect ? frameConRect.width / vpdW : 1;
          const scaleY = frameConRect ? frameConRect.height / vpdH : 1;
          const scale = Math.min(scaleX, scaleY);

          this.setState({ viewScale: scale });
        }, 50);
      }
    }

    if (
      isTourResponsive(this.props.tour)
      && prevProps.tour.responsive2 !== this.props.tour.responsive2
    ) {
      this.setState({ viewScale: 1 });
      this.props.setScreenMode(ScreenMode.DESKTOP);
    }

    if (this.props.featurePlan && prevProps.featurePlan !== this.props.featurePlan) {
      this.handleEditsFeatureAvailable();
    }

    // if (this.props.hideAnnForCapture && this.props.hideAnnForCapture !== prevProps.hideAnnForCapture) {
    //   if (this.state.activeTab === TabList.Annotations && this.state.selectedAnnotationId) {
    //     const config = getAnnotationWithScreenAndIdx(this.props.toAnnotationId, this.props.timeline);
    //     if (config) {
    //       const newConf = updateAnnotationHideAnnotation(config, true);
    //       this.props.onAnnotationCreateOrChange(this.props.screen.id, newConf, 'upsert', this.props.tourDataOpts);
    //       setTimeout(() => {
    //         const conf = updateAnnotationHideAnnotation(config, false);
    //         this.props.onAnnotationCreateOrChange(this.props.screen.id, conf, 'upsert', this.props.tourDataOpts);
    //       }, 2000);
    //     }
    //   }
    // }
  }

  callback = (e: MouseEvent): void => this.handleClickOutside(e, this.props.screen.id);

  handleClickOutside(e: Event, screenId: number) : void {
    const elem = document.querySelector(`.fable-iframe-${screenId}`);
    if (elem && !elem.contains(e.target as Node)) {
      this.setState({ stashAnnIfAny: false, selectionMode: 'annotation' });
      this.iframeElManager!.clearMask(HighlightMode.Pinned);
      if (!this.state.selectedEl) {
        this.handleTabOnClick(this.state.activeTab);
      } else if (this.state.activeTab === TabList.Edits || !this.state.selectedAnnotationId) {
        setTimeout(() => {
          this.highlightEditElIfSelected(this.state.selectedEl);
        });
      }
      window.removeEventListener('click', this.callback);
    }
  }

  createNewDefaultAnnotation(id: string): IAnnotationConfig | null {
    let conf = null;
    const opts: ITourDataOpts = this.props.tourDataOpts;
    if (this.props.allAnnotationsForScreen.length && !this.props.shouldCreateNewFlow) {
      const [destAnn, pos, shouldAddAnn] = this.findPositionToAddAnnotation();
      if (shouldAddAnn) {
        conf = addNewAnn(
          this.props.allAnnotationsForTour,
          {
            position: this.props.newAnnPos || pos,
            refId: destAnn.refId,
            screenId: this.props.screen.id,
            grpId: destAnn.grpId
          },
          opts,
          this.props.setAlert,
          this.props.applyAnnButtonLinkMutations,
          this.props.globalOpts,
          id
        );
        this.props.resetNewAnnPos();
      } else {
        this.props.setAlert('Cannot add annotation as link is present');
      }
    } else {
      conf = getSampleConfig(id, nanoid(), this.props.globalOpts);
      this.createAnnotationForTheFirstTime(conf);
    }
    if (conf) this.navigateToAnnotation(`${this.props.screen.id}/${conf.refId}`);
    return conf;
  }

  createNewCoverAnnotation(): void {
    let conf;
    if (this.props.allAnnotationsForScreen.length && !this.props.shouldCreateNewFlow) {
      // check if position is present, if yes create new ann wrt that position
      const currentAnn = getAnnotationByRefId(this.props.toAnnotationId, this.props.allAnnotationsForTour);

      for (const pos of Object.values(DestinationAnnotationPosition)) {
        if (this.props.newAnnPos === pos && doesBtnOpenALink(currentAnn!, pos)) {
          this.props.setAlert('Cannot add annotation as this annotaiton contains a link');
          return;
        }
      }

      conf = addNewAnn(
        this.props.allAnnotationsForTour,
        {
          position: this.props.newAnnPos || DestinationAnnotationPosition.next,
          grpId: currentAnn!.grpId,
          screenId: this.props.screen.id,
          refId: currentAnn!.refId
        },
        this.props.tourDataOpts,
        this.props.setAlert,
        this.props.applyAnnButtonLinkMutations,
        this.props.globalOpts,
      );
      this.props.resetNewAnnPos();
    } else {
      conf = getSampleConfig('$', nanoid(), this.props.globalOpts);
      this.createCoverAnnotationForTheFirstTime(conf);
    }
    this.navigateToAnnotation(`${this.props.screen.id}/${conf.refId}`);
  }

  getAnnnotationFromEl(el: HTMLElement, elPathKey: ElPathKey): IAnnotationConfig | null {
    const path = this.iframeElManager?.elPath(el);
    const existingAnnotaiton = this.props.allAnnotationsForScreen.filter(an => an[elPathKey] === path);
    let conf: IAnnotationConfig | null = null;
    if (existingAnnotaiton.length) {
      conf = existingAnnotaiton[0];
    }
    return conf;
  }

  getAnnotationPathFromRefId(refId: string): string {
    const an = this.props.allAnnotationsForScreen.filter(a => a.refId === refId);
    return an.length >= 1 ? an[0].id : '';
  }

  getAnnotationTypeFromRefId(refId: string): string {
    const an = this.props.allAnnotationsForScreen.filter(a => a.refId === refId);
    return an.length >= 1 ? an[0].type : 'default';
  }

  getAnnotatonIdForEl(el: HTMLElement, elPathKey: ElPathKey): string {
    const ann = this.getAnnnotationFromEl(el, elPathKey);
    return ann ? ann.refId : '';
  }

  getIframeBody(): HTMLElement {
    return this.embedFrameRef.current?.contentDocument?.body!;
  }

  isFullPageAnnotation(el: HTMLElement): boolean {
    return this.getIframeBody() === el;
  }

  selectElementIfAnnoted(): void {
    if (!this.state.selectedAnnotationId) return;
    const type = this.getAnnotationTypeFromRefId(this.state.selectedAnnotationId);

    if (type === 'cover') {
      this.iframeElManager?.selectElement(this.getIframeBody(), HighlightMode.Pinned, true);
      return;
    }

    const annId = this.getAnnotationPathFromRefId(this.state.selectedAnnotationId);

    if (!annId) {
      return;
    }
    const ann = getAnnotationByRefId(this.state.selectedAnnotationId, this.props.allAnnotationsForTour);
    if (!ann) {
      return;
    }

    if (this.props.screen.type === ScreenType.Img && type === 'default') {
      const [x, y, width, height] = annId.split('-');
      this.iframeElManager?.selectBoxInDoc({ x: +x, y: +y, width: +width, height: +height });
      return;
    }

    if (this.props.screen.type === ScreenType.SerDom && type === 'default') {
      const el = this.iframeElManager?.elFromPath(ann[this.props.elpathKey]) as HTMLElement | null;
      if (el) {
        this.iframeElManager?.selectElement(el, HighlightMode.Pinned, true);
      }
    }
  }

  getEditingCtrlForElType(
    type: EditTargetType,
    selectedEl: HTMLElement | null,
    targetEl: HTMLElement | null,
    editsFeaturesAvailable: string[]
  ): JSX.Element {
    if (!selectedEl) {
      return <></>;
    }
    const selectedElPath = this.iframeElManager!.elPath(selectedEl);
    const isTextUpdateAvailable = editsFeaturesAvailable.includes(EditFeaturesAvailable.UpdateText);

    const CommonOptions = (
      <>
        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel className="typ-reg">Show Element</Tags.EditCtrlLabel>
          {
          editsFeaturesAvailable.includes(EditFeaturesAvailable.ShowHide)
            ? (
              <Switch
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeInvisibleOutlined />}
                defaultChecked={!!selectedEl && getComputedStyle(selectedEl).display !== 'none'}
                size="small"
                key={`${selectedElPath}-show`}
                onChange={((t) => (checked) => {
                  const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
                  const path = this.iframeElManager!.elPath(refEl);
                  const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Display}`;

                  const savedOrigVal = t.getAttribute(attrName);
                  let newVal: string;
                  let origVal = savedOrigVal;
                  if (origVal === null) {
                    origVal = getComputedStyle(t).display;
                    t.setAttribute(attrName, origVal);
                  }

                  if (checked) newVal = t.style.display = origVal;
                  else newVal = t.style.display = 'none';

                  const fid = this.getFidOfNodeWrapper(t, path);
                  this.addToMicroEdit(path, fid, ElEditType.Display, [getCurrentUtcUnixTime(), origVal, newVal, fid], true, false);
                  this.flushMicroEdits();
                  amplitudeScreenEdited('show_or_hide_el', checked);
                })(selectedEl!)}
              />
            )
            : (
              <Tags.EditUpgradeBtnCon>
                <Upgrade
                  subs={this.props.subs}
                  scaleDown
                  isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                  clickedFrom="screen_edit"
                />
              </Tags.EditUpgradeBtnCon>
            )
          }
        </Tags.EditCtrlLI>

        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel className="typ-reg">Blur Element</Tags.EditCtrlLabel>
          {
          editsFeaturesAvailable.includes(EditFeaturesAvailable.Blur)
            ? (
              <Switch
                key={`${selectedElPath}-blur`}
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeInvisibleOutlined />}
                defaultChecked={
              !!selectedEl
              && (ScreenEditor.getBlurValueFromFilter(getComputedStyle(selectedEl).filter) === BLUR_VALUE
              || ScreenEditor.getBlurValueFromFilter(getComputedStyle(selectedEl).filter) === 3)
            }
                onChange={((t) => (checked) => {
                  const filterStyle = getComputedStyle(t).filter;
                  const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
                  const path = this.iframeElManager!.elPath(refEl);
                  const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Blur}`;
                  const origStrVal = refEl.getAttribute(attrName);

                  let oldFilterStr: string;
                  let newFilterStr: string;
                  let oldBlurValue: number;
                  let newBlurValue: number;

                  if (origStrVal === null) {
                    refEl.setAttribute(attrName, filterStyle);
                    oldBlurValue = ScreenEditor.getBlurValueFromFilter(filterStyle);
                    oldFilterStr = filterStyle;
                  } else {
                    oldBlurValue = ScreenEditor.getBlurValueFromFilter(origStrVal);
                    oldFilterStr = origStrVal;
                  }

                  if (checked) {
                    newBlurValue = BLUR_VALUE;
                    newFilterStr = ScreenEditor.updateBlurValueToFilter(oldFilterStr, newBlurValue);
                    t.style.filter = newFilterStr;
                  } else {
                    newBlurValue = oldBlurValue;
                    newFilterStr = oldFilterStr;
                    t.style.filter = oldFilterStr;
                  }

                  const fid = this.getFidOfNodeWrapper(t, path);

                  this.addToMicroEdit(path, fid, ElEditType.Blur, [
                    getCurrentUtcUnixTime(),
                    oldBlurValue,
                    newBlurValue,
                    oldFilterStr,
                    newFilterStr,
                    fid,
                  ], true, false);
                  this.flushMicroEdits();
                  amplitudeScreenEdited('blur_el', checked);
                })(selectedEl!)}
                size="small"
              />
            )
            : (
              <Tags.EditUpgradeBtnCon>
                <Upgrade
                  subs={this.props.subs}
                  scaleDown
                  isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                  clickedFrom="screen_edit"
                />
              </Tags.EditUpgradeBtnCon>
            )
          }
        </Tags.EditCtrlLI>

        {restrictCrtlType(selectedEl!, ['img'])
          && (
            <Tags.EditCtrlLI>
              <Tags.EditCtrlLabel className="typ-reg">Mask Element</Tags.EditCtrlLabel>
              {
              editsFeaturesAvailable.includes(EditFeaturesAvailable.UploadMask)
                ? (
                  <button
                    key={`${selectedElPath}-mask`}
                    onClick={() => this.setState({ showImageMaskUploadModal: true })}
                    type="button"
                    className="typ-ip"
                    style={{
                      backgroundColor: '#DDD',
                      border: '1px solid transparent',
                      boxShadow: '0 2px #00000004',
                      padding: '4px 15px',
                      borderRadius: '2px',
                      color: '#000000d9',
                      borderColor: '#DDDDDD',
                      cursor: 'pointer',
                    }}
                  >
                    Upload Mask
                  </button>
                )
                : (
                  <Tags.EditUpgradeBtnCon>
                    <Upgrade
                      subs={this.props.subs}
                      scaleDown
                      isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                      clickedFrom="screen_edit"
                    />
                  </Tags.EditUpgradeBtnCon>
                )
              }
            </Tags.EditCtrlLI>
          )}
      </>
    );

    switch (type) {
      case EditTargetType.Img:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI>
              <Tags.EditCtrlLabel className="typ-reg">Replace image</Tags.EditCtrlLabel>
              {
                editsFeaturesAvailable.includes(EditFeaturesAvailable.ReplaceImage)
                  ? (<UploadButton
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={this.handleSelectedImageChange(selectedEl!)}
                      key={`${selectedElPath}-replace`}
                  />)
                  : (
                    <Tags.EditUpgradeBtnCon>
                      <Upgrade
                        subs={this.props.subs}
                        scaleDown
                        isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                        clickedFrom="screen_edit"
                      />
                    </Tags.EditUpgradeBtnCon>
                  )
                }
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );

      case EditTargetType.Text:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: 'column', alignItems: 'start' }}>
              <Tags.EditCtrlLabel className="typ-reg with-warning">
                Update Text
                {this.state.persVarsTextWarnings.length > 0 && (
                <Tooltip
                  placement="left"
                  title={
                    <ul>
                      {this.state.persVarsTextWarnings.map(warning => <li key={warning}>{warning}</li>)}
                    </ul>
                  }
                >
                  <WarningIcon className="format" />
                </Tooltip>
                )}
              </Tags.EditCtrlLabel>
              <div style={{ position: 'relative', padding: '0.875rem 1rem' }}>
                <Tags.CtrlTxtEditBox
                  className="typ-ip"
                  key={`${selectedElPath}-text`}
                  defaultValue={targetEl?.textContent!}
                  autoFocus={isTextUpdateAvailable}
                  onBlur={() => this.flushMicroEdits()}
                  onChange={((t) => (e) => {
                    if (!isTextUpdateAvailable) return;
                    const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
                    const path = this.iframeElManager!.elPath(refEl);
                    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Text}`;
                    let origVal = refEl.getAttribute(attrName);
                    if (origVal === null) {
                      origVal = t.textContent || '';
                      refEl.setAttribute(attrName, origVal);
                    }
                    const fid = this.getFidOfNodeWrapper(refEl, path);
                    this.addToMicroEdit(path, fid, ElEditType.Text, [getCurrentUtcUnixTime(), origVal, e.target.value, fid], true, false);

                    const perVars = extractHandlebarsFromAnnotations(e.target.value);
                    this.setState({
                      persVarsTextWarnings: (getAnnTextEditorErrors(perVars))
                    });
                    t.textContent = e.target.value;
                  })(targetEl!)}
                  disabled={!isTextUpdateAvailable}
                  style={{ filter: isTextUpdateAvailable ? '' : 'blur(5px)' }}
                />
                {!isTextUpdateAvailable && (
                  <Upgrade
                    subs={this.props.subs}
                    isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                    clickedFrom="screen_edit"
                  />
                )}
              </div>
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );

      case EditTargetType.Input: {
        if (
          targetEl?.nodeName.toLowerCase() === 'input'
          && INPUT_TYPE_WITHOUT_PLACEHOLDER.includes(targetEl.getAttribute('type') || '')
        ) {
          return <Tags.EditCtrlCon>{CommonOptions}</Tags.EditCtrlCon>;
        }

        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: 'column', alignItems: 'start' }}>
              <Tags.EditCtrlLabel className="typ-reg">Update Placeholder Text</Tags.EditCtrlLabel>
              <div style={{ position: 'relative', padding: '0.875rem 1rem' }}>
                <Tags.CtrlTxtEditBox
                  key={`${selectedElPath}-placeholder`}
                  className="typ-ip"
                  defaultValue={(targetEl as HTMLInputElement)?.placeholder}
                  autoFocus={isTextUpdateAvailable}
                  onBlur={() => this.flushMicroEdits()}
                  onChange={((t) => (e) => {
                    if (!isTextUpdateAvailable) return;
                    const path = this.iframeElManager!.elPath(t);
                    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Input}`;
                    let origVal = t.getAttribute(attrName);

                    if (origVal === null) {
                      origVal = (t as HTMLInputElement).placeholder;
                      t.setAttribute(attrName, origVal);
                    }
                    const fid = this.getFidOfNodeWrapper(t, path);
                    this.addToMicroEdit(path, fid, ElEditType.Input, [getCurrentUtcUnixTime(), origVal, e.target.value, fid], true, false);

                    (t as HTMLInputElement).placeholder = e.target.value;
                  })(targetEl!)}
                  disabled={!isTextUpdateAvailable}
                  style={{ filter: isTextUpdateAvailable ? '' : 'blur(5px)' }}
                />
                {!isTextUpdateAvailable && (
                  <Upgrade
                    subs={this.props.subs}
                    isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                    clickedFrom="screen_edit"
                  />
                )}
              </div>
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );
      }

      case EditTargetType.Mixed:
        return <Tags.EditCtrlCon>{CommonOptions}</Tags.EditCtrlCon>;

      case EditTargetType.InputValue: {
        if (
          targetEl?.nodeName.toLowerCase() === 'input'
            && INPUT_TYPE_WITHOUT_PLACEHOLDER.includes(targetEl.getAttribute('type') || '')
        ) {
          return <Tags.EditCtrlCon>{CommonOptions}</Tags.EditCtrlCon>;
        }

        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: 'column', alignItems: 'start' }}>
              <Tags.EditCtrlLabel className="typ-reg">Update Input Text</Tags.EditCtrlLabel>
              <div style={{ position: 'relative', padding: '0.875rem 1rem' }}>
                <Tags.CtrlTxtEditBox
                  key={`${selectedElPath}-placeholder`}
                  className="typ-ip"
                  defaultValue={(targetEl as HTMLInputElement).value}
                  autoFocus={isTextUpdateAvailable}
                  onBlur={() => this.flushMicroEdits()}
                  onChange={((t) => (e) => {
                    if (!isTextUpdateAvailable) return;
                    const path = this.iframeElManager!.elPath(t);
                    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.InputValue}`;
                    let origVal = t.getAttribute(attrName);

                    if (origVal === null) {
                      origVal = (t as HTMLInputElement).value;
                      t.setAttribute(attrName, origVal);
                    }
                    const fid = this.getFidOfNodeWrapper(t, path);
                    this.addToMicroEdit(path, fid, ElEditType.InputValue, [getCurrentUtcUnixTime(), origVal, e.target.value, fid], true, false);

                    (t as HTMLInputElement).value = e.target.value;
                  })(targetEl!)}
                  disabled={!isTextUpdateAvailable}
                  style={{ filter: isTextUpdateAvailable ? '' : 'blur(5px)' }}
                />
                {!isTextUpdateAvailable && (
                <Upgrade
                  subs={this.props.subs}
                  isInBeta={this.props.featurePlan?.edit_and_personalize_demo.isInBeta || false}
                  clickedFrom="screen_edit"
                />
                )}
              </div>
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );
      }

      default:
        return <></>;
    }
  }

  static downArrow = (): JSX.Element => <img src={ExpandIcon} width={12} height={6} alt="expand icon" />;

  flushMicroEdits(): void {
    const hasEdits = Object.keys(this.microEdits).length !== 0;
    if (hasEdits) {
      this.props.onScreenEditChange(this.props.screen, this.microEdits);
      this.microEdits = {};
    }

    const hasGlobalMicroEdits = Object.keys(this.microGlobalEdits).length !== 0;
    if (hasGlobalMicroEdits) {
      this.props.onGlobalEditChange(this.microGlobalEdits);
      this.microGlobalEdits = {};
    }
  }

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }): void => {
    this.initDomPicker(params.nestedFrames);
  };

  // eslint-disable-next-line class-methods-use-this
  onFrameAssetLoad: FrameAssetLoadFn = ({ foundAnnotation }) => {
    this.setState(state => ({
      isInElSelectionMode: true,
      elSelRequestedBy: state.elSelRequestedBy === ElSelReqType.NA
        ? ElSelReqType.EditEl
        : state.elSelRequestedBy,
      isAssetLoaded: true
    }));
  };

  createAnnotationForTheFirstTime = (ann: IAnnotationConfig): void => {
    const opts = this.props.tourDataOpts || getDefaultTourOpts(this.props.globalOpts);
    if (!opts.main) opts.main = `${this.props.screen.id}/${ann.refId}`;
    this.props.onAnnotationCreateOrChange(this.props.screen.id, ann, 'upsert', opts);
  };

  createCoverAnnotationForTheFirstTime = (conf: IAnnotationConfig): void => {
    this.createAnnotationForTheFirstTime(conf);
    this.setState({ selectedAnnotationId: conf.refId });
  };

  handleTabOnClick = (tab: TabList): void => {
    switch (tab) {
      case TabList.Annotations:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.AnnotateEl,
          isInElSelectionMode: true,
          activeTab: tab,
          selectedEl: null
        }));
        break;
      case TabList.Edits:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.EditEl,
          isInElSelectionMode: true,
          activeTab: tab,
          selectedAnnotationId: '',
          editItemSelected: '',
          selectedEl: null
        }));
        break;
      default:
        break;
    }
    this.goToSelectionMode()();
  };

  navigateToAnnotation = (uri: string): void => {
    this.props.navigate(uri, 'annotation-hotspot');
  };

  handleImageMaskUploadModalOnCancel = (): void => {
    this.setState({ showImageMaskUploadModal: false });
  };

  isScreenAndAssetLoaded = (): boolean => this.state.isAssetLoaded && this.props.isScreenLoaded;

  showCreateDefaultAnnButton = (): boolean => {
    if (this.props.screen.type === ScreenType.Img) {
      return Boolean(!this.state.selectedAnnotationId && this.state.selectedCoords);
    }
    return Boolean(!this.state.selectedAnnotationId && this.state.selectedEl);
  };

  createDefaultAnnotation = (type: 'default' | 'multi-ann') : void => {
    if (this.props.screen.type === ScreenType.Img) {
      amplitudeNewAnnotationCreated(propertyCreatedFromWithType.IMG_DRAG_RECT);
      this.setState(state => {
        const conf = type === 'default'
          ? this.createNewDefaultAnnotation(state.selectedCoords!)
          : this.createNewDefaultAnnAndAddToMultiGrp(state.selectedCoords!);
        if (conf) { return { selectedAnnotationId: conf.refId }; }
        return { selectedAnnotationId: state.selectedAnnotationId };
      });
    } else {
      this.setState(state => {
        let conf = this.getAnnnotationFromEl(state.selectedEl!, this.props.elpathKey);
        let selectedAnnotationId = state.selectedAnnotationId;
        if (!conf) {
          amplitudeNewAnnotationCreated(propertyCreatedFromWithType.DOM_EL_PICKER);
          try {
            const path = this.iframeElManager!.elPath(state.selectedEl!);
            conf = type === 'default'
              ? this.createNewDefaultAnnotation(path)
              : this.createNewDefaultAnnAndAddToMultiGrp(path);
          } catch (e) {
            sentryCaptureException(e as Error);
            throw e;
          }
          if (conf) selectedAnnotationId = conf.refId;
        }
        return { selectedAnnotationId };
      });
    }
  };

  createNewDefaultAnnAndAddToMultiGrp = (id: string): IAnnotationConfig => {
    const currAnn = getAnnotationWithScreenAndIdx(this.props.toAnnotationId, this.props.timeline)!;
    const conf = getSampleConfig(id, getRandomId(), this.props.globalOpts);
    const confWithZid = updateAnnotationZId(conf, currAnn.zId);
    this.props.onAnnotationCreateOrChange(currAnn.screen.id, confWithZid, 'upsert', this.props.tourDataOpts);
    this.navigateToAnnotation(`${currAnn.screen.id}/${confWithZid.refId}`);
    return confWithZid;
  };

  highlightEditElIfSelected = (selectedEl: HTMLElement | null) : void => {
    if (selectedEl && !this.isFullPageAnnotation(selectedEl)) {
      this.iframeElManager!.selectElement(selectedEl, HighlightMode.Pinned);
      const editTargetType = ScreenEditor.getEditTargetType(selectedEl);
      this.setState({
        editTargetType: editTargetType.targetType,
        targetEl: editTargetType.target || selectedEl,
      });
      if (selectedEl.getAttribute('fab-edit-attr-added') !== '1') {
        this.setEditElAttribute(selectedEl);
      }
    }
  };

  setEditElAttribute = (selectedEl: HTMLElement) : void => {
    selectedEl.setAttribute('fab-edit-attr-added', '1');
    const selectedElPth = this.iframeElManager?.elPath(selectedEl);
    this.props.allEdits.forEach(edit => {
      if (edit[1] === selectedElPth) {
        const elType = edit[IdxEditItem.TYPE];
        const refEl = (selectedEl.nodeType === Node.TEXT_NODE
          ? selectedEl.parentNode : selectedEl) as HTMLElement;

        switch (elType) {
          case ElEditType.Text: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Text}`;
            refEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEditEncodingText.OLD_VALUE] as string);
            break;
          }
          case ElEditType.Blur: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Blur}`;
            refEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeBlur.OLD_FILTER_VALUE] as string);
            break;
          }
          case ElEditType.Display: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Display}`;
            selectedEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeDisplay.OLD_VALUE] as string);
            break;
          }
          case ElEditType.Input: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Input}`;
            selectedEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeInput.OLD_VALUE] as string);
            break;
          }
          case ElEditType.Image: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
            selectedEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeImage.OLD_VALUE] as string);
            break;
          }
          case ElEditType.Mask: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Mask}`;
            selectedEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeMask.OLD_STYLE] as string);
            break;
          }
          case ElEditType.InputValue: {
            const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.InputValue}`;
            selectedEl.setAttribute(attrName, edit[IdxEditItem.ENCODING][IdxEncodingTypeInput.OLD_VALUE] as string);
            break;
          }
          default:
            break;
        }
      }
    });
  };

  editExistOnEl(el: HTMLElement): boolean {
    const path = this.iframeElManager?.elPath(el);
    const existingEdit = this.props.allEdits.filter(edit => edit[IdxEditItem.PATH] === path);
    return existingEdit.length !== 0;
  }

  handleReselectAnn(oldSelEl: HTMLElement, newSelEl: HTMLElement, from: 'reselect' | 'aep'): void {
    if (this.state.activeTab === TabList.Annotations) {
      const annOnOldEl = this.getAnnnotationFromEl(oldSelEl, this.props.elpathKey);
      const annOnNewEl = this.getAnnnotationFromEl(newSelEl, this.props.elpathKey);
      // If there is annotation on top of new element then don't do anything
      if (!annOnNewEl) {
        if (from === 'aep') {
          traceEvent(AMPLITUDE_EVENTS.ADVANCED_EL_PICKER_USED, {}, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
        }
        if (annOnOldEl) {
          const newElPath = this.iframeElManager!.elPath(newSelEl)!;
          const replaceWithAnn = shallowCloneAnnotation(newElPath, annOnOldEl, this.props.elpathKey);
          const tx = new Tx();
          tx.start();
          const updates: Array<
          [
            screenId: number,
            config: IAnnotationConfig,
            actionType: 'upsert' | 'delete'
          ]
        > = [
          [this.props.screen.id, annOnOldEl, 'delete'],
          [this.props.screen.id, replaceWithAnn, 'upsert']
        ];
          this.setState({ aepSyncing: true });
          updates.forEach(update => this.props.onAnnotationCreateOrChange(...update, null, tx));
          this.props.commitTx(tx);
          setTimeout(() => {
          // TODO From the time something is selected via aep to the time view update happens,
          // it takes few moment.
          // This is just a temporary guard for user to wait while the view gets updated.
          // The proper fix would
          // be create a unidirectional flow via reducer (not local state)
            this.setState({ aepSyncing: false });
          }, 1500);
        }
      } else if (annOnNewEl) {
        this.navigateToAnnotation(`${this.props.screen.id}/${annOnNewEl.refId}`);
      }

      if (!this.state.selectedAnnotationId && from === 'reselect') {
        setTimeout(() => this.highlightEditElIfSelected(newSelEl), 0);
      }
    } else {
      const editOnOldEl = this.editExistOnEl(oldSelEl);
      const editOnNewEl = this.editExistOnEl(newSelEl);
      if (editOnNewEl || editOnOldEl) {
        return;
      }
    }

    this.setState({
      stashAnnIfAny: false,
      selectedEl: newSelEl,
    });
  }

  aepElSelect(newSelEl: HTMLElement, oldSelEl: HTMLElement, selectedOnClick: boolean): void {
    // don't call when in edits tab or while using AEP during creating new ann
    if (!selectedOnClick || this.state.selectedAnnotationId) {
      this.iframeElManager!.clearMask(HighlightMode.Pinned);
    }
    if (newSelEl === oldSelEl) {
      if (!this.state.selectedAnnotationId || this.state.activeTab === TabList.Edits) {
        this.highlightEditElIfSelected(newSelEl);
      }
      this.setState({ stashAnnIfAny: false });
      return;
    }

    this.handleReselectAnn(oldSelEl, newSelEl, 'aep');

    this.setState({
      elSelRequestedBy: ElSelReqType.ElPicker
    });
  }

  storeFormatPasteStyle(config: IAnnotationConfig): StoredStyleForFormatPaste {
    const style: StyleObjForFormatPaste = {};
    for (const prop of StyleKeysToBeStored) {
      const value = config[prop];
      if (typeof value !== 'boolean' && !value) continue;
      style[prop] = value;
    }

    const data: StoredStyleForFormatPaste = {
      tourId: this.props.tour.id,
      tourRid: this.props.tour.rid,
      screnId: this.props.screen.id,
      annotationId: config.refId,
      style,
    };

    sessionStorage.setItem(PASTE_STYLE_STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  isFormatPasteSourceEmptyOrSource(config: IAnnotationConfig) {
    return this.state.formatPasteStyle === null || this.state.formatPasteStyle.annotationId === config.refId;
  }

  resetSelectedAnnotation(): void {
    this.setState({ selectedAnnotationId: '', selectedEl: null });
  }

  resetSelectedEdits(): void {
    this.setState({ editItemSelected: '', targetEl: null, editTargetType: EditTargetType.None });
  }

  handleScreenModeChange(newScreenMode: ScreenMode): void {
    this.props.setScreenMode(newScreenMode);
  }

  startSelectingMobileEl = (): void => {
    if (!this.state.stashAnnIfAny) {
      this.setState({ stashAnnIfAny: true, selectionMode: 'reselect' });
      this.iframeElManager!.setSelectionMode();
      setTimeout(() => {
        window.addEventListener('click', this.callback);
      }, 10);
    }
  };

  render(): React.ReactNode {
    let startAnnotaitonId = '';
    if (this.props.tourDataOpts && this.props.tourDataOpts.main) {
      startAnnotaitonId = this.props.tourDataOpts.main.split('/')[1] || startAnnotaitonId;
    }

    const configOfParamsAnnId = getAnnotationWithScreenAndIdx(this.props.toAnnotationId, this.props.timeline);
    const showAnnCreatorPanel = this.props.toAnnotationId === this.state.selectedAnnotationId && configOfParamsAnnId;
    // configOfSelectedAnn is required for timeline.
    // if we deprecate timeline we don't need to keep two states
    const configOfSelectedAnn = getAnnotationWithScreenAndIdx(this.state.selectedAnnotationId, this.props.timeline);

    let helpText = '';
    if (this.state.selectedAnnotationId) {
      helpText = 'Click on the screen on left to select an element';
    } else if ((this.props.screen.type === ScreenType.SerDom && this.state.selectedEl)
      || (this.props.screen.type === ScreenType.Img && this.state.selectedCoords)) {
      helpText = 'Click again to reselect. Or else create';
    } else {
      helpText = this.props.screen.type === ScreenType.Img
        ? 'Drag to select an area on the image or create'
        : 'Select an element from the screen on left or create';
    }

    const items: MenuProps['items'] = isTourResponsive(this.props.tour)
      ? [
        {
          label: (
            <Tags.ScreenModeItems
              onClick={() => {
                this.props.updateTourProp(this.props.tour.rid, 'responsive2', Responsiveness.NoResponsive);
                amplitudeResponsivenessChange(Responsiveness.NoResponsive, 'annotation-editor');
              }}
            >
              <p className="typ-sm"> <ArrowsAltOutlined /> Make this demo non-responsive</p>
            </Tags.ScreenModeItems>
          ),
          key: 'make-responsive',
        },
        {
          label: (
            <Tags.ScreenModeItems
              onClick={() => {
                this.handleScreenModeChange(ScreenMode.DESKTOP);
                amplitudeDeviceModeChange(ScreenMode.DESKTOP);
              }}
            >
              <p className="typ-sm"> <DesktopOutlined /> {ScreenMode.DESKTOP} view</p>
            </Tags.ScreenModeItems>
          ),
          key: ScreenMode.DESKTOP,
        },
        {
          label: (
            <Tags.ScreenModeItems
              onClick={() => {
                this.handleScreenModeChange(ScreenMode.MOBILE);
                amplitudeDeviceModeChange(ScreenMode.MOBILE);
              }}
            >
              <p className="typ-sm"> <MobileOutlined /> {ScreenMode.MOBILE} view</p>
            </Tags.ScreenModeItems>
          ),
          key: ScreenMode.MOBILE,
        }
      ] : [
        {
          label: (
            <Tags.ScreenModeItems onClick={() => {
              this.props.updateTourProp(this.props.tour.rid, 'responsive2', Responsiveness.Responsive);
              this.handleScreenModeChange(ScreenMode.DESKTOP);
              amplitudeResponsivenessChange(Responsiveness.Responsive, 'annotation-editor');
            }}
            >
              <div style={{ lineHeight: '1.1rem', marginBottom: '0.25rem' }}>
                Make this demo responsive
              </div>
              <div style={{ fontSize: '10px', lineHeight: '12px', opacity: '0.65' }}>
                This demo is currently not mobile responsive, click this button to check if your application is mobile responsive.
              </div>
            </Tags.ScreenModeItems>
          ),
          key: 'not-responsive',
        }
      ];

    const shouldHideAEP = (configOfParamsAnnId?.type === 'cover' && this.state.activeTab === TabList.Annotations)
    || this.props.screen.type === ScreenType.Img || !this.state.selectedEl;

    const multiAnnFeatureAvailable = isFeatureAvailable(this.props.featurePlan, 'multi_annontation');
    const multiAnnFeatureSupported = multiAnnFeatureAvailable.isAvailable && !multiAnnFeatureAvailable.isInBeta;
    return (
      <>
        <GTags.PreviewAndActionCon style={{ borderRadius: '20px' }}>
          <div
            id="AEP-wrapper"
            style={{
              position: 'absolute',
              width: `calc(100% - ${ANN_EDIT_PANEL_WIDTH}px)`,
              height: `${AEP_HEIGHT}px`,
              bottom: '0',
              left: '0',
              borderRadius: '2px',
              zIndex: '100',
              display: 'flex',
            }}
          >
            {!shouldHideAEP && <AEP
              selectedEl={this.state.selectedEl!}
              domElPicker={this.iframeElManager!}
              disabled={this.state.aepSyncing || this.state.selectionMode === 'reselect'}
              onOverElPicker={() => {
                this.setState({ stashAnnIfAny: true });
              }}
              onElSelect={(newSelEl: HTMLElement, oldSelEl: HTMLElement, selectedOnClick?: boolean) => {
                this.aepElSelect(newSelEl, oldSelEl, selectedOnClick || false);
              }}
            />}
            <Tags.ResponsiveIpCon>
              <Tooltip
                title="Reselect element from screen"
                overlayStyle={{ fontSize: '0.75rem' }}
              >
                <Tags.DeviceCon
                  style={{
                    visibility: shouldHideAEP ? 'hidden' : 'visible'
                  }}
                  onClick={() => {
                    this.startSelectingMobileEl();
                    amplitudeReselectElement();
                  }}
                >
                  <AimOutlined />
                </Tags.DeviceCon>
              </Tooltip>
              <Dropdown
                menu={{ items }}
                trigger={['click']}
                placement="topRight"
                overlayClassName="device-dropdown"
                arrow
              >
                <Tags.DeviceCon>
                  <Tooltip
                    title={`Showing ${this.props.screenMode} view, click to switch to 
                        ${this.props.screenMode === ScreenMode.DESKTOP ? ScreenMode.MOBILE : ScreenMode.DESKTOP} view
                    `}
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <MobileOutlined />
                  </Tooltip>
                </Tags.DeviceCon>
              </Dropdown>
            </Tags.ResponsiveIpCon>
          </div>
          <GTags.EmbedCon
            style={{
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '20px',
              height: `calc(100% - ${AEP_HEIGHT}px - 2rem)`
            }}
            ref={this.frameConRef}
          >
            {this.props.isScreenLoaded && (
            <div
              style={{
                width: this.props.screenMode === ScreenMode.DESKTOP ? '100%' : `${RESP_MOBILE_SRN_WIDTH}px`,
                height: this.props.screenMode === ScreenMode.DESKTOP ? '100%' : `${RESP_MOBILE_SRN_HEIGHT}px`,
                left: '50%',
                transform: `translateX(-50%) scale(${this.state.viewScale})`,
                transformOrigin: '50% 0',
                position: 'absolute'
              }}
            >
              <PreviewWithEditsAndAnRO
                isFromScreenEditor
                resizeSignal={this.props.screenMode === ScreenMode.DESKTOP ? 1 : 0}
                journey={this.props.journey}
                key={this.props.screen.rid}
                screen={this.props.screen}
                screenData={this.props.screenData}
                navigate={this.props.navigate}
                innerRef={this.embedFrameRef}
                playMode={false}
                onBeforeFrameBodyDisplay={this.onBeforeFrameBodyDisplay}
                allAnnotationsForScreen={this.props.allAnnotationsForScreen}
                tourDataOpts={this.props.tourDataOpts}
                allEdits={this.props.allEdits}
                toAnnotationId={this.state.selectedAnnotationId}
                stashAnnIfAny={this.state.stashAnnIfAny}
                onFrameAssetLoad={this.onFrameAssetLoad}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                tour={this.props.tour}
                hidden={!this.state.isAssetLoaded}
                onDispose={() => {
                    this.embedFrameRef?.current!.removeEventListener('mouseout', this.onMouseOutOfIframe);
                    this.embedFrameRef?.current!.removeEventListener('mouseenter', this.onMouseEnterOnIframe);
                }}
                updateCurrentFlowMain={(btnType: IAnnotationButtonType, main?:string) => {}}
                updateJourneyProgress={(annRefid: string) => {}}
                flows={[]}
                elpathKey={this.props.elpathKey}
                isResponsive={isTourResponsive(this.props.tour)}
                updateElPathKey={this.props.updateElPathKey}
                shouldSkipLeadForm={false}
                frameSetting={FrameSettings.NOFRAME}
                globalEdits={this.props.allGlobalEdits}
                isStaging={false}
                interactiveMode={INTERACTIVE_MODE.INTERACTIVE_TOUR}
              />
            </div>
            )}
            {!this.isScreenAndAssetLoaded() && <Loader width="80px" txtBefore="Loading screen" />}
          </GTags.EmbedCon>
          {/* this is the annotation creator panel */}
          <div style={{
            overflow: 'hidden',
            borderTopRightRadius: '20px',
            borderBottomRightRadius: '20px',
            width: `${ANN_EDIT_PANEL_WIDTH}px`,
          }}
          >
            <GTags.EditPanelCon
              id="ann-creator-panel"
              style={{
                overflowY: 'auto',
                borderTopRightRadius: '20px',
                borderBottomRightRadius: '20px',
                width: `${ANN_EDIT_PANEL_WIDTH}px`,
              }}
            >
              {/* this is top menu */}
              <TabBar>
                <TabItem
                  title="Annotation"
                  helpText={annotationTabHelpText}
                  active={this.state.activeTab === TabList.Annotations}
                  onClick={() => this.handleTabOnClick(TabList.Annotations)}
                  id="SE-guide-step-1"
                />
                <TabItem
                  title="Edit"
                  helpText={editTabHelpText}
                  active={this.state.activeTab === TabList.Edits}
                  onClick={() => this.handleTabOnClick(TabList.Edits)}
                  id="SE-guide-step-2"
                />
              </TabBar>

              <div style={{ height: '100%' }}>
                <Tags.EditPanelSec style={{ height: '100%', position: 'relative' }}>
                  {/* this is annotations timeline */}
                  {this.state.activeTab === TabList.Annotations && (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    className="t1"
                  >
                    <div style={{ paddingTop: '1rem', position: 'relative' }}>
                      <div>
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                          <FocusBubble diameter={12} style={{ marginLeft: '12px', marginTop: '4px' }} />
                          <Tags.AnimatedInfoText className="typ-sm" key="info">{helpText}</Tags.AnimatedInfoText>
                        </div>
                      </div>
                      <Tags.AnnotationBtnCtn>
                        {this.showCreateDefaultAnnButton() && (
                        <Tags.CreateNewAnnotationBtn
                          className="typ-sm"
                          onClick={() => this.createDefaultAnnotation('default')}
                        >
                          <img src={NewAnnotation} alt="new default annotation" />
                          <p>New Guide Annotation</p>
                        </Tags.CreateNewAnnotationBtn>)}
                        {!this.state.selectedAnnotationId && (
                        <Tags.CreateNewAnnotationBtn
                          className="typ-sm"
                          id="cover-annotation-btn"
                          onClick={() => {
                            amplitudeNewAnnotationCreated(propertyCreatedFromWithType.COVER_ANN_BTN);
                            this.createNewCoverAnnotation();
                          }}
                        >
                          <img
                            src={NewCoverAnnotation}
                            alt="new default annotation"
                          />
                          <p>New Cover Annotation</p>
                        </Tags.CreateNewAnnotationBtn>
                        )}
                        {this.showCreateDefaultAnnButton() && this.props.toAnnotationId && (
                          <Tags.CreateNewAnnotationBtn
                            className="typ-sm"
                            onClick={() => multiAnnFeatureSupported
                               && this.createDefaultAnnotation('multi-ann')}
                          >
                            <div className={multiAnnFeatureSupported ? '' : 'upgrade-plan'}>
                              {!multiAnnFeatureSupported && (
                                <Upgrade
                                  scaleDown
                                  subs={this.props.subs}
                                  isInBeta={multiAnnFeatureAvailable.isInBeta}
                                  clickedFrom="annotation_edit"
                                />
                              )}
                              <img src={NewMultiAnnotation} alt="new multi annotation" />
                            </div>
                            <p>New Multi Annotation</p>
                          </Tags.CreateNewAnnotationBtn>
                        )}
                      </Tags.AnnotationBtnCtn>
                    </div>

                    {
                    this.props.toAnnotationId && configOfParamsAnnId && (
                      <Tags.AnnotationPanelCollapse
                        size="small"
                        key={this.state.selectedAnnotationId || this.props.toAnnotationId}
                        bordered={false}
                        bg={showAnnCreatorPanel ? 'white' : '#616161'}
                        style={{
                          background: 'white',
                          transition: showAnnCreatorPanel ? 'none' : 'background-color 3s ease',
                          padding: 0,
                        }}
                        destroyInactivePanel
                        activeKey={showAnnCreatorPanel ? '1' : ''}
                        defaultActiveKey="1"
                        onChange={selectedItems => {
                          const isAnnSelected = selectedItems.length > 0;
                          if (isAnnSelected) {
                            this.setState({ selectedAnnotationId: this.props.toAnnotationId });
                          } else {
                            this.resetSelectedAnnotation();
                            this.goToSelectionMode()();
                          }
                        }}
                        items={[
                          {
                            key: '1',
                            showArrow: false,
                            label: (
                              <>
                                <Tags.AnotCrtPanelSecLabel
                                  className="fable-label"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '0.5rem',
                                  }}
                                >
                                  <Tags.AnnDisplayText
                                    className="typ-reg"
                                    style={{
                                      color: showAnnCreatorPanel ? '#212121' : 'white',
                                      transition: showAnnCreatorPanel ? 'none' : 'color 0.5s ease',
                                    }}
                                  >
                                    <span className="steps">
                                      {this.props.tourDataOpts.main.split('/')[1] === this.state.selectedAnnotationId && (
                                      <Tooltip title="Tour starts here!" overlayStyle={{ fontSize: '0.75rem' }}>
                                        <HomeOutlined style={{ background: 'none' }} />&nbsp;
                                      </Tooltip>
                                      )}
                                      Step {configOfParamsAnnId.stepNumber}
                                      {!showAnnCreatorPanel && (
                                      <span style={{
                                        fontSize: '10px',
                                        marginLeft: '0.5rem'
                                      }}
                                      >- Click here to open this annotation
                                      </span>
                                      )}
                                    </span>
                                  </Tags.AnnDisplayText>
                                  {configOfParamsAnnId.syncPending && (<LoadingOutlined />)}
                                  {
                                  showAnnCreatorPanel ? (
                                    <>
                                      <Tags.CreatorPanelTopMenuCon onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                      }}
                                      >
                                        {configOfParamsAnnId.type === 'default' && (
                                          <Popover
                                            placement="bottomRight"
                                            open={this.state.showFormatPastePopup}
                                            onOpenChange={open => this.setState({ showFormatPastePopup: open && !this.isFormatPasteSourceEmptyOrSource(configOfParamsAnnId) })}
                                            content={
                                              <FormatPasteOptions
                                                pasteFormatStyle={this.state.formatPasteStyle}
                                                applyStyle={(pasteFormat: StoredStyleForFormatPaste) => {
                                                  const style = pasteFormat.style;
                                                  const conf = {
                                                    ...configOfParamsAnnId
                                                  };
                                                  for (const [key, value] of Object.entries(style)) {
                                                    (conf as any)[key] = value;
                                                  }
                                                  this.props.onAnnotationCreateOrChange(conf.screen.id, conf, 'upsert', this.props.tourDataOpts);
                                                  this.setState({ showFormatPastePopup: false });
                                                }}
                                                copyStyle={() => {
                                                  const formatPasteStyle = this.storeFormatPasteStyle(configOfParamsAnnId);
                                                  this.setState({ formatPasteStyle, showFormatPastePopup: false });
                                                }}
                                              />
                                            }
                                          >
                                            <Tags.OneAndMultiBtn
                                              more={!this.isFormatPasteSourceEmptyOrSource(configOfParamsAnnId)}
                                              onClick={
                                                (e) => {
                                                  if (this.isFormatPasteSourceEmptyOrSource(configOfParamsAnnId)) {
                                                    // no format pasting style selected
                                                    const formatPasteStyle = this.storeFormatPasteStyle(configOfParamsAnnId);
                                                    this.setState({ formatPasteStyle });
                                                  } else {
                                                    // this.setState({ showFormatPastePopup: true });
                                                  }
                                                }
                                            }
                                            >
                                              <Button
                                                type="text"
                                                size="small"
                                                icon={<FormatPainterOutlined />}
                                              >{
                                                this.isFormatPasteSourceEmptyOrSource(configOfParamsAnnId) ? '' : ' '
                                              }
                                              </Button>
                                            </Tags.OneAndMultiBtn>
                                          </Popover>
                                        )}
                                      </Tags.CreatorPanelTopMenuCon>
                                      <CaretOutlined dir="down" color={showAnnCreatorPanel ? '' : 'white'} />
                                    </>
                                  ) : (
                                    <CaretOutlined dir="up" color={showAnnCreatorPanel ? '' : 'white'} />
                                  )
                                }
                                </Tags.AnotCrtPanelSecLabel>
                              </>
                            ),
                            children: (
                              <>
                                <AnnotationCreatorPanel
                                  globalOpts={this.props.globalOpts}
                                  journey={this.props.journey}
                                  setAlertMsg={this.props.setAlert}
                                  opts={this.props.tourDataOpts}
                                  selectedEl={this.state.selectedEl}
                                  busy={!this.props.isScreenLoaded}
                                  allAnnotationsForTour={this.props.allAnnotationsForTour}
                                  screen={this.props.screen}
                                  onAnnotationCreateOrChange={this.props.onAnnotationCreateOrChange}
                                  config={configOfParamsAnnId}
                                  tour={this.props.tour}
                                  updateTourProp={this.props.updateTourProp}
                                  applyAnnButtonLinkMutations={this.props.applyAnnButtonLinkMutations}
                                  selectedHotspotEl={this.state.selectedHotspotEl}
                                  subs={this.props.subs}
                                  selectedAnnReplaceEl={this.state.selectedAnnReplaceEl}
                                  selectedAnnotationCoords={this.state.selectedAnnotationCoords}
                                  setSelectionMode={(mode: 'annotation' | 'hotspot' | 'replace') => {
                                    this.setState({ selectionMode: mode });
                                  }}
                                  domElPicker={this.iframeElManager}
                                  onConfigChange={async (conf, actionType, opts) => {
                                    if (actionType === 'upsert') {
                                      this.setState({ selectedAnnotationId: conf.refId });
                                    }
                                    const screenId = configOfParamsAnnId.screen.id;
                                    this.props.onAnnotationCreateOrChange(screenId, conf, actionType, opts);
                                  }}
                                  onDeleteAnnotation={(deletedAnnRid: string) => {
                                    this.props.onDeleteAnnotation && this.props.onDeleteAnnotation(deletedAnnRid);
                                  }}
                                  resetSelectedAnnotationElements={() => {
                                    this.setState({
                                      selectedAnnReplaceEl: null,
                                      selectedAnnotationCoords: null,
                                      stashAnnIfAny: false
                                    });
                                  }}
                                  timeline={this.props.timeline}
                                  onTourDataChange={this.props.onTourDataChange}
                                  commitTx={this.props.commitTx}
                                  getConnectableAnnotations={(refId, btnType) => {
                                    const connectableAnnotations: IAnnotationConfigWithScreen[] = [];
                                    if (btnType === 'next') {
                                      this.props.timeline.forEach((flow) => {
                                        if (flow[flow.length - 1].refId !== refId) {
                                          connectableAnnotations.push(flow[0]);
                                        }
                                      });
                                    }
                                    if (btnType === 'prev') {
                                      this.props.timeline.forEach((flow) => {
                                        if (flow[0].refId !== refId) {
                                          connectableAnnotations.push(flow[flow.length - 1]);
                                        }
                                      });
                                    }
                                    return connectableAnnotations;
                                  }}
                                  updateConnection={this.props.updateConnection}
                                  elpathKey={this.props.elpathKey}
                                  featurePlan={this.props.featurePlan}
                                  currScreenId={configOfParamsAnnId.screen.id}
                                />
                                <SelectorComponent key={this.state.selectorComponentKey} userGuides={userGuides} />
                              </>
                            )
                          }
                        ]}
                      />
                    )
                  }
                  </div>
                  )}

                  {/* this is edits panel */}
                  {this.state.activeTab === TabList.Edits && (
                  <div style={{ paddingTop: '1rem' }}>
                    {this.props.screen.type === ScreenType.SerDom && (
                      <>
                        <FocusBubble diameter={12} style={{ marginLeft: '12px', marginTop: '4px' }} />
                        <Tags.InfoText className="typ-sm">
                          Click on an element to edit. Click again to reselect.
                        </Tags.InfoText>
                      </>
                    )}
                    {
                    this.props.screen.type === ScreenType.Img && (
                      <>
                        <Tags.ScreenResponsiveIpCon>
                          <div className="typ-reg">Fit to screen</div>
                          <div style={{ padding: '0.3rem 0', display: 'flex', gap: '0.5rem' }} className="typ-ip">
                            <label htmlFor="default">
                              <input
                                id="default"
                                type="radio"
                                checked={!this.props.screen.responsive}
                                onChange={(e) => {
                                  this.props.updateScreen(this.props.screen, 'responsive', false);
                                }}
                              />
                              Width
                            </label>

                            <label htmlFor="full-width">
                              <input
                                id="full-width"
                                type="radio"
                                checked={this.props.screen.responsive}
                                onChange={(e) => {
                                  this.props.updateScreen(this.props.screen, 'responsive', true);
                                }}
                              />
                              Height
                            </label>
                          </div>
                        </Tags.ScreenResponsiveIpCon>
                      </>
                    )
                  }
                    {
                    this.props.screen.type === ScreenType.SerDom && (
                      <>
                        <Tags.EditTabCon style={{ margin: '0 1rem 1rem 1rem' }}>
                          {/* this show the edit controls like toggles for blur/hide
                      and textarea for changing text content */}
                          {this.getEditingCtrlForElType(this.state.editTargetType, this.state.selectedEl, this.state.targetEl, this.state.editFeaturesAvailable)}
                        </Tags.EditTabCon>

                        {/* this is edits list */}
                        {this.props.screen.parentScreenId !== 0
                      && this.props.allEdits
                        .map((editEncoding) => (
                          <Tags.EditLIPCon
                            key={editEncoding[IdxEditItem.KEY]}
                            onClick={((edit) => (evt): void => {
                              this.setState({
                                editItemSelected: editEncoding[IdxEditItem.KEY],
                                isInElSelectionMode: true,
                                elSelRequestedBy: ElSelReqType.EditEl,
                              });
                              this.highlightElementForPath(edit[IdxEditItem.PATH]);
                            })(editEncoding)}
                          >
                            {ScreenEditor.getEditTypeComponent(editEncoding, editEncoding[IdxEditItem.EDIT_TYPE_LOCAL])}
                            {editEncoding[IdxEditItem.KEY] === this.state.editItemSelected && (
                              <div style={{ display: 'flex' }}>
                                <ListActionBtn edit={editEncoding} element={this.state.selectedEl!} />
                                &nbsp;&nbsp;|&nbsp;&nbsp;
                                <Tags.ListActionBtn onClick={() => this.showDeleteConfirm(editEncoding)}>
                                  Delete
                                </Tags.ListActionBtn>
                              </div>
                            )}
                          </Tags.EditLIPCon>
                        ))}
                      </>
                    )
                  }
                  </div>
                  )}
                </Tags.EditPanelSec>
              </div>
            </GTags.EditPanelCon>
          </div>
          <ImageMaskUploadModal
            open={this.state.showImageMaskUploadModal}
            onCancel={this.handleImageMaskUploadModalOnCancel}
            uploadImgMask={this.uploadImgMask}
            error={this.state.imageMaskUploadModalError}
            isUploading={this.state.imageMaskUploadModalIsUploading}
          />
        </GTags.PreviewAndActionCon>
      </>
    );
  }

  highlightElementForPath(path: string): void {
    const doc = this.embedFrameRef.current?.contentDocument;
    if (!doc) {
      throw new Error('Iframe doc is not found while resolving element from path');
    }
    const el = this.iframeElManager!.elFromPath(path) as HTMLElement;
    if (!el) {
      throw new Error(`Could not resolve element from path ${path}`);
    }

    this.highlightEditElIfSelected(el);
    // This is kind of a hack that moves the element in the view instantly and then after
    // 3 frame shows the selector.
    // Caveat: if the scroll is taking time to finish then this would not work
    // TODO fix this
    // INFO Changing value of block and inline would shift the parent element to make the el in the center of the screen
    // that we don't want. So be careful with this values.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setTimeout(() => {
      this.iframeElManager?.selectElement(el, HighlightMode.Pinned);
    }, 3 * 16);
  }

  private onMouseOutOfIframe = (_: MouseEvent): void => {
    this.iframeElManager?.disable();
  };

  private onMouseEnterOnIframe = (_: MouseEvent): void => {
    this.state.isInElSelectionMode && this.iframeElManager?.enable();
  };

  private onKeyDown = () => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // TODO handle pin mode and annotation selection
      if (this.iframeElManager && this.iframeElManager.getMode() === HighlightMode.Pinned) {
        this.iframeElManager.getOutOfPinMode();
        this.setState({ elSelRequestedBy: ElSelReqType.NA });
      } else {
        // this.setState({ isInElSelectionMode: false, elSelRequestedBy: ElSelReqType.NA });
      }
      this.setState({ selectedAnnotationId: '' });

      if (this.state.editItemSelected !== '') {
        this.setState({ editItemSelected: '' });
      }
    }
  };

  private onKeyDownHandler = (e: KeyboardEvent): void => {
    this.onKeyDown()(e);
  };

  private goToSelectionMode = () => () => {
    // todo[now] repeated code with onKeyDown method
    if (this.iframeElManager) {
      if (this.iframeElManager.getMode() === HighlightMode.Pinned) {
        this.iframeElManager.getOutOfPinMode();
      } else {
        this.iframeElManager.setSelectionMode();
      }
    }
  };

  private addToMicroEdit<K extends keyof EditValueEncoding>(
    path: string,
    fid: string,
    editType: K,
    edit: EditValueEncoding[K],
    addInGlobalLevelEdit: boolean = true,
    addInScreenLevelEdit: boolean = true,
  ): void {
    const isFidSupportedInSrn = this.props.screenData.version === SCREEN_DIFFS_SUPPORTED_VERSION;
    if (!isFidSupportedInSrn) {
      this.addToSrnLevelMicroEdit(path, editType, edit);
      return;
    }

    if (addInGlobalLevelEdit) {
      const globalEdit = convertTupleToGlobalElEdit(editType, edit, this.props.screen.id)!;
      this.addToGlobalMicroEdit(
        `fid/${fid}`,
        globalEdit.type,
        convertTupleToGlobalElEdit(globalEdit.type, edit, this.props.screen.id)!,
      );
    }

    if (addInScreenLevelEdit) {
      this.addToSrnLevelMicroEdit(path, editType, edit);
    }
  }

  private addToSrnLevelMicroEdit<K extends keyof EditValueEncoding>(
    path: string,
    editType: K,
    edit: EditValueEncoding[K]
  ): void {
    if (!(path in this.microEdits)) {
      this.microEdits[path] = {};
    }
    const edits = this.microEdits[path];
    edits[editType] = edit;
  }

  private addToGlobalMicroEdit<K extends keyof GlobalElEditValueEncoding>(
    key: string,
    editType: K,
    edit: GlobalElEditValueEncoding[K]
  ): void {
    if (!(key in this.microGlobalEdits)) {
      this.microGlobalEdits[key] = {};
    }
    const edits = this.microGlobalEdits[key];
    edits[editType] = edit;
  }

  private disposeDomPicker(): void {
    if (this.iframeElManager) {
      this.iframeElManager.dispose();
      this.iframeElManager = null;
    }
  }

  private onElSelect = (el: HTMLElement): void => {
    if (this.state.selectionMode === 'hotspot') {
      if (this.iframeElManager!.isElInBoundedEl(el)) {
        this.setState({ selectedHotspotEl: el, selectionMode: 'annotation' });
      }
      return;
    }

    if (this.state.selectionMode === 'replace') {
      this.setState({ selectedAnnReplaceEl: el, selectionMode: 'annotation' });
      return;
    }

    if (this.state.selectionMode === 'reselect') {
      this.setState({ reselectedEl: el, selectionMode: 'annotation' });
      return;
    }
    this.setState({ selectedEl: el });
  };

  private onElDeSelect = (_: HTMLElement): void => {
    this.flushMicroEdits();
    this.resetSelectedAnnotation();
    if (this.state.editItemSelected || this.state.targetEl) {
      this.resetSelectedEdits();
    }
  };

  private onBoxSelect = (coordsStr: string): void => {
    if (this.state.selectionMode === 'replace') {
      this.setState({ selectedAnnotationCoords: coordsStr, selectionMode: 'annotation' });
      return;
    }
    this.setState({ selectedCoords: coordsStr });
  };

  private onBoxDeSelect = (): void => {
    this.setState({ selectedAnnotationId: '', selectedCoords: '' });
  };

  private initDomPicker(nestedFrames: HTMLIFrameElement[]): void {
    const el = this.embedFrameRef?.current;

    const an = this.props.allAnnotationsForScreen.find(antn => antn.refId === this.props.toAnnotationId);
    const highlighterBaseConfig = {
      selectionColor: an ? an.annotationSelectionColor._val : DEFAULT_BLUE_BORDER_COLOR,
      showOverlay: an?.showOverlay || true,
      showMaskBorder: true,
    };

    let doc;
    if (doc = el?.contentDocument) {
      if (!this.iframeElManager) {
        if (this.props.screen.type === ScreenType.SerDom) {
          this.iframeElManager = new DomElPicker(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
          }, this.props.screen.type, highlighterBaseConfig, this.props.screenData.isHTML4);
          this.iframeElManager!.addEventListener('click', (docu: Document) => (e: MouseEvent) => {
            const audioMediaCtrls = Array.from(docu.querySelectorAll(`.${FABLE_AUDIO_MEDIA_CONTROLS}`));
            const clickedEl = e.target as HTMLElement;

            for (const ctrl of audioMediaCtrls) {
              if (ctrl.contains(clickedEl)) {
                return;
              }
            }

            this.goToSelectionMode()();
          });
        }

        if (this.props.screen.type === ScreenType.Img) {
          this.iframeElManager = new ScreenImageBrusher(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
            onBoxSelect: this.onBoxSelect,
            onBoxDeSelect: this.onBoxDeSelect,
          }, this.props.screen.type, highlighterBaseConfig, this.props.screenData.isHTML4);
        }

        if (!this.props.toAnnotationId) {
          this.iframeElManager!.getOutOfPinMode();
        }

        this.iframeElManager!.addEventListener('keydown', this.onKeyDown);
        this.iframeElManager!.setupHighlighting();

        el.addEventListener('mouseout', this.onMouseOutOfIframe);
        el.addEventListener('mouseenter', this.onMouseEnterOnIframe);
        this.selectElementIfAnnoted();
      }
    } else {
      throw new Error("Can't init dompicker as iframe document is null");
    }
  }
}
