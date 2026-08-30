import {
  RespDemoEntity, Responsiveness,
  Plan as PaymentTermsPlan,
  Interval as PaymentTermsInterval,
  FrameSettings,
  Status,
  Plan,
  ApiResp,
} from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import {
  IAnnotationConfig,
  IAnnotationOriginConfig,
  IGlobalConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  JourneyData,
  JourneyFlow,
  Property,
  PropertyType,
  SerNode,
  TourData,
  TourScreenEntity,
  VideoAnnotationPositions,
} from '@fable/common/dist/types';
import { GlobalPropsPath, compileValue, createGlobalProperty, createLiteralProperty, deepcopy, getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';
import Handlebars from 'handlebars';
import { ToolUseBlockParam } from '@anthropic-ai/sdk/resources';
import api from '@fable/common/dist/api';
import { PostProcessDemoV1, ThemeForGuideV1, CreateNewDemoV1, RouterForTypeOfDemoCreation, DemoMetadata, LLMResp, UpdateDemoContentV1, RootRouterReq } from '@fable/common/dist/llm-contract';
import { update_demo_content } from '@fable/common/dist/llm-fn-schema/update_demo_content';
import { suggest_guide_theme } from '@fable/common/dist/llm-fn-schema/suggest_guide_theme';
import { ColumnsType } from 'antd/es/table';
import { IAnnotationConfigWithScreenId, updateAnnotationAudio, updateAnnotationBoxSize, updateAnnotationPositioning, updateOverlay } from './component/annotation/annotation-config-utils';
import { getAnnotationBtn, getAnnotationByRefId } from './component/annotation/ops';
import { FABLE_LEAD_FORM_FIELD_NAME, FABLE_PERS_VARS_FOR_TOUR } from './constants';
import { P_RespSubscription, P_RespTour } from './entity-processor';
import { AnalyticsValue, AnnotationValue, FeatureForPlan, PlanDetail } from './plans';
import { TState } from './reducer';
import {
  AnnotationPerScreen,
  ExtMsg,
  FeatureAvailability,
  FlowProgress,
  HiddenEls,
  IAnnotationConfigWithLocation,
  IAnnotationConfigWithScreen,
  IDemoHubConfig,
  IDemoHubConfigCta,
  IDemoHubConfigDemo,
  IDemoHubConfigQualification,
  IDemoHubConfigSeeAllPageSection,
  JOURNEY_PROGRESS_LOCAL_STORE_KEY,
  JourneyModuleWithAnns,
  SelectEntry,
  SimpleStyle,
  SiteData,
  SiteThemePresets,
  TextEntry,
  LeadFormEntry,
  SelectEntryOption,
  DemoHubQualificationSidePanel,
  Timeline,
  TourMainValidity,
  queryData,
  EditItem,
  IdxEditItem,
  LSSavedPersVarData,
  DemoState,
  DemoStateWithAnnRefId,
  TableRow,
  DatasetConfig,
  TableColumn,
  PerVarType,
  PerVarData,
  ElEditType,
  IdxEncodingTypeText,
  EncodingTypeText,
  AnnVoiceOverDetail,
  Positions,
  AnimEntryDir,
} from './types';
import { Rect } from './component/base/hightligher-base';

export const LOCAL_STORE_TIMELINE_ORDER_KEY = 'fable/timeline_order_2';
const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID as string;
export const AEP_HEIGHT = 25;
export const ANN_EDIT_PANEL_WIDTH = 350;
export const RESP_MOBILE_SRN_WIDTH_LIMIT = 490;
export const RESP_MOBILE_SRN_WIDTH = 390;
export const RESP_MOBILE_SRN_HEIGHT = 844;
export const DESKTOP_MEDIUM_SRN_WIDTH = 1000;
export const DESKTOP_MEDIUM_SRN_HEIGHT = 563;

export const preMappedLeadFormFields = {
  email: 1,
  first_name: 1,
  last_name: 1,
  org: 1
};

export function isBodyEl(el: HTMLElement): boolean {
  return !!(el && el.tagName && el.tagName.toLowerCase() === 'body');
}

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function openTourExternalLink(uri: string, openInSameTab?: boolean): void {
  const qParamsStr = window.location.search;
  const qParams = new URLSearchParams(qParamsStr);
  qParams.forEach((val, key) => {
    const pattern = `{{${key}}}`;
    uri = uri.replaceAll(pattern, val);
  });

  const url = new URL(uri);
  const sharefableUrl = new URL(process.env.REACT_APP_CLIENT_ENDPOINT as string);
  if (url.host === sharefableUrl.host) {
    window.open(uri, '_self');
  } else if (openInSameTab) {
    window.open(uri, '_top');
  } else {
    window.open(uri, '_blank')?.focus();
  }
}

export function getAnnotationsPerScreen(state: TState): AnnotationPerScreen[] {
  const anPerScreen: AnnotationPerScreen[] = [];
  try {
    const combinedAnnotations: Record<string, IAnnotationConfig> = {};
    const annToDeleteAcrossScreen: Record<string, Record<string, number>> = {};
    for (const [screenId, anns] of Object.entries(state.default.localAnnotations)) {
      const idMap = state.default.localAnnotationsIdMap[screenId];
      const deleteMap: Record<string, number> = annToDeleteAcrossScreen[screenId] = {};
      for (let i = 0; i < anns.length; i++) {
        if (!anns[i]) {
          deleteMap[idMap[i]] = 1;
          continue;
        }
        combinedAnnotations[`${screenId}/${anns[i].refId}`] = anns[i];
      }
    }
    for (const [screenId, anns] of Object.entries(state.default.remoteAnnotations)) {
      for (const an of anns) {
        const key = `${screenId}/${an.refId}`;
        if (an.id in (annToDeleteAcrossScreen[screenId] || {})) continue;
        if (!(key in combinedAnnotations)) combinedAnnotations[key] = an;
      }
    }
    const screenAnMap: Record<string, IAnnotationConfig[]> = {};
    for (const [qId, an] of Object.entries(combinedAnnotations)) {
      const [screenId] = qId.split('/');
      if (screenId in screenAnMap) {
        screenAnMap[screenId].push(an);
      } else {
        screenAnMap[screenId] = [an];
        const screen = state.default.allScreens.find(s => s.id === +screenId);
        if (screen) {
          anPerScreen.push({ screen, annotations: screenAnMap[screenId] });
        } else {
          raiseDeferredError(new Error(`screenId ${screenId} 
          is part of tour config, but is not present as part of entity association`));
        }
      }
    }
    // If there are screen present as part of a tour but no annotation is yet made then also we
    // show this
    const screensForTours = state.default.currentTour?.screens || [];
    for (const screen of screensForTours) {
      if (!(screen.id in screenAnMap)) {
        anPerScreen.push({ screen, annotations: [] });
      }
    }
  } catch (e) {
    raiseDeferredError(e as Error);
  }
  return anPerScreen;
}

export function isBlankString(str: string): boolean {
  return str.trim() === '';
}
export const isVideoAnnotation = (config: IAnnotationConfig): boolean => !isBlankString(config.videoUrl)
  || (!isBlankString(config.videoUrlMp4)
    || !isBlankString(config.videoUrlWebm)
    || !isBlankString(config.videoUrlHls));

export const isAudioAnnotation = (config: IAnnotationConfig): boolean => (!!config.audio);

export const isMediaAnnotation = (config: IAnnotationConfig, showVoiceover: boolean = true): boolean => {
  const isVoiceover = config.voiceover;
  if (!showVoiceover && isVoiceover) return false;
  const isVideoAnn = isVideoAnnotation(config);
  const isAudioAnn = isAudioAnnotation(config);
  return isVideoAnn || isAudioAnn;
};

export const isCoverAnnotation = (config: IAnnotationConfig): boolean => config.type === 'cover';

export function flatten<T>(arr: Array<T[]>): T[] {
  const flatArr: T[] = [];
  for (const item of arr) {
    flatArr.push(...item);
  }
  return flatArr;
}

export const generateTimelineOrder = (timeline: Timeline): string[] => {
  const newTimelineOrder: string[] = [];
  for (const group of timeline) {
    newTimelineOrder.push(group[0].grpId);
  }

  return newTimelineOrder;
};

export const getFableTimelineOrder = (): LocalStoreTimelineOrder => {
  const FABLE_TIMELINE_ORDER = localStorage.getItem(LOCAL_STORE_TIMELINE_ORDER_KEY);
  return FABLE_TIMELINE_ORDER
    ? JSON.parse(FABLE_TIMELINE_ORDER) as LocalStoreTimelineOrder
    : { rid: '', order: [] };
};

export const saveFableTimelineOrder = (timelineOrder: LocalStoreTimelineOrder): void => {
  localStorage.setItem(LOCAL_STORE_TIMELINE_ORDER_KEY, JSON.stringify(timelineOrder));
};

interface LocalStoreTimelineOrder {
  rid: string;
  order: string[];
}

export const updateLocalTimelineGroupProp = (grpId: string, nearbygrpId: string): void => {
  const FABLE_TIMELINE_ORDER = getFableTimelineOrder();
  FABLE_TIMELINE_ORDER.order.splice(FABLE_TIMELINE_ORDER.order.indexOf(nearbygrpId) + 1, 0, grpId);
  saveFableTimelineOrder(FABLE_TIMELINE_ORDER);
};

export const isNavigateHotspot = (hotspot: ITourEntityHotspot | null): boolean => {
  const result = Boolean((hotspot && hotspot.actionType === 'navigate'));
  return result;
};

export const doesBtnOpenALink = (ann: IAnnotationConfig, type: 'next' | 'prev'): boolean => {
  const foundBtn = getAnnotationBtn(ann, type);
  return !!(foundBtn.hotspot && foundBtn.hotspot.actionType === 'open');
};

export const DEFAULT_ALERT_FOR_ANN_OPS = 'Operation can\'t be performed.';

export function getColorContrast(hex: string): 'dark' | 'light' {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 154) ? 'light' : 'dark';
}

export const setEventCommonState = (property: string, value: any): void => {
  const ep = localStorage.getItem('fable/ep');
  const eventProperties = ep ? JSON.parse(ep) : {};
  eventProperties[property] = value;

  localStorage.setItem('fable/ep', JSON.stringify(eventProperties));
};

