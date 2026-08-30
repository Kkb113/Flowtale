import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  IChronoUpdatable,
  ITourDataOpts,
  EAnnotationBoxSize,
  VideoAnnotationPositions,
  AnnotationButtonLayoutType,
  CustomAnnDims,
  CustomAnnotationPosition,
  AnnotationSelectionShapeType,
  AnnotationSelectionEffectType,
  CoverAnnotationPositions,
  ScrollAdjustmentType,
  IAnnotationAudio,
  Property,
  IGlobalConfig,
  ITourEntityHotspot,
} from '@fable/common/dist/types';
import { GlobalPropsPath, createGlobalProperty, createLiteralProperty, getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';
import { ElPathKey } from '../../types';
import { isMediaAnnotation } from '../../utils';
import { isLeadFormPresentInHTMLStr } from '../annotation-rich-text-editor/utils/lead-form-node-utils';

export interface IAnnotationConfigWithScreenId extends IAnnotationConfig {
  screenId: number
}

export function updateAnnotationGrpId<T extends IAnnotationConfig>(config: T, grpId: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.grpId = grpId;
  return newConfig;
}

export function getBigramId(config: IAnnotationConfig): string {
  return config.refId.substring(2);
}

export function updateAnnotationText<T extends IAnnotationConfig>(config: T, txt: string, displayText: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.bodyContent = txt;
  newConfig.displayText = displayText;
  newConfig.isLeadFormPresent = isLeadFormPresentInHTMLStr(txt);
  return newConfig;
}

export function updateTargetElCssStyle<T extends IAnnotationConfig>(config: T, cssStr: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.targetElCssStyle = cssStr;
  return newConfig;
}

export function updateAnnCssStyle<T extends IAnnotationConfig>(config: T, cssStr: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.annCSSStyle = cssStr;
  return newConfig;
}

export function updateAnnotationBoxSize<T extends IAnnotationConfig>(config: T, size: EAnnotationBoxSize): T {
  const newConfig = newConfigFrom(config);
  newConfig.size = size;
  return newConfig;
}

export function updateAnnotationCustomDims<T extends IAnnotationConfig>(config: T, customDims: CustomAnnDims): T {
  const newConfig = newConfigFrom(config);
  newConfig.customDims = customDims;
  return newConfig;
}

export function updateAnnotationZId<T extends IAnnotationConfig>(config: T, zId: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.zId = zId;
  return newConfig;
}

export function updateAnnotationPositioning<T extends IAnnotationConfig>(
  config: T,
  positioning: AnnotationPositions | VideoAnnotationPositions | CustomAnnotationPosition
): T {
  const newConfig = newConfigFrom(config);
  newConfig.positioning = positioning;
  return newConfig;
}

export function updateAnnotationVideoURL<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrl = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLMp4<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlMp4 = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLHLS<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlHls = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLWebm<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlWebm = videoUrl;
  return newConfig;
}

export function updateAnnotationVideo(
  config: IAnnotationConfig,
  videoUrl: { videoUrlMp4: string; videoUrlHls: string; videoUrlWebm: string; }
): IAnnotationConfig {
  const newConfig = clearAnnotationAudio(config);
  newConfig.videoUrlMp4 = videoUrl.videoUrlMp4;
  newConfig.videoUrlHls = videoUrl.videoUrlHls;
  newConfig.videoUrlWebm = videoUrl.videoUrlWebm;
  return newConfig;
}

export function updateAnnotationAudio(config: IAnnotationConfig, audio: IAnnotationAudio): IAnnotationConfig {
  const newConfig = clearAnnotationAllVideoURL(config);
  newConfig.audio = audio;
  return newConfig;
}

export function clearAnnotationAudio(config: IAnnotationConfig): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.audio = null;
  newConfig.voiceover = null;
  return newConfig;
}

export function updateAnnotationTypeToCover(config: IAnnotationConfig) : IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.type = 'cover';
  newConfig.id = `$#${newConfig.refId}`;
  newConfig.size = 'medium';

  return newConfig;
}

export function updateAnnotationTypeToDefault(
  config: IAnnotationConfig,
  elPath: string
) : IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.type = 'default';
  newConfig.id = elPath;
  newConfig.size = 'small';
  newConfig.hideAnnotation = false;
  return newConfig;
}