export const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export const generateScreenIndex = (timelineCount: number, timelineIdx: number, annIdx: number): string => {
  if (timelineCount > 1) {
    const screenIdx = `${String.fromCharCode(65 + timelineIdx)}-${annIdx}`;
    return screenIdx;
  }

  return `${annIdx.toString()}`;
};

export const assignStepNumbersToAnnotations = (
  timeline: Timeline
): Timeline => {
  timeline.forEach((singleTimeline, singleTimelineIdx) => {
    singleTimeline.forEach((ann, annIdx) => {
      ann.stepNumber = generateScreenIndex(timeline.length, singleTimelineIdx, annIdx + 1);
    });
  });
  return timeline;
};

export const createIframeSrc = (relativeURL: string): string => baseURL + relativeURL;

export const isExtensionInstalled = (): Promise<boolean> => new Promise((resolve) => {
  if (typeof chrome === 'undefined' || !chrome.runtime) resolve(false);

  chrome.runtime.sendMessage(
    EXTENSION_ID,
    { message: 'version' },
    (response) => {
      if (response && response.version) resolve(true);
      if (chrome.runtime.lastError) resolve(false);
    }
  );
});

export const getAnnotationWithScreenAndIdx = (
  annRefId: string,
  entireTimeline: Timeline
): IAnnotationConfigWithScreen | null => {
  let ann: IAnnotationConfigWithScreen | null = null;
  entireTimeline.forEach(timeline => {
    timeline.forEach(config => {
      if (config.refId === annRefId) ann = config;
    });
  });
  return ann;
};

export const getJourneyProgress = (): Record<string, FlowProgress[]> => {
  const FABLE_JOURNEY_PROGRESS = sessionStorage.getItem(JOURNEY_PROGRESS_LOCAL_STORE_KEY);
  return FABLE_JOURNEY_PROGRESS ? JSON.parse(FABLE_JOURNEY_PROGRESS) as Record<string, FlowProgress[]> : {};
};

export const saveJourneyProgress = (journeyProgress: Record<string, FlowProgress[]>): void => {
  sessionStorage.setItem(JOURNEY_PROGRESS_LOCAL_STORE_KEY, JSON.stringify(journeyProgress));
};