export function updateAnnotationSelectionEffect<T extends IAnnotationConfig>(
  config: T,
  selectionEffect: Property<AnnotationSelectionEffectType>
): T {
  const newConfig = newConfigFrom(config);
  newConfig.selectionEffect = selectionEffect;
  return newConfig;
}

export function updateAnnotationScrollAdjustment<T extends IAnnotationConfig>(
  config: T,
  scrollAdjustment: ScrollAdjustmentType
): T {
  const newConfig = newConfigFrom(config);
  newConfig.scrollAdjustment = scrollAdjustment;
  return newConfig;
}

export function updateAnnotationIsHotspot(config: IAnnotationConfig, isHotspot: boolean): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.isHotspot = isHotspot;

  if (!isHotspot) {
    newConfig.hideAnnotation = false;
    newConfig.hotspotElPath = null;
  }

  return newConfig;
}

export const clearAllMedia = (c: IAnnotationConfig): IAnnotationConfig => {
  const newConfig = clearAnnotationAudio(c);

  return clearAnnotationAllVideoURL(newConfig);
};

export function clearAnnotationAllVideoURL(config: IAnnotationConfig): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrl = '';
  newConfig.videoUrlMp4 = '';
  newConfig.videoUrlWebm = '';
  newConfig.videoUrlHls = '';
  newConfig.positioning = AnnotationPositions.Auto;
  return newConfig;
}

export function updateAnnotationHotspotElPath<T extends IAnnotationConfig>(
  config: T,
  hotspotElPath: string | null
): T {
  const newConfig = newConfigFrom(config);
  newConfig.hotspotElPath = hotspotElPath;
  return newConfig;
}

export function updateAnnotationHideAnnotation<T extends IAnnotationConfig>(config: T, hideAnnotation: boolean): T {
  const newConfig = newConfigFrom(config);
  newConfig.hideAnnotation = hideAnnotation;
  return newConfig;
}

export function updateAnnotationButtonLayout<T extends IAnnotationConfig>(
  config: T,
  buttonLayout: AnnotationButtonLayoutType
): T {
  const newConfig = newConfigFrom(config);
  newConfig.buttonLayout = buttonLayout;
  return newConfig;
}

export function updateAnnotationSelectionShape<T extends IAnnotationConfig>(
  config: T,
  selectionShape: Property<AnnotationSelectionShapeType>
): T {
  const newConfig = newConfigFrom(config);
  newConfig.selectionShape = selectionShape;
  return newConfig;
}

export function updateOverlay<T extends IAnnotationConfig>(config: T, showOverlay: boolean): T {
  const newConfig = newConfigFrom(config);
  newConfig.showOverlay = showOverlay;
  return newConfig;
}

export function updateSelectionColor<T extends IAnnotationConfig>(config: T, selectionColor: Property<string>): T {
  const newConfig = newConfigFrom(config);
  newConfig.annotationSelectionColor = selectionColor;
  return newConfig;
}

export function updateTourDataOpts<K extends keyof ITourDataOpts>(
  opts: ITourDataOpts,
  key: K,
  value: ITourDataOpts[K]
): ITourDataOpts {
  const newOpts = newConfigFrom(opts);
  (newOpts as any)[key] = value;
  return newOpts;
}

export function updateAnnotationMobileElPath<T extends IAnnotationConfig>(
  config: T,
  elPath: string
): T {
  const newConfig = newConfigFrom(config);
  newConfig.m_id = elPath;
  return newConfig;
}

export function newConfigFrom<T extends IChronoUpdatable>(c: T): T {
  const newConfig = { ...c };
  newConfig.monoIncKey++;
  newConfig.updatedAt = getCurrentUtcUnixTime();
  return newConfig;
}

export function removeButtonWithId<T extends IAnnotationConfig>(config: T, id: string): T {
  const newConf = newConfigFrom(config);
  const buttons = newConf.buttons.slice(0).filter(b => b.id !== id);
  newConf.buttons = buttons;
  return newConf;
}

function findBtnById(config: IAnnotationConfig, id: string): [IAnnotationButton, number][] {
  const thisButton = config.buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
    .filter(([b]) => b.id === id);
  return thisButton;
}