export const isValidUrl = (url: string) : boolean => {
  try {
    const constructedUrl = new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const getValidUrl = (url: string): string => {
  const isUrlValid = isValidUrl(url);
  if (!isUrlValid) {
    let inputUrl = url;
    if (!(inputUrl.startsWith('http://') || inputUrl.startsWith('https://'))) {
      inputUrl = `https://${inputUrl}`;
    }
    return isValidUrl(inputUrl) ? inputUrl : '';
  }

  return url;
};

export const enum DisplaySize {
  FIT_TO_SCREEN = 0,
  MEDIUM,
  SMALL,
  MOBILE_PORTRAIT,
  MOBILE_LANDSCAPE
}

export const getDimensionsBasedOnDisplaySize = (displaySize: DisplaySize): { height: string; width: string } => {
  switch (displaySize) {
    case DisplaySize.FIT_TO_SCREEN:
      return { height: '100%', width: '100%' };
    case DisplaySize.MEDIUM:
      return { height: `${DESKTOP_MEDIUM_SRN_HEIGHT}px`, width: `${DESKTOP_MEDIUM_SRN_WIDTH}px` };
    case DisplaySize.SMALL:
      return { height: '450px', width: '800px' };
    case DisplaySize.MOBILE_PORTRAIT:
      return { height: `${RESP_MOBILE_SRN_HEIGHT}px`, width: `${RESP_MOBILE_SRN_WIDTH}px` };
    case DisplaySize.MOBILE_LANDSCAPE:
      return { width: `${RESP_MOBILE_SRN_HEIGHT}px`, height: `${RESP_MOBILE_SRN_WIDTH}px` };
    default:
      return { height: '100%', width: '100%' };
  }
};

export const isMobilePreviewDisplaySize = (displaySize: DisplaySize): boolean => {
  switch (displaySize) {
    case DisplaySize.MOBILE_PORTRAIT:
    case DisplaySize.MOBILE_LANDSCAPE:
      return true;
    default:
      return false;
  }
};

export function isDeepEqual<T>(obj1: T, obj2: T): boolean {
  const stack1: T[] = [obj1];
  const stack2: T[] = [obj2];

  while (stack1.length > 0 && stack2.length > 0) {
    const currentObj1 = stack1.pop();
    const currentObj2 = stack2.pop();

    if (typeof currentObj1 !== typeof currentObj2) {
      return false;
    }

    if (typeof currentObj1 === 'object'
    && currentObj1 !== null
    && typeof currentObj2 === 'object'
    && currentObj2 !== null
    ) {
      const keys1 = Object.keys(currentObj1);
      const keys2 = Object.keys(currentObj2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      keys1.forEach(key => {
        stack1.push((currentObj1 as any)[key]);
      });

      keys2.forEach(key => {
        stack2.push((currentObj2 as any)[key]);
      });
    } else if (currentObj1 !== currentObj2) {
      return false;
    }
  }

  return stack1.length === 0 && stack2.length === 0;
}

export function removeDuplicatesOfStrArr(arr: string[]): string[] {
  const obj: Record<string, boolean> = {};

  for (const el of arr) {
    obj[el] = true;
  }

  return Object.keys(obj);
}

export function getFidOfSerNode(node: SerNode): string {
  if (!node) return '-1';
  let fid: string;
  if (node.type === 8 && node.name === '#comment') {
    const sub = node.props.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else {
    fid = node.attrs['f-id']!;
  }
  return fid;
}

export function getFidOfNode(node: Node): string {
  if (!node) return '-1';
  let fid: string = '-1';
  if (node.nodeType === Node.COMMENT_NODE) {
    const sub = node.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else if (node.nodeType === Node.TEXT_NODE) {
    node = node.previousSibling as Node;
    if (!node) return fid;
    const sub = node.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    fid = (node as HTMLElement).getAttribute('f-id')!;
  }
  return fid;
}

export const getChildElementByFid = (node: Node, fid: string): HTMLElement | null => {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement;
    switch (child.nodeType) {
      case Node.TEXT_NODE:
      case Node.COMMENT_NODE: {
        const sub = child.textContent?.split('==')[0] || '';
        const currFid = sub.split('/')[1];
        if (currFid === fid) { return child as HTMLElement; }
        break;
      }
      case Node.ELEMENT_NODE: {
        const currFid = child.getAttribute('f-id') || '';
        if (currFid === fid) return child as HTMLElement;
        break;
      }
      default:
        break;
    }
  }

  return null;
};

export function postMessageForEvent<T>(eventType: ExtMsg, payload: T): void {
  const message = {
    sender: 'sharefable.com',
    type: eventType,
    payload,
  };

  window.parent.postMessage(message, '*');
}

export const getCurrentFlowMain = (
  id: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  flows: JourneyFlow[]
) : string => {
  let refId = id;
  while (refId) {
    const annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
    const prevBtn = getAnnotationBtn(annotation!, 'prev');

    if (!prevBtn.hotspot) {
      const main = `${annotation!.screenId}/${refId}`;
      const flowIndex = flows.findIndex((flow) => flow.main === main);
      if (flowIndex !== -1) {
        return main;
      }
      break;
    }
    if (!isNavigateHotspot(prevBtn.hotspot)) break;
    refId = prevBtn.hotspot!.actionValue._val.split('/')[1];
  }
  return '';
};

export const isHTTPS = (url: string): boolean => url.trim().startsWith('https://');

export function isStrBlank(str: string | undefined | null): boolean {
  return !(str || '').trim();
}

export function getTransparencyFromHexStr(hex: string): number {
  if (hex.length <= 7) return 100;
  const transparencyHexStr = hex.substring(8);
  const h = parseInt(transparencyHexStr, 16);
  return Number.isNaN(h) ? 0 : Math.round((h / 255) * 100);
}

const getOrderedAnnsFromGivenAnn = (
  ann: IAnnotationConfigWithLocation,
  flatAnns: Record<string, IAnnotationConfigWithLocation>
): IAnnotationConfigWithLocation[] => {
  const annsInOrder: IAnnotationConfigWithLocation[] = [];

  while (true) {
    annsInOrder.push(ann);

    const nextBtn = getAnnotationBtn(ann, 'next')!;
    if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
      break;
    }
    const nextAnnRefId = nextBtn.hotspot.actionValue._val.split('/')[1];
    ann = flatAnns[nextAnnRefId];
  }

  return annsInOrder;
};

const getFlatAnns = (
  allAnns: AnnotationPerScreen[],
  tour?: P_RespTour,
): Record<string, IAnnotationConfigWithLocation> => {
  const flatAnns: Record<string, IAnnotationConfigWithLocation> = {};
  for (const annPerScreen of allAnns) {
    for (const ann of annPerScreen.annotations) {
      flatAnns[ann.refId] = {
        ...ann,
        location: tour ? `/demo/${tour.rid}/${annPerScreen.screen.rid}/${ann.refId}` : '',
        screenId: annPerScreen.screen.id,
      };
    }
  }
  return flatAnns;
};

// Irrespective of journey's presence this function always returns standard a data format
// The first element always contains the full dataset across all journey. If journey is not present
// then there is only one element in the array
export function getJourneyWithAnnotationsNormalized(
  allAnns: AnnotationPerScreen[],
  journeyModules: JourneyFlow[],
  tour: P_RespTour,
  opts: ITourDataOpts
): JourneyModuleWithAnns[] {
  const annsOrderedByJourney = getJourneyWithAnnotations(allAnns, journeyModules, tour);
  if (!annsOrderedByJourney.length) {
    // journey not present
    const main = opts.main || '';
    const phoney: JourneyModuleWithAnns = {
      isPhony: true,
      header1: '',
      header2: '',
      main,
      annsInOrder: main ? getOrderedAnnotaionFromMain(allAnns, main) : [],
      mandatory: false
    };
    return [phoney];
  }
  const phony = {
    isPhony: true,
    header1: '',
    header2: '',
    main: '',
    mandatory: false,
    annsInOrder: annsOrderedByJourney.reduce((flatArr, journeysWithAnns) => {
      flatArr.push(...journeysWithAnns.annsInOrder);
      return flatArr;
    }, [] as IAnnotationConfigWithLocation[])
  };
  annsOrderedByJourney.unshift(phony);
  return annsOrderedByJourney;
}

export const getJourneyWithAnnotations = (
  allAnns: AnnotationPerScreen[],
  journeyModules: JourneyFlow[],
  tour?: P_RespTour,
) : JourneyModuleWithAnns[] => {
  if (!journeyModules.length) return [];

  const journeyData : JourneyModuleWithAnns[] = [];
  const flatAnns = getFlatAnns(allAnns, tour);

  const firstAnns: IAnnotationConfigWithLocation[] = [];
  journeyModules.forEach(module => {
    const firstAnnId = module.main.split('/')[1];
    firstAnns.push(flatAnns[firstAnnId]);
  });

  firstAnns.forEach((firstAnn, index) => {
    const annsInOrder = getOrderedAnnsFromGivenAnn(firstAnn, flatAnns);
    const flow: JourneyModuleWithAnns = {
      ...journeyModules[index],
      annsInOrder
    };

    journeyData.push(flow);
  });

  return journeyData;
};

export const getOrderedAnnotaionFromMain = (
  allAnns: AnnotationPerScreen[],
  main: string
) : IAnnotationConfigWithLocation[] => {
  const flatAnns = getFlatAnns(allAnns);
  const firstAnnId = main.split('/')[1];
  const firstAnn = flatAnns[firstAnnId];

  const annsInOrder = getOrderedAnnsFromGivenAnn(firstAnn, flatAnns);
  return annsInOrder;
};

export const updateAllAnnotationsForTour = (
  allAnnotationForTour: AnnotationPerScreen[],
): AnnotationPerScreen[] => {
  const newAllAnnotationForTour = [...allAnnotationForTour];
  newAllAnnotationForTour.forEach((screen) => {
    screen.annotations.forEach((annotation) => {
      if (annotation.type === 'default') {
        annotation.hideAnnotation = true;
        annotation.isHotspot = true;
      }
    });
  });

  return newAllAnnotationForTour;
};

const prefillLeadForm = (
  queryParams: Record<string, string>,
  annotation: IAnnotationConfig
): void => {
  if (annotation.isLeadFormPresent) {
    const domParser = new DOMParser();
    const dom = domParser.parseFromString(annotation.bodyContent, 'text/html');
    const inputEls = Array.from(dom.getElementsByTagName('input'));

    inputEls.forEach(el => {
      const leadFormField = el.getAttribute(FABLE_LEAD_FORM_FIELD_NAME);
      if (leadFormField && queryParams[leadFormField]) {
        el.setAttribute('value', queryParams[leadFormField]);
        el.disabled = true;
        annotation.bodyContent = dom.body.innerHTML;
      }
    });
  }
};

export const fillLeadFormForAllAnnotationsForTour = (
  allAnnotationForTour: AnnotationPerScreen[],
  queryParams: Record<string, string>,
): AnnotationPerScreen[] => {
  const newAllAnnotationForTour = [...allAnnotationForTour];

  newAllAnnotationForTour.forEach((screen) => {
    screen.annotations.forEach((annotation) => {
      prefillLeadForm(queryParams, annotation);
    });
  });

  return newAllAnnotationForTour;
};

export const updateAllAnnotations = (
  allAnnotations: Record<string, IAnnotationConfig[]>
): Record<string, IAnnotationConfig[]> => {
  Object.keys(allAnnotations).forEach(screen => {
    allAnnotations[screen].forEach((annotation) => {
      if (annotation.type === 'default') {
        annotation.hideAnnotation = true;
        annotation.isHotspot = true;
      }
    });
  });
  return allAnnotations;
};

export const fillLeadFormForAllAnnotations = (
  allAnnotations: Record<string, IAnnotationConfig[]>,
  queryParams: Record<string, string>,
): Record<string, IAnnotationConfig[]> => {
  Object.keys(allAnnotations).forEach(screen => {
    allAnnotations[screen].forEach((annotation) => {
      prefillLeadForm(queryParams, annotation);
    });
  });

  return allAnnotations;
};

export function getPersVarsDataFromQueryParams(params: URLSearchParams): {
  text: Record<string, string>,
  dataset: ParsedQueryResult,
} {
  const queryParams: Record<string, string> = {};
  params.forEach((v, k) => queryParams[k] = v);

  const textPersVarsMap = generatePersTextVarMap(queryParams);
  const datasetParams = extractDatasetParams(params);

  return {
    text: textPersVarsMap,
    dataset: datasetParams,
  };
}

export function generatePersTextVarMap(params: Record<string, string>): Record<string, string> {
  const newObj: Record<string, string> = {};
  const prefix = 'v_';
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      if (key.startsWith(prefix)) {
        const newKey = key.slice(prefix.length);
        newObj[newKey] = params[key];
      }
    }
  }

  return newObj;
}

export function replaceVarsInAnnotation(
  annotation: IAnnotationOriginConfig,
  varMap: Record<string, any>
): void {
  const bodyContentTemplate = Handlebars.compile(annotation.bodyContent);
  const displayTextTemplate = Handlebars.compile(annotation.displayText);
  annotation.bodyContent = bodyContentTemplate(varMap);
  annotation.displayText = displayTextTemplate(varMap);
}

export function extractHandlebarsFromAnnotations(
  text: string,
): string[] {
  const variableRegex = /(?<!\\){{(.*?)}}/g;
  const variableArray: string[] = [];

  let match;
  while ((match = variableRegex.exec(text)) !== null) {
    const variableName = match[1].trim();
    if (!variableArray.includes(variableName)) {
      variableArray.push(variableName);
    }
  }

  return variableArray;
}

export function extractDSAndNormalHandlebarsFromText(
  text: string
): PerVarData {
  const handleBars = extractHandlebarsFromAnnotations(text);
  const variables: PerVarData = {};

  handleBars.forEach(handlebar => {
    if (handlebar.includes('.')) {
      const rootVariable = handlebar.split('.')[0];
      variables[rootVariable] = { type: PerVarType.DATASET, val: '' };
    } else {
      variables[handlebar] = { type: PerVarType.TEXT, val: '' };
    }
  });

  return variables;
}

export function removeDuplicatesByKey<T, K extends keyof T>(
  arr: T[],
  key: K
): T[] {
  const seen = new Set<T[K]>();
  return arr.filter((item) => {
    const keyValue = item[key];
    if (!seen.has(keyValue)) {
      seen.add(keyValue);
      return true;
    }
    return false;
  });
}

export function getPersVarsFromAnnotations(annsPerScreen: Record<string, IAnnotationConfig[]>): PerVarData {
  const perVarData: PerVarData = {};

  Object.values(annsPerScreen).forEach(anns => {
    anns.forEach(ann => {
      const perVars = extractDSAndNormalHandlebarsFromText(ann.displayText);
      Object.keys(perVars).forEach(key => perVarData[key] = perVars[key]);
    });
  });

  return perVarData;
}

export function getPersVarsFromEdits(edits: EditItem[]): PerVarData {
  const perVarData: PerVarData = {};

  edits.forEach(edit => {
    if (edit[IdxEditItem.TYPE] === ElEditType.Text) {
      const textEdit = edit[IdxEditItem.ENCODING] as EncodingTypeText;
      const newValueOfTextEdit = textEdit[IdxEncodingTypeText.NEW_VALUE];
      const perVars = extractDSAndNormalHandlebarsFromText(newValueOfTextEdit || '');
      Object.keys(perVars).forEach(key => perVarData[key] = perVars[key]);
    }
  });
  return perVarData;
}

export function removeDuplicatesFromStrArr(arr1: string[]): string[] {
  const mergedSet = new Set([...arr1]);
  return Array.from(mergedSet);
}

export function getPersVarsDataFromLS(): LSSavedPersVarData[] | null {
  const localStoreVal = localStorage.getItem(FABLE_PERS_VARS_FOR_TOUR) as string;
  if (!localStoreVal) return null;

  const allPerVals: LSSavedPersVarData[] = JSON.parse(localStoreVal);

  allPerVals.forEach(perVal => {
    Object.keys(perVal.perVars).forEach(key => {
      const val = (perVal.perVars as any)[key];
      if (typeof val === 'string') {
        perVal.perVars[key] = {
          type: PerVarType.TEXT,
          val,
        };
      }
    });
  });

  return allPerVals;
}

export function getPrefilledPerVarsFromLS(perVars: PerVarData, demoRid: string): PerVarData {
  const perVarsRecord: PerVarData = {};
  Object.keys(perVars)
    .forEach(key => perVarsRecord[key] = { type: perVars[key].type, val: perVars[key].val || '' });

  const allPerVals = getPersVarsDataFromLS();
  if (!allPerVals) return perVarsRecord;

  const persVarsForDemoRid = allPerVals.find(obj => obj.rid === demoRid);

  if (!persVarsForDemoRid) return perVarsRecord;

  Object.keys(perVarsRecord).forEach(key => {
    const savedData = persVarsForDemoRid.perVars[key];
    if (savedData) perVarsRecord[key] = savedData;
  });

  return perVarsRecord;
}

export function setPersValuesInLS(perVars: PerVarData, demoRid: string): void {
  const savedLSData = getPersVarsDataFromLS();
  const allPerVals: LSSavedPersVarData[] = savedLSData || [];

  const persVarsForDemoRid = allPerVals.find(obj => obj.rid === demoRid);
  if (persVarsForDemoRid) {
    allPerVals.forEach(obj => {
      if (obj.rid === demoRid) {
        obj.perVars = perVars;
      }
    });
    localStorage.setItem(FABLE_PERS_VARS_FOR_TOUR, JSON.stringify(allPerVals));
    return;
  }

  if (allPerVals.length >= 10) {
    allPerVals.shift();
  }

  allPerVals.push({ rid: demoRid, perVars });

  localStorage.setItem(FABLE_PERS_VARS_FOR_TOUR, JSON.stringify(allPerVals));
}

export function getAnnTextEditorErrors(perVars: string[]): string[] {
  const errors: string[] = [];
  const validPattern = /^[a-zA-Z0-9_.]+$/;

  perVars.forEach(key => {
    if (!validPattern.test(key)) {
      errors.push(
        `"${key}" is not a valid variable name because it contains characters other than alphabets, numbers, and underscore '_'`
      );
    }
  });

  return errors;
}

export function recordToQueryParams(searchParams: Record<string, string>, query: string = ''): string {
  const querySearchParams = new URLSearchParams(query);

  Object.keys(searchParams).forEach(key => {
    querySearchParams.set(key, searchParams[key]);
  });
  return querySearchParams.toString();
}

export function processPersVarsObj(
  persVars: PerVarData
): PerVarData {
  const processedPersVar: PerVarData = {};

  Object.keys(persVars).forEach(name => {
    const item = persVars[name];
    let key = `v_${name}`;
    if (item.type === PerVarType.DATASET) key = `fv_${name}`;
    processedPersVar[key] = { type: item.type, val: item.val };
  });
  return processedPersVar;
}
export const getSearchParamData = (param: string | null) : queryData | null => {
  if (!param) {
    return null;
  }
  const decodedQuery = window.atob(decodeURIComponent(param));
  const query = JSON.parse(decodedQuery);
  return query;
};

type DebounceFunction<T extends any[]> = (...args: T) => void;

export function debounce<T extends any[]>(
  func: DebounceFunction<T>,
  delay: number
): DebounceFunction<T> {
  let timeout: NodeJS.Timeout | null;

  return function (...args: T) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    clearTimeout(timeout as NodeJS.Timeout);
    timeout = setTimeout(later, delay);
  };
}

export const isTourMainValid = (main: string | null | undefined, allAnns: AnnotationPerScreen[]): boolean => {
  if (main) {
    const [screenId, annId] = main.split('/');
    const annWithScreenId = getAnnotationByRefId(annId, allAnns);
    if (annWithScreenId && annWithScreenId.screenId === +screenId) {
      return true;
    }
  }
  return false;
};

export const getTourMainValidity = (
  tourOpts: ITourDataOpts | null,
  journey: JourneyData | null,
  allAnnotationsForTour: AnnotationPerScreen[],
): TourMainValidity => {
  let tourMainValidity: TourMainValidity = TourMainValidity.Valid;

  if (journey && journey.flows.length !== 0) {
    journey.flows.forEach(flow => {
      if (!isTourMainValid(flow.main, allAnnotationsForTour)) {
        tourMainValidity = TourMainValidity.Journey_Main_Not_Present;
      }
    });
  } else if (!tourOpts || !tourOpts.main) {
    tourMainValidity = TourMainValidity.Main_Not_Set;
  } else if (!isTourMainValid(tourOpts.main, allAnnotationsForTour)) {
    tourMainValidity = TourMainValidity.Main_Not_Present;
  }

  return tourMainValidity;
};

export function rearrangeArray<T>(arr: T[], sourceIdx: number, destinationIdx: number): T[] {
  const newArr = [...arr];
  const [removed] = newArr.splice(sourceIdx, 1);
  newArr.splice(destinationIdx, 0, removed);
  return newArr;
}

export function mergeL1JsonIgnoreUndefined(obj1: Record<string, any>, obj2: Record<string, any>) {
  const obj3: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj1)) {
    obj3[key] = value;
  }

  for (const [key, value] of Object.entries(obj2)) {
    if (key in obj3 && (value === undefined || value === null)) continue;
    obj3[key] = value;
  }

  return obj3;
}

export function getAllOrderedAnnotationsInTour(
  allAnnotationsForTour: AnnotationPerScreen[],
  journey: JourneyData | null,
  main: string
): IAnnotationConfigWithScreenId[] {
  let annotationsInTour: IAnnotationConfigWithScreenId[] = [];
  if (journey && journey.flows && journey.flows.length !== 0) {
    journey.flows.forEach((flow) => {
      const annsForFlow = getOrderedAnnotaionFromMain(allAnnotationsForTour, flow.main);
      annotationsInTour = [...annotationsInTour, ...annsForFlow];
    });
  } else {
    annotationsInTour = getOrderedAnnotaionFromMain(allAnnotationsForTour, main);
  }
  return annotationsInTour;
}

export function preloadImagesInTour(
  allAnnotationsForTour: AnnotationPerScreen[],
  journey: JourneyData | null,
  main: string
) :void {
  const annotationsInTour: IAnnotationConfigWithScreenId[] = getAllOrderedAnnotationsInTour(
    allAnnotationsForTour,
    journey,
    main
  );

  annotationsInTour.forEach((ann) => {
    const domParser = new DOMParser();
    const dom = domParser.parseFromString(ann.bodyContent, 'text/html');
    const imgSrcs = Array.from(dom.querySelectorAll('img')).map(img => img.src);
    imgSrcs.forEach((img) => {
      const link = document.createElement('link');
      link.as = 'image';
      link.rel = 'preload';
      link.href = img;
      document.head.appendChild(link);
    });
  });
}

export function getDefaultSiteData(tour: RespDemoEntity, globalOpts: IGlobalConfig): SiteData {
  return {
    logo: createGlobalProperty(globalOpts.logo, GlobalPropsPath.logo),
    navLink: createGlobalProperty(globalOpts.companyUrl, GlobalPropsPath.companyUrl),
    title: tour.displayName,
    ctaText: createGlobalProperty(globalOpts.customBtn1Text, GlobalPropsPath.customBtn1Text),
    ctaLink: createGlobalProperty(globalOpts.customBtn1URL, GlobalPropsPath.customBtn1URL),
    themePreset: 'white',
    bg1: SiteThemePresets.white.bg1,
    bg2: SiteThemePresets.white.bg2,
    headerBg: 'auto',
    v: 1,
  };
}

const displayBlockStr = ';display:block';
const visibilityVisibleStr = ';visibility:visible';
const opacityOneStr = ';opacity:1';

export const makeVisibleAllParentsInHierarchy = (element: HTMLElement): HiddenEls => {
  let parent: HTMLElement | null = element;
  const displayNoneEls: HTMLElement[] = [];
  const visibilityHiddenEls: HTMLElement[] = [];
  const opacityZeroEls: HTMLElement[] = [];
  while (parent) {
    const computedStyle = getComputedStyle(parent);
    if (computedStyle.display === 'none') {
      addInlineStyle(parent, displayBlockStr);
      displayNoneEls.push(parent);
    }
    if (computedStyle.visibility === 'hidden') {
      addInlineStyle(parent, visibilityVisibleStr);
      visibilityHiddenEls.push(parent);
    }
    if (computedStyle.opacity === '0') {
      addInlineStyle(parent, opacityOneStr);
      opacityZeroEls.push(parent);
    }
    parent = parent.parentElement;
  }
  return { displayNoneEls, visibilityHiddenEls, opacityZeroEls };
};

export const undoMakeVisibleAllParentsInHierarchy = (hiddenEls: HiddenEls): void => {
  hiddenEls.opacityZeroEls.forEach(el => removeInlineStyle(el, opacityOneStr));
  hiddenEls.visibilityHiddenEls.forEach(el => removeInlineStyle(el, visibilityVisibleStr));
  hiddenEls.displayNoneEls.forEach(el => removeInlineStyle(el, displayBlockStr));
};

function removeLastNCharacters(str: string, n: number): string {
  return str.substring(0, str.length - n);
}

function addInlineStyle(el: HTMLElement, style: string): void {
  el.setAttribute('style', `${el.getAttribute('style')}${style}`);
}

function removeInlineStyle(el: HTMLElement, style: string): void {
  const styleAttrVal = el.getAttribute('style') || '';
  if (styleAttrVal.endsWith(style)) {
    el.setAttribute('style', removeLastNCharacters(styleAttrVal, style.length));
  }
}
export const isTourResponsive = (tour: P_RespTour): boolean => {
  const res = tour.responsive2 === Responsiveness.Responsive;
  return res;
};

export function getMobileOperatingSystem(): 'Windows Phone' | 'Android' | 'iOS' | 'unknown' {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return 'Windows Phone';
  }

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }

  return 'unknown';
}

// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser/11381730#11381730
export function isMobileOperatingSystem() : boolean {
  let check = false;
  // eslint-disable-next-line no-useless-escape
  (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; }(navigator.userAgent || navigator.vendor || (window as any).opera));
  return check;
}

export const isLandscapeMode = (screenOrientation: OrientationType): boolean => {
  const isLandscape = screenOrientation === 'landscape-primary' || screenOrientation === 'landscape-secondary';
  return isLandscape;
};

function checkFeatureAvailable(test: PlanDetail['test'], value: PlanDetail['value'], currentValue?: number): boolean {
  if (test === 'switch') {
    if (value === 'on') {
      return true;
    }
    return false;
  }
  if (test === 'text') {
    if (typeof value !== 'object' || value.length === 0) {
      return false;
    }

    if (AnalyticsValue.includes(value[0])) {
      if (value.includes('advanced')) {
        return true;
      }
      return false;
    }

    if (AnnotationValue.includes(value[0])) {
      if (value.includes('video')) {
        return true;
      }
      return false;
    }
  }
  if (test === 'count' && currentValue) {
    const operator = value.slice(0, 2) as string;
    const number = value.slice(2) as string;
    const numInInt = parseInt(number, 10);
    if (operator === '<=') {
      return currentValue <= numInInt;
    } if (operator === '>=') {
      return currentValue >= numInInt;
    }
  }
  return true;
}

export const fallbackFeatureAvailability : FeatureAvailability = {
  isInBeta: false,
  isAvailable: true,
  requireAccess: false,
};

export const isFeatureAvailable = (
  featureForPlan: FeatureForPlan | null,
  feature: string,
  currentValue?: number
): FeatureAvailability => {
  if (!featureForPlan) {
    return fallbackFeatureAvailability;
  }
  const featureDetail = featureForPlan[feature];

  if (!featureDetail) {
    const err : Error = {
      name: 'feature gate failed',
      message: `plan ${feature} not available`
    };
    raiseDeferredError(err);
    return fallbackFeatureAvailability;
  }
  const isAvailable = checkFeatureAvailable(featureDetail.test, featureDetail.value, currentValue);
  const isInBeta = featureDetail.isInBeta;
  const requireAccess = featureDetail.requireAccess;
  return { isAvailable, isInBeta, requireAccess };
};