export function updateButtonProp<T extends IAnnotationConfig>(
  config: T,
  id: string,
  prop: keyof IAnnotationButton,
  value: IAnnotationButton[keyof IAnnotationButton]
): T {
  const newConfig = newConfigFrom(config);
  const buttons = newConfig.buttons.slice(0);
  const thisButton = findBtnById(newConfig, id);
  buttons[thisButton[0][1]] = {
    ...thisButton[0][0],
    [prop]: value
  };
  newConfig.buttons = buttons;
  return newConfig;
}

export function toggleBooleanButtonProp<T extends IAnnotationConfig>(
  config: T,
  id: string,
  prop: keyof IAnnotationButton
): T {
  const newConfig = newConfigFrom(config);
  const buttons = newConfig.buttons.slice(0);
  const thisButton = findBtnById(config, id);
  buttons[thisButton[0][1]] = {
    ...thisButton[0][0],
    [prop]: !thisButton[0][0][prop]
  };
  newConfig.buttons = buttons;
  return newConfig;
}

function getCustomBtnTemplate(order: number, size: AnnotationButtonSize, globalOpts: IGlobalConfig): IAnnotationButton {
  return {
    id: getRandomId(),
    type: 'custom',
    style: createGlobalProperty(globalOpts.customBtn1Style, GlobalPropsPath.customBtn1Style),
    size: createGlobalProperty(globalOpts.ctaSize, GlobalPropsPath.ctaSize),
    text: createGlobalProperty(globalOpts.customBtn1Text, GlobalPropsPath.customBtn1Text),
    order,
    hotspot: null
  };
}

export function getLatestBtnOrder(config: IAnnotationConfig): number {
  let order = 1;
  for (const btn of config.buttons) {
    if (btn.type !== 'custom') {
      continue;
    }

    order = Math.max(order, btn.order);
  }
  return order;
}

export function addCustomBtn<T extends IAnnotationConfig>(config: T, globalOpts: IGlobalConfig): T {
  const order = getLatestBtnOrder(config);
  const nextBtn = config.buttons.filter(btn => btn.type === 'next')[0];
  const size = nextBtn.size;
  const btn = getCustomBtnTemplate(order, size._val, globalOpts);
  const hostspotConfig: ITourEntityHotspot = {
    type: 'an-btn',
    on: 'click',
    target: '$this',
    actionType: 'open',
    actionValue: createGlobalProperty(
      globalOpts.customBtn1URL,
      GlobalPropsPath.customBtn1URL
    ),
    openInSameTab: false
  };
  btn.hotspot = hostspotConfig;

  const newConfig = newConfigFrom(config);
  newConfig.buttons = newConfig.buttons.slice(0);
  newConfig.buttons.push(btn);
  return newConfig;
}

export function shallowCloneAnnotation(
  elPath: string,
  from: IAnnotationConfig,
  elPathKey: ElPathKey
): IAnnotationConfig {
  const newConf: IAnnotationConfig = {
    ...from,
    [elPathKey]: elPath,
    updatedAt: getCurrentUtcUnixTime(),
  };
  return newConf;
}

export function isCoverAnnotation(annId: string): boolean {
  return annId.split('#')[0] === '$';
}

export const isAnnCustomPosition = (
  pos: AnnotationPositions | VideoAnnotationPositions | CustomAnnotationPosition | CoverAnnotationPositions
): boolean => {
  let isCustomPos = false;

  Object.values(CustomAnnotationPosition).forEach(p => {
    if (p === pos) isCustomPos = true;
  });

  return isCustomPos;
};

type PositioningOptions = Array<AnnotationPositions | VideoAnnotationPositions | CoverAnnotationPositions | 'custom'>;

export const getAnnPositioningOptions = (config: IAnnotationConfig)
: PositioningOptions => {
  const positions: PositioningOptions = [];

  if (isMediaAnnotation(config)) {
    const videoPositions = Object.values(VideoAnnotationPositions);
    if (config.type === 'cover') {
      positions.push(...videoPositions.filter(pos => pos !== VideoAnnotationPositions.Follow));
    } else {
      positions.push(...videoPositions, 'custom');
    }
    return positions;
  }

  if (config.type === 'default') {
    positions.push(...Object.values(AnnotationPositions), 'custom');
  }

  if (config.type === 'cover') {
    positions.push(...Object.values(CoverAnnotationPositions), AnnotationPositions.Auto);
  }

  return positions;
};