export const mapPlanIdAndIntervals = (
  chosenPlan: 'solo' | 'startup' | 'business' | 'lifetime',
  chosenInterval: 'annual' | 'monthly' | 'lifetime',
): {
  plan: PaymentTermsPlan | null,
  interval: PaymentTermsInterval | null,
} => {
  let plan: PaymentTermsPlan | null = null;
  switch (chosenPlan.toUpperCase()) {
    case 'SOLO':
      plan = PaymentTermsPlan.SOLO;
      break;
    case 'STARTUP':
      plan = PaymentTermsPlan.STARTUP;
      break;

    case 'BUSINESS':
      plan = PaymentTermsPlan.BUSINESS;
      break;

    case 'LIFETIME':
      // just a placeholder for api compatibility. license is used to determine the plan (or tier)
      plan = PaymentTermsPlan.LIFETIME_TIER1;
      break;

    default:
      plan = null;
      break;
  }

  let interval: PaymentTermsInterval | null = null;
  switch (chosenInterval.toUpperCase()) {
    case 'ANNUAL':
      interval = PaymentTermsInterval.YEARLY;
      break;

    case 'MONTHLY':
      interval = PaymentTermsInterval.MONTHLY;
      break;

    case 'LIFETIME':
      interval = PaymentTermsInterval.LIFETIME;
      break;

    default:
      interval = null;
      break;
  }

  return {
    plan,
    interval,
  };
};

export const isEventValid = (e: MessageEvent) : boolean => e.data && e.data.type;

export const isSafari = (): boolean => {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
};

export const getIsMobileSize = (): boolean => {
  if (window.innerWidth <= RESP_MOBILE_SRN_WIDTH_LIMIT) {
    return true;
  }
  return false;
};

// export const captureScreenEditor = (x1:number, y1:number, width:number, height:number)
//   :Promise<null | string> => new Promise((resolve) => {
//   if (typeof chrome === 'undefined' || !chrome.runtime) resolve(null);
//   const dpr = window.devicePixelRatio || 1;
//   chrome.runtime.sendMessage(
//     EXTENSION_ID,
//     { sender: 'fable' },
//     (response) => {
//       if (response && response.data) {
//         const img = new Image();
//         img.onload = () => {
//           const canvas = document.createElement('canvas');
//           canvas.width = width * dpr;
//           canvas.height = height * dpr;
//           const ctx = canvas.getContext('2d');
//           ctx!.drawImage(img, x1 * dpr, y1 * dpr, width * dpr, height * dpr, 0, 0, width * dpr, height * dpr);
//           const dataURL = canvas.toDataURL('image/png');
//           canvas.remove();
//           resolve(dataURL);
//         };

//         img.src = response.data;
//       }
//       if (chrome.runtime.lastError) resolve(null);
//     }
//   );
// });

export function addPointerEventsAutoToEl(el: HTMLElement): void {
  const styleAttrValue = el.getAttribute('style') || '';
  const stylesToOverride = '; pointer-events: auto !important;';
  el.setAttribute('style', `${styleAttrValue}${stylesToOverride}`);
}

export function shouldReduceMotionForMobile(opts: ITourDataOpts | null):boolean {
  return Boolean(isMobileOperatingSystem() && opts && opts.reduceMotionForMobile);
}

export const isGlobalProperty = <T>(value: Property<T>): boolean => value.type === PropertyType.REF;
export const getSampleDemoHubConfig = (): IDemoHubConfig => ({
  v: 1,
  lastUpdatedAt: getCurrentUtcUnixTime(),
  logo: createGlobalProperty('https://s3.amazonaws.com/app.sharefable.com/favicon.png', GlobalPropsPath.logo),
  companyName: createLiteralProperty('Fable'),
  fontFamily: createGlobalProperty('', GlobalPropsPath.fontFamily),
  baseFontSize: 16,
  cta: [
    {
      text: createGlobalProperty('See all demos', GlobalPropsPath.customBtn1Text),
      id: 'see-all-demos',
      iconPlacement: 'left',
      deletable: false,
      __linkType: 'open_ext_url',
      link: createGlobalProperty('./see-all-demos', GlobalPropsPath.customBtn1URL),
      __definedBy: 'system',
      type: createGlobalProperty('primary', GlobalPropsPath.customBtn1Style),
      style: {
        bgColorProp: createGlobalProperty('#e0e1dd', GlobalPropsPath.primaryColor),
        fontColor: '#0d1b2a',
        borderRadius: 24
      }
    },
    {
      text: createGlobalProperty('Book a demo', GlobalPropsPath.customBtn1Style),
      id: 'book-a-demo',
      iconPlacement: 'left',
      deletable: true,
      __linkType: 'open_ext_url',
      link: createGlobalProperty('https://www.sharefable.com/get-a-demo?ref=dh_others', GlobalPropsPath.customBtn1URL),
      __definedBy: 'system',
      type: createGlobalProperty('primary', GlobalPropsPath.customBtn1Style),
      style: {
        bgColorProp: createGlobalProperty('#e0e1dd', GlobalPropsPath.primaryColor),
        fontColor: '#0d1b2a',
        borderRadius: 24
      }
    }
  ],
  see_all_page: {
    header: {
      title: 'Demo hub name',
      style: {
        bgColor: '#1b263b',
        fontColor: '#f7f7f7'
      },
      ctas: [
        'book-a-demo'
      ]
    },
    body: {
      text: '',
      style: {
        bgColor: '#ffffff',
        fontColor: '#000000'
      }
    },
    sections: [
      {
        ...getSampleDemoHubSeeAllPageSectionConfig(1),
        title: 'Collection of some amazing demos',
        slug: 'collection-of-some-amazing-demos',
      },
      {
        ...getSampleDemoHubSeeAllPageSectionConfig(1),
        title: 'Second collection of amazing demos',
        slug: 'second-collection-of-amazing demos',
      }
    ],
    demoCardStyles: {
      card: {
        bgColor: '#ffffff',
        borderColor: '#ffffff00',
        fontColor: '#0A0A0A',
        borderRadius: 4
      },
      cta: {
        style: {
          bgColor: '#ffffff',
          fontColor: '#0A0A0A',
          borderRadius: 4,
        },
        text: 'Start tour'
      }
    },
    demoModalStyles: {
      overlay: {
        bgColor: '#ffffff80',
      },
      body: {
        bgColor: '#f5f5f5',
        borderColor: '#1b263b',
        fontColor: '#000000',
        borderRadius: 4
      }
    },
    leadForm: {
      showLeadForm: false,
      skipLeadForm: false,
      continueCTA: {
        style: {
          bgColor: '#f5f5f5',
          fontColor: '#000000',
          borderRadius: 4
        },
        text: 'Continue'
      }
    }
  },
  qualification_page: {
    header: {
      title: 'Choose your experience',
      style: {
        bgColor: '#1b263b',
        fontColor: '#f7f7f7'
      },
      ctas: [
        'see-all-demos',
        'book-a-demo'
      ]
    },

    body: {
      text: '',
      style: {
        bgColor: '#ffffff',
        fontColor: '#000000',
      }
    },
    qualifications: [],
  },
  leadform: {
    primaryKey: 'email',
    bodyContent: '',
    displayText: '',
  },
  customScripts: '',
  customStyles: ''
});

export const getSampleSimpleStyle = (): SimpleStyle => ({
  bgColor: '#ffffff',
  borderColor: '#d4d4d400',
  fontColor: '#000000',
  borderRadius: 4,
});

export const getSampleCTASimpleStyle = (globalConfig : IGlobalConfig): IDemoHubConfigCta['style'] => ({
  bgColorProp: createGlobalProperty(
    compileValue(globalConfig, GlobalPropsPath.primaryColor),
    GlobalPropsPath.primaryColor
  ),
  fontColor: '#0d1b2a',
  borderRadius: 24
});

export interface CTAPrevConfig {
  fontColor: string;
  borderRadius: number;
}
export const getSampleDemoHubConfigCta = (prevConfig: CTAPrevConfig, globalConfig : IGlobalConfig): IDemoHubConfigCta => ({
  text: createGlobalProperty(
    compileValue(globalConfig, GlobalPropsPath.customBtn1Text),
    GlobalPropsPath.customBtn1Text
  ),
  id: nanoid(),
  // icon?: Icon;
  deletable: true,
  iconPlacement: 'left',
  __linkType: 'open_ext_url',
  link: createGlobalProperty(
    compileValue(globalConfig, GlobalPropsPath.customBtn1URL),
    GlobalPropsPath.customBtn1URL
  ),
  __definedBy: 'user',
  type: createGlobalProperty(
    compileValue(globalConfig, GlobalPropsPath.customBtn1Style),
    GlobalPropsPath.customBtn1Style
  ),
  style: { ...getSampleCTASimpleStyle(globalConfig), ...prevConfig },
});

export const getSampleDemoHubSeeAllPageSectionConfig = (idx: number): IDemoHubConfigSeeAllPageSection => ({
  title: `A new section ${idx}`,
  slug: `a-new-section-${idx}`,
  desc: 'This is a placeholder description which is shown above the collection of demos. You can change this text in the side panel on the left. Leave it empty to delete the description field.',
  demos: [],
  id: nanoid(),
});

export const getSampleDemoHubQualificationSidePanel = (): DemoHubQualificationSidePanel => {
  const res = {
    conStyle: getSampleSimpleStyle(),
    cardStyle: {
      ...getSampleSimpleStyle(),
      bgColor: '#415a77',
      borderColor: '#f6f6f600',
      fontColor: '#ffffff'
    },
  };

  return res;
};

export const getSampleDemoHubQualification = (
  sidePanel: DemoHubQualificationSidePanel,
  idx: number
): IDemoHubConfigQualification => ({
  id: nanoid(),
  __type: 'simple_linear',
  title: `Choose your experience ${idx}`,
  slug: `choose-your-experience-${idx}`,
  sidePanel,
  qualificationEndCTA: ['book-a-demo'],
  entries: [],
});

interface SampleEntryConfig {
  style: SimpleStyle;
  continueCtaStyle: { borderRadius: number, fontColor: string; };
  skipCtaStyle: { borderRadius: number, fontColor: string; };
}

export const getSampleSelectEntry = (
  type: 'single-select' | 'multi-select',
  idx: number,
  prevConfig: SampleEntryConfig,
): SelectEntry => ({
  id: nanoid(),
  type,
  __ops: 'or',
  options: [getSampleSelectEntryOption(1)],
  title: `What's your role in company? ${idx}`,
  slug: `whats-your-role-in-company-${idx}`,
  desc: 'This section is auto generated for you. Use the editor on the left to edit the content.',
  style: prevConfig.style,
  continueCTA: {
    text: 'Continue',
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: 'continue',
    // icon?: Icon;
    iconPlacement: 'left',
    __linkType: 'continue_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system',
    type: 'primary',
    style: prevConfig.continueCtaStyle,
  },
  // If skip button is not present then this is undefined
  // STANDARD-CLASS-NAME `cta-$skip`
  skipCTA: {
    text: 'Skip',
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: 'skip',
    // icon?: Icon,
    iconPlacement: 'left',
    __linkType: 'skip_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system',
    type: 'primary',
    style: prevConfig.skipCtaStyle,
  },
  showSkipCta: false,
});

export const getSampleBaseEntry = (
  type: 'text-entry' | 'leadform-entry',
  idx: number,
  prevConfig: SampleEntryConfig,
): TextEntry | LeadFormEntry => ({
  id: nanoid(),
  title: `Sample Step Title ${idx}`,
  slug: `sample-step-title-${idx}`,
  desc: 'Write a brief description of what your viewer should expect from this particular step of your demo hub.',
  style: prevConfig.style,
  type,
  continueCTA: {
    text: 'Continue',
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: 'continue',
    // icon?: Icon;
    iconPlacement: 'left',
    __linkType: 'continue_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system',
    type: 'primary',
    style: prevConfig.continueCtaStyle,
  },
  // If skip button is not present then this is undefined
  // STANDARD-CLASS-NAME `cta-$skip`
  skipCTA: {
    text: 'Skip',
    // this id is an derived fields from title.
    // Ideally id = text.replace(/\W+/, '-')
    // If this id changes reference to this cta will also be updated
    id: 'skip',
    // icon?: Icon,
    iconPlacement: 'left',
    __linkType: 'skip_qualifcation_criteria',
    // by default fable adds two cta 1. See all demos & 2. Book a demo
    // Those are 'system' defined
    __definedBy: 'system',
    type: 'primary',
    style: prevConfig.skipCtaStyle,
  },
  showSkipCta: false,
});

export const getSampleSelectEntryOption = (idx: number): SelectEntryOption => ({
  id: nanoid(),
  title: `This is an option ${idx}`,
  desc: 'Edit this action from the left side bar',
  demos: []
});

export const getOrCreateDemoHubStyleEl = (customStyles: string) : void => {
  let styleEl = document.getElementById('fable-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'fable-styles';
    document.head.append(styleEl);
  }
  styleEl.textContent = customStyles;
};

const isValidScript = (scriptContent : string) : boolean => {
  try {
    // eslint-disable-next-line no-new, no-new-func
    new Function(scriptContent);
    return true;
  } catch (e) {
    return false;
  }
};

export const getorCreateDemoHubScriptEl = (customScripts : string) : void => {
  let scriptWrapperEl = document.getElementById('fable-script');
  if (!scriptWrapperEl) {
    scriptWrapperEl = document.createElement('div');
    scriptWrapperEl.id = 'fable-script';
    document.body.append(scriptWrapperEl);
  }
  scriptWrapperEl.style.display = 'none';
  scriptWrapperEl.innerHTML = customScripts;
  let scriptContainer = document.getElementById('fable-script-container');
  if (!scriptContainer) {
    scriptContainer = document.createElement('div');
    scriptContainer.id = 'fable-script-container';
    document.body.append(scriptContainer);
  }
  scriptContainer.innerHTML = '';
  scriptContainer.style.display = 'none';
  const scripts = Array.from(scriptWrapperEl.getElementsByTagName('script'));

  for (const script of scripts) {
    const scriptContent = script.src ? `src="${script.src}"` : script.textContent;

    if (isValidScript(scriptContent as string)) {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      scriptContainer.appendChild(newScript);
    }
  }
};

export const getFirstDemoOfDemoHub = (demoHubConfig: IDemoHubConfig): IDemoHubConfigDemo | null => {
  const seeAllPageSections = demoHubConfig.see_all_page.sections;

  for (const section of seeAllPageSections) {
    if (section.demos.length) {
      return section.demos[0];
    }
  }

  const qualifications = demoHubConfig.qualification_page.qualifications;
  for (const qualification of qualifications) {
    const entries = qualification.entries
      .filter(entry => entry.type === 'single-select' || entry.type === 'multi-select');

    for (const entry of entries) {
      for (const option of (entry as SelectEntry).options) {
        const demos = option.demos;
        if (demos.length) {
          return demos[0];
        }
      }
    }
  }

  return null;
};

export function objectToSearchParams(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.keys(obj).forEach(key => {
    params.append(key, obj[key]);
  });
  return params.toString();
}

export function findQualificationToBeUpdatedIdx(config : IDemoHubConfig, findId : string) : number {
  return config
    .qualification_page
    .qualifications
    .findIndex(q => q.id === findId);
}

export function findEntryToBeUpdatedIdx(
  config : IDemoHubConfig,
  entryId : string,
  qualificationToBeUpdatedIdx : number
) : number {
  return config
    .qualification_page
    .qualifications[qualificationToBeUpdatedIdx]
    .entries
    .findIndex(entry => entry.id === entryId);
}

export function findOptionToBeUpdatedIdx(
  config : IDemoHubConfig,
  optionId : string,
  qualificationToBeUpdatedIdx : number,
  entryToBeUpdatedIdx : number

) : number {
  return (config
    .qualification_page
    .qualifications[qualificationToBeUpdatedIdx]
    .entries[entryToBeUpdatedIdx] as SelectEntry)
    .options
    .findIndex(option => option.id === optionId);
}

export function getAllDemoRidForSection(
  sections: IDemoHubConfigSeeAllPageSection[]
) : {sectionSlug : string, rid : string}[] {
  const rids : {sectionSlug : string, rid : string}[] = [];
  sections.forEach(section => {
    section.demos.forEach(demo => {
      rids.push({ sectionSlug: section.slug, rid: demo.rid });
    });
  });
  return rids;
}

interface FlowWithLastMandatory extends JourneyFlow{
  lastMandatory: number
}

interface JourneyWithLastMandatory extends JourneyData {
  flows: FlowWithLastMandatory[]
}

export function getProcessedJourney(journey : JourneyData) : JourneyWithLastMandatory {
  const flows = journey.flows;
  let lastMandatory = -1;
  (flows as FlowWithLastMandatory[]).forEach((flow, idx) => {
    flow.lastMandatory = lastMandatory;
    if (flow.mandatory) {
      lastMandatory = idx;
    }
  });

  const updatedJourney: JourneyWithLastMandatory = { ...journey, flows: flows as FlowWithLastMandatory[] };
  return (updatedJourney);
}

interface FrameSettingItem {
  title: string;
  value: FrameSettings;
  key: keyof typeof FrameSettings;
}

export const FrameSettingsArray : FrameSettingItem[] = [
  {
    title: 'Light',
    value: FrameSettings.LIGHT,
    key: 'LIGHT'
  }, {
    title: 'Dark',
    value: FrameSettings.DARK,
    key: 'DARK'
  }, {
    title: 'No Frame',
    value: FrameSettings.NOFRAME,
    key: 'NOFRAME'
  },
];

export const isFrameSettingsValidValue = (str: string): FrameSettings | null => {
  const item = FrameSettingsArray.find(el => el.value.toLowerCase() === str.toLowerCase());
  return item ? item.value : null;
};

export const MAC_FRAME_HEIGHT = 36;
export function combineAllEdits(
  allEdits: EditItem[]
) : EditItem[] {
  const hm2: Record<string, EditItem> = {};
  for (const edit of allEdits) {
    const key = edit[IdxEditItem.KEY];
    if (key in hm2) {
      if (
        !hm2[key][IdxEditItem.IS_GLOBAL_EDIT] && edit[IdxEditItem.IS_GLOBAL_EDIT]
      ) {
        hm2[key] = edit;
      }
      if (hm2[key][IdxEditItem.TIMESTAMP] < edit[IdxEditItem.TIMESTAMP]) {
        hm2[key] = edit;
      }
    } else {
      hm2[key] = edit;
    }
  }

  const combinedEdits = Object.values(hm2).sort((m, n) => m[IdxEditItem.TIMESTAMP] - n[IdxEditItem.TIMESTAMP]);
  return combinedEdits;
}

export function processGlobalEditsWithElpath(root: SerNode, globalEdits: EditItem[]) : EditItem[] {
  const fidsToFind: string[] = globalEdits
    .filter(edit => edit[IdxEditItem.FID])
    .map(edit => edit[IdxEditItem.FID]!);

  const fidElPathMap = getSerNodesElPathFromFids(root, fidsToFind);

  const processedGlobalEdits = globalEdits
    .filter(edit => edit[IdxEditItem.FID] && Object.keys(fidElPathMap).includes(edit[IdxEditItem.FID]!))
    .map(edit => {
      const editItem: EditItem = [...edit];
      const res = fidElPathMap[editItem[IdxEditItem.FID]!];
      editItem[IdxEditItem.PATH] = res.elPath;
      return editItem;
    });

  return processedGlobalEdits;
}

export function isTextFidCommentNode(node: SerNode) : boolean {
  if (node.type !== Node.COMMENT_NODE) {
    return false;
  }

  return Boolean(node.props.textContent?.startsWith('textfid/'));
}

export function getSerNodesElPathFromFids(
  root: SerNode,
  fids : string[]
) : Record<string, {elPath: string, serNode: SerNode}> {
  const fidMap: Record<string, {elPath: string, serNode: SerNode}> = {};
  const queue : {node: SerNode, elPath: string, fid: string}[] = [
    { node: root, elPath: '1', fid: root.attrs['f-id'] || nanoid() }
  ];
  while (queue.length > 0) {
    const { node, elPath, fid } = queue.shift()!;
    if (fids.includes(fid)) {
      fidMap[fid] = { elPath, serNode: node };
    }

    if (fids.every(findFid => fidMap[findFid] !== undefined)) {
      return fidMap;
    }

    for (let i = 0; i < node.chldrn.length; i++) {
      const currentNode = node.chldrn[i];

      if (isTextFidCommentNode(currentNode)) {
        continue;
      } else if (currentNode.type === Node.TEXT_NODE) {
        const foundFid = getFidOfSerNode(node.chldrn[i - 1]);
        const newElPath = `${elPath}.${i}`;
        queue.push({
          node: currentNode,
          elPath: newElPath,
          fid: foundFid
        });
      } else {
        queue.push({
          node: currentNode,
          elPath: `${elPath}.${i}`,
          fid: getFidOfSerNode(currentNode)
        });
      }
    }
  }
  return fidMap;
}

export function getSerNodeFidFromElPath(
  root: SerNode,
  elPathToFind: string
): string | undefined {
  const queue : {node: SerNode, elPath: string, fid: string}[] = [
    { node: root, elPath: '1', fid: root.attrs['f-id'] || nanoid() }
  ];
  while (queue.length > 0) {
    const { node, elPath, fid } = queue.shift()!;

    if (elPathToFind === elPath) {
      return fid;
    }

    for (let i = 0; i < node.chldrn.length; i++) {
      const currentNode = node.chldrn[i];

      if (isTextFidCommentNode(currentNode)) {
        continue;
      } else if (currentNode.type === Node.TEXT_NODE) {
        const foundFid = getFidOfSerNode(node.chldrn[i - 1]);
        const newElPath = `${elPath}.${i}`;
        queue.push({
          node: currentNode,
          elPath: newElPath,
          fid: foundFid
        });
      } else {
        queue.push({
          node: currentNode,
          elPath: `${elPath}.${i}`,
          fid: getFidOfSerNode(currentNode)
        });
      }
    }
  }
  return undefined;
}

export const isActiveBusinessPlan = (subs: P_RespSubscription | null):
 boolean => Boolean(subs && subs.status === Status.ACTIVE && subs.paymentPlan === Plan.BUSINESS);

export const isAIParamPresent = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ai') === '1';
};

export const initLLMSurvey = (): void => {
  if (isAIParamPresent()) {
    const surveyDiv = document.createElement('div');
    surveyDiv.id = 'survey-fable';
    document.body.appendChild(surveyDiv);
  }
};

export const initLLMSurveyMinuteAfterTourCreation = (): void => {
  const timer = setTimeout(() => {
    initLLMSurvey();
    clearTimeout(timer);
  }, 60000);
};

export const USE_CASE_DUMMY_DATA = [
  { x: '01-08-2023', y: 42 },
  { x: '02-08-2023', y: 27 },
  { x: '03-08-2023', y: 58 },
  { x: '04-08-2023', y: 33 },
  { x: '05-08-2023', y: 76 },
  { x: '06-08-2023', y: 49 }
];

export const DEMO_TIPS = [
  {
    type: ['marketing'],
    tip: `Think of interactive demos as teasers of a movie. Keep them short and crisp. 
    Ensure you add enough elements that wow your prospects!`
  },
  {
    type: ['marketing'],
    tip: `Do not forget to add relevant CTAs in the demo. 
    These will help catch the attention of your prospects at the right time. `
  },
  {
    type: ['marketing'],
    tip: `Ungated demos tend to work better than gated demos. 
    It is a great idea to add lead forms towards the end of the demo or in the middle of the demo instead.`
  },
  {
    type: ['marketing'],
    tip: `Have a workflow ready even before you create the demo. 
    This will help you come up with a tight knit demo that narrates a story about your product.`
  },
  {
    type: ['sales'],
    tip: `Personalize your demo for each prospect. 
    Even small things such as adding their logo and including their name can make a huge difference. 
    For sales/ marketing: Integrate Fable with slack to get real time alerts about your demo viewers.`
  },
  {
    type: ['sales'],
    tip: `Customize your demo to remove irrelevant information from the screens. 
    With Fable, you can blur/ hide/ remove/ replace any elements on your screen. Give it a try! `
  },
  {
    type: ['sales', 'marketing'],
    tip: `Adding a branded demo loader makes a huge difference. 
    Small steps to showcase the power of your brand matter!  
    For customer success: Embed these interactive guides in your help center and see your support tickets reduce.`
  },
  {
    type: ['customer-success'],
    tip: 'Fable’s interactive guides can help you onboard customers 24*7. Async onboarding is easier than ever. '
  },
  {
    type: ['customer-success'],
    tip: 'You can add audio/video guides to make your interactive demos more compelling. Have you tried them?'
  }
];

export const sendPreviewHeaderClick = (): void => {
  initLLMSurvey();
};

export const getDemoStateFromTourData = (
  tourData: TourData,
  allAnns: AnnotationPerScreen[],
): DemoStateWithAnnRefId[] => {
  const allAnnsInOrder = getAllOrderedAnnotationsInTour(allAnns, tourData.journey, tourData.opts.main);
  const demoState: DemoStateWithAnnRefId[] = [];
  let index = 0;

  for (const annotation of allAnnsInOrder) {
    const nextButton = getAnnotationBtn(annotation as IAnnotationConfig, 'next');
    const nextButtonText = nextButton ? nextButton.text._val : undefined;
    demoState.push({
      id: index,
      text: annotation.displayText,
      nextButtonText,
      annRefId: annotation.refId
    });
    index++;
  }

  return demoState;
};

export const updateTourDataFromLLMRespItems = (
  tourData: TourData,
  demoState: DemoStateWithAnnRefId[],
  items: update_demo_content
): TourData => {
  const newTourData = deepcopy(tourData);
  const demoStateMap = new Map(demoState.map(item => [item.annRefId, item]));
  const itemsMap = new Map(items.items.map(item => [item.id, item]));

  for (const entity of Object.values(newTourData.entities)) {
    if (entity.type === 'screen') {
      const screenEntity = entity as TourScreenEntity;

      for (const annotation of Object.values(screenEntity.annotations)) {
        const updatedAnnContent = demoStateMap.get(annotation.refId);
        if (updatedAnnContent) {
          const annContent = itemsMap.get(updatedAnnContent.id);
          if (annContent) {
            (annotation as IAnnotationConfig).displayText = extractTextFromHTMLString(annContent.richText);
            (annotation as IAnnotationConfig).bodyContent = annContent.richText;
            const nextButton = getAnnotationBtn(annotation as IAnnotationConfig, 'next');
            if (nextButton && annContent.nextButtonText) {
              nextButton.text = createLiteralProperty(annContent.nextButtonText);
            }
          }
        }
      }
    }
  }
  return newTourData;
};

export const updateTourDataToAddVoiceOver = (
  tourData: TourData,
  detail: Map<string, AnnVoiceOverDetail>,
  voiceUsed: string
): TourData => {
  const newTourData = deepcopy(tourData);

  for (const entity of Object.values(newTourData.entities)) {
    if (entity.type === 'screen') {
      const screenEntity = entity as TourScreenEntity;

      for (const ind in (screenEntity.annotations)) {
        if (detail.get(screenEntity.annotations[ind].refId)) {
          const annVoiceOverDetail = detail.get(screenEntity.annotations[ind].refId)!;
          const newAnnConfig = handleAddAnnotationAudio(
            screenEntity.annotations[ind] as IAnnotationConfig,
            annVoiceOverDetail.hls,
            annVoiceOverDetail.webm,
            annVoiceOverDetail.fb.url,
            annVoiceOverDetail.fb.type,
            true
          );
          newAnnConfig.voiceover = {
            voiceUsed,
            updatedAt: getCurrentUtcUnixTime(),
          };

          screenEntity.annotations[ind] = { ...newAnnConfig };
        }
      }
    }
  }
  return newTourData;
};

export const extractTextFromHTMLString = (richText: string | undefined): string => {
  if (!richText) return '';
  const textEl = document.createElement('div');
  textEl.style.position = 'absolute';
  textEl.style.left = '-200vw';
  textEl.innerHTML = richText;
  document.body.appendChild(textEl);
  const annText = textEl.innerText || richText;
  document.body.removeChild(textEl);
  textEl.remove();
  return annText;
};

type LLM_PAYLOAD = PostProcessDemoV1 | ThemeForGuideV1 | CreateNewDemoV1 | RouterForTypeOfDemoCreation | DemoMetadata | UpdateDemoContentV1 | RootRouterReq;

export const handleLlmApi = async (payload: LLM_PAYLOAD) : Promise<ToolUseBlockParam> => {
  const resp = await api<LLM_PAYLOAD, ApiResp<LLMResp>>('/llmops', {
    method: 'POST',
    body: payload,
    isJobEndpoint: true,
    auth: true
  });

  if (!resp) {
    throw new Error('Failed to complete request');
  }
  const toolUse = processToolUseLLMResp(resp.data as LLMResp);

  if (!toolUse.input) {
    throw new Error('response data not found');
  }

  return toolUse;
};

const processToolUseLLMResp = (response: LLMResp): ToolUseBlockParam => {
  if (response.err || !response.data) {
    throw new Error((response.err as any)?.name || 'API call error');
  }
  const data = response.data;
  if (!Array.isArray(data?.content)) {
    throw new Error('Invalid response format: content is not an array');
  }
  const toolUse = data.content.find((item: { type: string; }) => item.type === 'tool_use');

  if (!toolUse || !(toolUse as ToolUseBlockParam).name) {
    throw new Error('Invalid response format: type not valid');
  }
  return toolUse as ToolUseBlockParam;
};

export const updateTourDataWithThemeContent = (tourData: TourData, theme: suggest_guide_theme): TourData => {
  const newTourData = deepcopy(tourData);
  newTourData.opts.annotationBodyBackgroundColor = createLiteralProperty(theme.backgroundColor);
  newTourData.opts.annotationBodyBorderColor = createLiteralProperty(theme.borderColor);
  newTourData.opts.annotationFontColor = createLiteralProperty(theme.fontColor);
  newTourData.opts.borderRadius = createLiteralProperty(theme.borderRadius);
  newTourData.opts.primaryColor = createLiteralProperty(theme.primaryColor);

  return newTourData;
};

export const createBatches = (demoState: DemoState[], batchSize: number): DemoState[][] => {
  const batches = [];
  for (let i = 0; i < demoState.length; i += batchSize) {
    batches.push(demoState.slice(i, i + batchSize));
  }
  return batches;
};

export const handleRaiseDeferredErrorWithAnnonymousId = (err: any, msg: string, anonymousDemoId: string): void => {
  const errorMessage = (err instanceof Error) ? err.message : JSON.stringify(err);
  raiseDeferredError(
    new Error(`${msg} for anonymousDemoId: ${anonymousDemoId} error: ${errorMessage}`)
  );
};

export const DATASET_COL_ID_ID = 0;

export const getDefaultDatasetConfig = (): DatasetConfig => ({
  v: 1,
  lastUpdatedAt: -1,
  data: {
    table: {
      rows: [],
      columns: [{
        id: DATASET_COL_ID_ID,
        name: 'id',
        desc: ''
      }],
      colSeq: 0,
    }
  }
});

export function isValidStrWithAlphaNumericValues(str: string): boolean {
  const pattern = /^[a-zA-Z0-9_]+$/;
  return pattern.test(str);
}

interface TableData {
  columns: ColumnsType<TableRow>;
  rows: TableRow[]
}

export function getTableColumnsAndRowsFromDataset(dataset: DatasetConfig): TableData {
  const datasetColumns = dataset.data.table.columns;
  const columns: ColumnsType<TableRow> = datasetColumns.map(col => ({
    key: col.id,
    title: col.name,
    dataIndex: col.id
  }));

  const datasetRows = dataset.data.table.rows.map(row => ({ ...row, key: row['1'] }));
  return { columns, rows: datasetRows };
}

export type Query = { columnName: string; operator: string; value: string };
export type TableQueries = { tableName: string; queries: Query[] };
export type ParsedQueryResult = { queries: Record<string, TableQueries>; tables: string[] };

export const DATASET_PARAM_PREFIX = 'fv_';

export function parseQueries(queryStr: string): Query[] {
  const queryMatches = queryStr.match(/\(([^)]+)\)/g) || [];
  return queryMatches.map((query) => {
    const [columnName, operator, value] = query.slice(1, -1).split('.');
    return { columnName, operator, value };
  });
}

export function extractDatasetParams(params: URLSearchParams): ParsedQueryResult {
  const tableQueries: Record<string, TableQueries> = {};
  const tablesSet = new Set<string>();

  params.forEach((value, key) => {
    if (key.startsWith(DATASET_PARAM_PREFIX)) {
      const varname = key.replace(DATASET_PARAM_PREFIX, '');
      const tableName = value.match(/(\w+)\(/)?.[1];
      if (tableName) {
        tableQueries[varname] = { tableName, queries: parseQueries(value) };
        tablesSet.add(tableName);
      }
    }
  });

  return { queries: tableQueries, tables: Array.from(tablesSet) };
}

export function datasetQueryParser(
  tableParams: Record<string, TableQueries>,
  database: Record<string, DatasetConfig>
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [varname, { tableName, queries }] of Object.entries(tableParams)) {
    const table = database[tableName];
    if (!table) continue;

    let filteredRows = table.data.table.rows;

    queries.forEach(({ columnName, operator, value }) => {
      const column = table.data.table.columns.find((col) => col.name.toLowerCase() === columnName.toLowerCase());
      if (!column) { filteredRows = []; return; }
      if (operator === 'is') {
        filteredRows = filteredRows.filter((row) => row[column.id].toLowerCase() === value.toLowerCase());
      }
    });

    if (filteredRows.length > 0) {
      const row = filteredRows[0];
      result[varname] = processTableRow(table.data.table.columns, row);
    }
  }

  return result;
}

export function processVarMap(
  dsVarMap: Record<string, Record<string, string>>,
  textVarMap: Record<string, string>
): Record<string, string | Record<string, string>> {
  const newDsVarMap = { ...dsVarMap };

  Object.keys(dsVarMap).forEach(key => {
    newDsVarMap[key] = {
      ...newDsVarMap[key],
      ...textVarMap,
    };
  });

  return {
    ...newDsVarMap,
    ...textVarMap,
  };
}

function processTableRow(cols: TableColumn[], row: TableRow): Record<string, string> {
  const processedRow: Record<string, string> = {};

  cols.forEach(({ id, name }) => {
    processedRow[name] = row[id];
  });

  return processedRow;
}

export const handleAddAnnotationAudio = (
  annConfig: IAnnotationConfig,
  hlsAudio: string,
  webmAudio: string,
  url: string,
  type: 'audio/webm' | 'audio/mpeg',
  isVoiceover: boolean = false
): IAnnotationConfig => {
  let newAnnConfig = updateAnnotationAudio(annConfig, { hls: hlsAudio, webm: webmAudio, fb: { url, type } });

  if (newAnnConfig.type === 'cover') {
    newAnnConfig = updateAnnotationPositioning(newAnnConfig, VideoAnnotationPositions.Center);
    newAnnConfig = isVoiceover ? updateOverlay(newAnnConfig, false) : newAnnConfig;
  } else {
    newAnnConfig = updateAnnotationPositioning(newAnnConfig, VideoAnnotationPositions.BottomRight);
  }

  newAnnConfig = updateAnnotationBoxSize(newAnnConfig, 'medium');
  return newAnnConfig;
};

export const getBorderRadiusForAnnotation = (
  positioning: Positions,
  isCoverAnn: boolean,
  showWatermark: boolean,
  arrowDir: AnimEntryDir,
  borderRadius: number
): string => {
  if (!showWatermark) return `${borderRadius}px`;

  if (arrowDir === 't') {
    if (isCoverAnn || positioning === 'center') return `${borderRadius}px ${borderRadius}px 0px 0px`;
    return `0px 0px ${borderRadius}px ${borderRadius}px`;
  }

  return `${borderRadius}px ${borderRadius}px 0px 0px`;
};
export function getScaleOfElement(element: HTMLElement): {
  scaleX: number,
  scaleY: number
} {
  const style = window.getComputedStyle(element);

  const transform = style.transform;

  if (!transform || transform === 'none') {
    return { scaleX: 1, scaleY: 1 };
  }
  const transformMatch = transform.match(/matrix\((.+)\)/);

  if (!transformMatch) return { scaleX: 1, scaleY: 1 };

  const matrixValues = transformMatch[1].split(', ');

  const scaleX = parseFloat(matrixValues[0]);
  const scaleY = parseFloat(matrixValues[3]);
  return { scaleX, scaleY };
}

export function adjustAspectRatioRectangle(
  parentWidth: number,
  parentHeight: number,
  childRect: Rect,
): {
  rectangleW: number,
  rectangleH: number,
  topLeftX: number,
  topLeftY: number
} {
  const parentAspectRatio = parentWidth / parentHeight;
  const childAspectRatio = childRect.width / childRect.height;

  let rectangleW;
  let rectangleH;
  if (childAspectRatio > parentAspectRatio) {
    rectangleW = childRect.width;
    rectangleH = rectangleW / parentAspectRatio;
  } else {
    rectangleH = childRect.height;
    rectangleW = rectangleH * parentAspectRatio;
  }

  rectangleW = Math.min(Math.max(rectangleW + 32, parentWidth / MAX_ZOOM_SCALE), parentWidth);
  rectangleH = Math.min(Math.max(rectangleH + 32, parentHeight / MAX_ZOOM_SCALE), parentHeight);

  let midX = childRect.left + childRect.width / 2;
  let midY = childRect.top + childRect.height / 2;
  let topLeftX = midX - rectangleW / 2;
  let topLeftY = midY - rectangleH / 2;

  if (topLeftX < 0) {
    topLeftX = 0;
    midX = rectangleW / 2;
  } else if (topLeftX + rectangleW > parentWidth) {
    topLeftX = parentWidth - rectangleW;
    midX = parentWidth - rectangleW / 2;
  }

  if (topLeftY < 0) {
    topLeftY = 0;
    midY = rectangleH / 2;
  } else if (topLeftY + rectangleH > parentHeight) {
    topLeftY = parentHeight - rectangleH;
    midY = parentHeight - rectangleH / 2;
  }

  return {
    rectangleW,
    rectangleH,
    topLeftX,
    topLeftY,
  };
}

export function getCustomTopLeftAndScale(
  parentWidth: number,
  parentHeight: number,
  childRect: Rect,
): {
  scale: number,
  top: number,
  left: number,
} {
  const { rectangleW, rectangleH, topLeftX, topLeftY } = adjustAspectRatioRectangle(
    parentWidth,
    parentHeight,
    childRect
  );

  const scaleX = parentWidth / rectangleW;
  const scaleY = parentHeight / rectangleH;
  const scale = Math.max(scaleX, scaleY);

  return {
    scale,
    top: topLeftY,
    left: topLeftX,
  };
}

export const MAX_ZOOM_SCALE = 1.5;

export function calculateTranslateForTransformOriginAtTopLeft(
  top: number,
  left: number,
  scale: number,
  childWidth: number,
  childHeight: number
): { translateX: string; translateY: string } {
  const translateX = -((left) / childWidth) * 100;
  const translateY = -((top) / childHeight) * 100;

  return {
    translateX: `${translateX}%`,
    translateY: `${translateY}%`
  };
}

export function scaleRect(rect: Rect, scale: number): Omit<Rect, 'right' | 'bottom' | 'x' | 'y'> {
  return {
    left: rect.left * scale,
    top: rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function createAnnotationHotspot(screenId: number, annotationRefId: string): ITourEntityHotspot {
  return {
    type: 'an-btn',
    on: 'click',
    target: '$this',
    actionType: 'navigate',
    actionValue: createLiteralProperty(`${screenId}/${annotationRefId}`)
  };
}

export function openProductUrl(url: string) : void {
  let processedUrl = url.trim().replace(/\s+/g, '');
  if (!processedUrl) return;
  if (!(processedUrl.startsWith('https://') || processedUrl.startsWith('http://'))) {
    processedUrl = `https://${processedUrl}`;
  }
  window.open(processedUrl, '_blank')!.focus();
}

export function updateQueryParams(query: string = '', paramToUpdate: string = '', updateToValue: string = ''): string {
  const querySearchParams = new URLSearchParams(query);

  if (querySearchParams.has(paramToUpdate) && updateToValue.length === 0) querySearchParams.delete(paramToUpdate);
  else if (paramToUpdate.length !== 0) querySearchParams.append(paramToUpdate, updateToValue);

  return querySearchParams.toString();
}

export const getExportBaseUrl = (url: string): string => {
  if (!url) return '';
  let baseUrl = url;
  const params = new URL(window.location.href).searchParams;

  try {
    const getBaseUrl = params.get('baseUrl');
    if (getBaseUrl) {
      const parsedUrl = new URL(getBaseUrl);
      baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}`;
    }
  } catch (err) {
    console.log(err);
  }
  return baseUrl;
};
