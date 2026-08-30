import {
  DEFAULT_BORDER_RADIUS,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  ScreenData,
  SerDoc,
  SerNode,
  TourData,
  TourScreenEntity,
  NODE_NAME,
  ThemeBorderRadiusCandidatePerNode,
  ThemeColorCandidatPerNode,
  ProxyAttrs,
  AiDxDy,
  IGlobalConfig,
} from '@fable/common/dist/types';
import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewScreen,
  ReqNewTour,
  ReqProxyAsset,
  ReqRecordEdit,
  ReqScreenTour,
  ReqThumbnailCreation,
  RespProxyAsset,
  RespScreen,
  RespDemoEntity,
  ScreenType,
  TourSettings,
  EntityInfo,
  FrameSettings,
  LLMOps
} from '@fable/common/dist/api-contract';
import {
  createEmptyTourDataFile,
  getSampleConfig,
  getCurrentUtcUnixTime,
  getDefaultTourOpts,
  hexToRGB,
  rgbToHex,
  getImgScreenData,
  createLiteralProperty,
  SAMPLE_ANN_CONFIG_TEXT,
  getSampleJourneyData
} from '@fable/common/dist/utils';
import { nanoid } from 'nanoid';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import {
  CreateNewDemoV1,
  DemoMetadata,
  guide_theme,
  PostProcessDemoV1,
  RefForMMV,
  RouterForTypeOfDemoCreation,
  ThemeForGuideV1
} from '@fable/common/dist/llm-contract';
import { create_guides_router } from '@fable/common/dist/llm-fn-schema/create_guides_router';
import { ToolUseBlockParam } from '@anthropic-ai/sdk/resources';
import { suggest_guide_theme } from '@fable/common/dist/llm-fn-schema/suggest_guide_theme';
import { post_process_demo } from '@fable/common/dist/llm-fn-schema/post_process_demo';
import { create_guides_step_by_step } from '@fable/common/dist/llm-fn-schema/create_guides_step_by_step';
import { create_guides_marketing } from '@fable/common/dist/llm-fn-schema/create_guides_marketing';
import { demo_metadata } from '@fable/common/dist/llm-fn-schema/demo_metadata';
import {
  AiData,
  AiItem,
  AnnotationStyle,
  create_guides_marketing_p,
  create_guides_step_by_step_p,
  FrameDataToBeProcessed,
  InteractionCtxDetail,
  InteractionCtxWithCandidateElpath,
  LLM_MARK_COLORS,
  LLMOpsType,
  post_process_demo_p,
  ScreenInfoWithAI,
  LLMRunData,
  LLMScreenType,
  RectWithFIdAndElpath
} from './types';
import { P_RespSubscription, P_RespTour, getDefaultThumbnailHash } from '../../entity-processor';
import { createAnnotationHotspot, extractTextFromHTMLString, getColorContrast, getSerNodesElPathFromFids, handleLlmApi, handleRaiseDeferredErrorWithAnnonymousId, isActiveBusinessPlan } from '../../utils';
import {
  uploadImgFileObjectToAws,
  uploadImageAsBinary,
  uploadImageDataToAws,
  uploadMarkedImageToAws
} from '../../upload-media-to-aws';
import { DemoState, Vpd } from '../../types';
import { SAMPLE_AI_ANN_CONFIG_TEXT, SURVEY_ID, THEME_BASE_IMAGE_URL } from '../../constants';

export function getNodeFromDocTree(docTree: SerNode, nodeName: string): SerNode | null {
  const queue: SerNode[] = [docTree];

  while (queue.length > 0) {
    const currNode = queue.shift()!;

    if (currNode.name.toLowerCase() === nodeName.toLowerCase()) {
      return currNode;
    }

    for (let i = 0; i < currNode.chldrn.length; i++) {
      queue.push(currNode.chldrn[i]);
    }
  }

  return null;
}

export async function saveAsTour(
  screens: ScreenInfoWithAI[],
  existingTour: P_RespTour | null,
  globalOpts: IGlobalConfig,
  aiThemeData: suggest_guide_theme | null,
  selectedPallete: 'ai' | 'global' | null,
  creationMode: 'ai'|'manual',
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
  tourName: string = 'Untitled',
  tourDescription: string = '',
  // TODO[now] change this
  annotationBodyBackgroundColor: string = '#ffffff',
  annotationBorderRadius: number | 'global' = DEFAULT_BORDER_RADIUS,
): Promise<ApiResp<RespDemoEntity>> {
  if (annotationBodyBackgroundColor.length === 0) {
    annotationBodyBackgroundColor = '#ffffff';
  }
  const relevantColors = getRelevantColors(annotationBodyBackgroundColor);
  const annStyle: AnnotationStyle = {
    backgroundColor: annotationBodyBackgroundColor,
    borderRadius: annotationBorderRadius,
    selectionColor: relevantColors.selection,
    fontColor: relevantColors.font,
    primaryColor: relevantColors.primary,
    showOverlay: false,
    borderColor: relevantColors.selection,
  };

  if (selectedPallete === 'global') {
    annStyle.backgroundColor = 'global';
    annStyle.borderRadius = 'global';
    annStyle.borderColor = 'global';
  } else if (selectedPallete === 'ai' && aiThemeData) {
    annStyle.backgroundColor = aiThemeData.backgroundColor;
    annStyle.borderRadius = aiThemeData.borderRadius;
    annStyle.fontColor = aiThemeData.fontColor;
    annStyle.primaryColor = aiThemeData.primaryColor;
    annStyle.selectionColor = aiThemeData.borderColor;
    annStyle.borderColor = aiThemeData.borderColor;
  }
  // for save in existing tour we need to show overlay
  if (creationMode === 'ai') {
    annStyle.showOverlay = true;
  }

  const { tourDataFile, tourRid } = await addAnnotationConfigs(
    screens,
    existingTour,
    tourName,
    tourDescription,
    globalOpts,
    annStyle,
    creationMode,
    anonymousDemoId,
    productDetails,
    demoObjective
  );
  const res = await saveTour(tourRid, tourDataFile);

  return res;
}

// --- tour creation util ---

async function createNewTour(
  tourName: string,
  tourDescription: string,
  vpd: null | Vpd,
  thumbnail: null | string,
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
): Promise<RespDemoEntity> {
  let tsettings: TourSettings | undefined;
  if (vpd) {
    tsettings = {
      vpdHeight: vpd.height,
      vpdWidth: vpd.width,
      primaryKey: 'email'
    };
  }

  const info: EntityInfo = {
    frameSettings: FrameSettings.LIGHT,
    thumbnail: getDefaultThumbnailHash(),
    annDemoId: anonymousDemoId,
    productDetails,
    demoObjective,
    isVideo: false
  };

  if (thumbnail) {
    info.thumbnail = thumbnail;
  }

  const { data } = await api<ReqNewTour, ApiResp<RespDemoEntity>>('/newtour', {
    auth: true,
    body: {
      name: tourName,
      description: tourDescription,
      settings: tsettings,
      info
    },
  });
  return data;
}

async function addScreenToTour(
  tourRid: string,
  screenId: number,
  screenType: ScreenType,
  screenRid: string
): Promise<RespScreen> {
  let screenResp: ApiResp<RespScreen>;
  if (screenType === ScreenType.Img) {
    screenResp = await api<ReqScreenTour, ApiResp<RespScreen>>('/astsrntotour', {
      method: 'POST',
      body: {
        screenRid,
        tourRid,
      },
    });
  } else {
    screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
      auth: true,
      body: {
        parentId: screenId,
        tourRid,
      },
    });
  }

  return screenResp.data;
}

async function addAnnotationConfigs(
  screenInfo: Array<ScreenInfoWithAI>,
  existingTour: P_RespTour | null,
  tourName: string,
  tourDescription: string,
  globalOpts: IGlobalConfig,
  annStyle: AnnotationStyle,
  creationMode: 'ai' | 'manual',
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
): Promise<{ tourDataFile: TourData, tourRid: string }> {
  let tourDataFile: TourData;
  let tourRid: string;

  screenInfo = screenInfo.filter((screen, idx) => {
    if (screen.aiAnnotationData) {
      return !screen.skipped && !screen.aiAnnotationData.skip;
    }
    return !screen.skipped;
  });

  if (existingTour) {
    tourRid = existingTour.rid;
    tourDataFile = await api<null, TourData>(existingTour.dataFileUri.href);
    if (!tourDataFile.opts) tourDataFile.opts = getDefaultTourOpts(globalOpts);
    if (!tourDataFile.diagnostics) tourDataFile.diagnostics = {};
  } else {
    let settings = null;
    let thumbnail = null;
    if (screenInfo.length > 0 && screenInfo[0].vpd) {
      settings = screenInfo[0].vpd;
    }
    if (screenInfo.length > 0 && screenInfo[0].info && screenInfo[0].info.thumbnail) {
      thumbnail = screenInfo[0].info.thumbnail;
    }
    const tourData = await createNewTour(
      tourName,
      tourDescription,
      settings,
      thumbnail,
      anonymousDemoId,
      productDetails,
      demoObjective
    );
    tourRid = tourData.rid;
    tourDataFile = createEmptyTourDataFile(globalOpts);
  }

  const annConfigs: Array<IAnnotationConfig> = [];
  const screensInTourPromises: Array<Promise<RespScreen>> = [];

  let grpId = nanoid();

  for (let i = 0; i < screenInfo.length; i++) {
    const screen = screenInfo[i].info!;
    if (screenInfo[i].moduleData) {
      grpId = nanoid();
    }
    const screenAiData = screenInfo[i].aiAnnotationData;
    const annotationText = screenAiData && screenAiData.text ? screenAiData.text
      : creationMode === 'manual' ? SAMPLE_ANN_CONFIG_TEXT : SAMPLE_AI_ANN_CONFIG_TEXT;

    const nextBtnText = screenAiData?.nextButtonText || undefined;

    if (i !== 0
      && (screenInfo[i - 1].screenType === LLMScreenType.demoIntro
       || screenInfo[i - 1].screenType === LLMScreenType.moduleIntro
       || screenInfo[i].screenType === LLMScreenType.demoOutro
      )) {
      const lastScreenPromise = screensInTourPromises[screensInTourPromises.length - 1];
      screensInTourPromises.push(lastScreenPromise);
    } else {
      const newScreen = addScreenToTour(tourRid, screen.id, screen.type, screen.rid);
      screensInTourPromises.push(newScreen);
    }

    const elPath = screen.elPath;
    const screenConfig = getSampleConfig(
      elPath,
      grpId,
      globalOpts,
      annotationText,
      nextBtnText,
      screenAiData && screenAiData.richText,
      screenInfo[i].screenType !== LLMScreenType.default
    );
    screenConfig.showOverlay = annStyle.showOverlay;
    screenConfig.isHotspot = true;
    screenConfig.markedImage = screenInfo[i].info ? screenInfo[i].info!.markedImage : null;

    if (screen.replacedWithImgScreen) {
      const error = {
        code: 100,
        reason: 'Interactive recording failed as main frame not found. Replaced it with image screen',
        type: 'interactive_recording_failed'
      };
      const tourDiag = tourDataFile.diagnostics;
      if (!tourDiag[screen.id]) tourDiag[screen.id] = [];
      tourDiag[screen.id].push(error);
    }

    if (!existingTour) {
      // If we are adding the annotations in existing tour then don' change any of this.
      if (i === 0) {
        screenConfig.buttons.forEach((button) => {
          if (button.type === 'prev') {
            button.exclude = true;
          }
        });

        screenConfig.buttonLayout = 'full-width';
      }

      if (i === screenInfo.length - 1) {
        screenConfig.buttons.forEach((button) => {
          if (button.type === 'next') {
            button.text = createLiteralProperty('Book a demo');
          }
        });
      }
    }
    annConfigs.push(screenConfig);
  }

  const screensInTour: Array<RespScreen> = await Promise.all(screensInTourPromises);

  if (tourDataFile.opts.main === '') {
    tourDataFile.opts.main = `${screensInTour[0].id}/${annConfigs[0].refId}`;
  }

  // journey is empty when User had an existing demo which was empty.
  // User add new screens recorded using extension to this demo.
  if (tourDataFile.journey === undefined || Object.keys(tourDataFile.journey).length === 0) {
    tourDataFile.journey = getSampleJourneyData(globalOpts);
  }

  tourDataFile.lastUpdatedAtUtc = getCurrentUtcUnixTime();
  const journey = tourDataFile.journey;

  for (let i = 0; i < screenInfo.length; i++) {
    const screen = screenInfo[i];
    let isModuleMain = false;
    if (screen.moduleData) {
      isModuleMain = true;
      journey.flows.push({
        header1: screen.moduleData!.name,
        header2: screen.moduleData!.description,
        main: `${screensInTour[i].id}/${annConfigs[i].refId}`,
        mandatory: false
      });
    }
    const annotationConfig = annConfigs[i];
    if (annStyle.backgroundColor !== 'global') {
      annotationConfig.annotationSelectionColor = createLiteralProperty(annStyle.selectionColor!);
    }
    if (!(i === 0 && i === screenInfo.length - 1)) {
      // If there is only one annotation in the tour then there is no point in connection, as both next and prev
      // will be empty
      const nextBtn = annotationConfig.buttons.filter(btn => btn.type === 'next')[0];
      const prevBtn = annotationConfig.buttons.filter(btn => btn.type === 'prev')[0];

      if (isModuleMain) {
        nextBtn.hotspot = createAnnotationHotspot(screensInTour[i + 1].id, annConfigs[i + 1].refId);
        // current ann won't have prev
        // previous ann won't have next
        if (i > 0) {
          const prevConfig = annConfigs[i - 1];
          const nextBtnForPrevAnn = prevConfig.buttons.filter(btn => btn.type === 'next')[0];
          nextBtnForPrevAnn.hotspot = null;
        }
      } else if (i === 0) {
        nextBtn.hotspot = createAnnotationHotspot(screensInTour[i + 1].id, annConfigs[i + 1].refId);
        // first annotation won't have any prev
      } else if (i === screenInfo.length - 1) {
        prevBtn.hotspot = createAnnotationHotspot(screensInTour[i - 1].id, annConfigs[i - 1].refId);
        // last annotation won't have any next
      } else {
        nextBtn.hotspot = createAnnotationHotspot(screensInTour[i + 1].id, annConfigs[i + 1].refId);
        prevBtn.hotspot = createAnnotationHotspot(screensInTour[i - 1].id, annConfigs[i - 1].refId);
      }
    }

    const newScreen = screensInTour[i];
    const prevEntities = tourDataFile.entities[newScreen.id]
     && (tourDataFile.entities[newScreen.id] as TourScreenEntity).annotations
      ? { ...(tourDataFile.entities[newScreen.id] as TourScreenEntity).annotations } : {};
    tourDataFile.entities[newScreen.id] = {
      type: 'screen',
      ref: newScreen.id.toString(),
      annotations: {
        ...prevEntities,
        [annConfigs[i].id]: annConfigs[i]
      }
    } as TourScreenEntity;
  }
  tourDataFile.journey = { ...journey };
  // If we are adding annotations to existing tour then don't change anything from the theme
  if (!existingTour) {
    if (annStyle.backgroundColor !== 'global') {
      tourDataFile.opts.annotationBodyBackgroundColor = createLiteralProperty(annStyle.backgroundColor);
      tourDataFile.opts.primaryColor = createLiteralProperty(annStyle.primaryColor!);
      tourDataFile.opts.annotationFontColor = createLiteralProperty(annStyle.fontColor!);
    }
    if (annStyle.borderColor !== 'global') {
      tourDataFile.opts.annotationBodyBorderColor = createLiteralProperty(annStyle.borderColor);
    }

    if (annStyle.borderRadius !== 'global') {
      tourDataFile.opts.borderRadius = createLiteralProperty(annStyle.borderRadius);
    }
  }

  return { tourDataFile, tourRid };
}

async function saveTour(rid: string, tourDataFile: TourData): Promise<ApiResp<RespDemoEntity>> {
  const tourResp = await api<ReqRecordEdit, ApiResp<RespDemoEntity>>('/recordtredit', {
    auth: true,
    body: {
      rid,
      editData: JSON.stringify(tourDataFile),
    },
  });
  return tourResp;
}

function resolveElementFromPath(node: SerNode, path: Array<number>): SerNode {
  const idx = path.shift();
  if (idx !== undefined) {
    return resolveElementFromPath(node.chldrn[idx], path);
  }
  return node;
}

function shouldProxyAsset(
  assetUrl: URL,
  svgSpriteUrls: Record<string, number>,
  proxyCache: Map<string, RespProxyAsset>,
): boolean {
  if (`${assetUrl.origin}${assetUrl.pathname}${assetUrl.search}` in svgSpriteUrls) {
    return false;
  }

  if (proxyCache.has(assetUrl.href)) {
    return false;
  }

  return true;
}

export interface PostProcessSerDocsReturnType {
  data: RespScreen | null;
  elPath: string;
  replacedWithImgScreen: boolean;
  skipped: boolean;
  vpd: Vpd | null;
}

export interface AssetOperationResp {
  isLocalhostAssetRecorded: boolean
}

export const handleAssetOperation = async (
  assetOperatons: AssetOperationProps[],
  proxyCache: Map<string, RespProxyAsset>,
  mainFrame: FrameDataToBeProcessed | undefined,
  updateAssetProgress: (progress: number)=>void,
): Promise<AssetOperationResp> => {
  const svgSpriteUrls: Record<string, number> = {};
  let isLocalhostAssetRecorded = false;
  for (const operation of assetOperatons) {
    const node = operation.node;
    const baseURI = operation.frameBaseURI;
    const frameUrl = operation.frameFrameUrl;
    try {
      if (operation.type === 'base64') {
        try {
          const binaryData = atob(operation.node.props.base64Img!);
          const arrayBuffer = new ArrayBuffer(binaryData.length);
          const uint8Array = new Uint8Array(arrayBuffer);

          for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
          }

          const blob = new Blob([uint8Array]);
          const file = new File([blob], 'image.png', { type: 'image/png' });
          const url = await uploadImgFileObjectToAws(file);

          operation.node.attrs[operation.attr!] = url?.cdnUrl || '';
          operation.node.props.base64Img = '';
        } catch (e) {
          raiseDeferredError(e as Error);
          operation.node.attrs.src = getAbsoluteUrl(
            operation.originalBlobUrl!,
            operation.frameBaseURI,
            operation.frameFrameUrl
          );
        } finally {
          operation.node.props.origHref = operation.originalBlobUrl;
          updateAssetProgress(1);
        }
      } else {
        const clientInfo = operation.clientInfo;
        for (const [proxyAttr, proxyUrls] of Object.entries(node.props.proxyUrlMap)) {
          for (const pUrl of proxyUrls) {
            let assetUrlStr = node.props.absoluteUrl ?? getAbsoluteUrl(pUrl, baseURI, frameUrl);
            let assetUrl;
            try {
              assetUrl = new URL(assetUrlStr);
            } catch (e) {
              raiseDeferredError(e as Error);
              assetUrl = new URL(getAbsoluteUrl(pUrl, baseURI, frameUrl));
              assetUrlStr = assetUrl.href;
            }

            if (!(assetUrl.protocol === 'http:' || assetUrl.protocol === 'https:')) continue;

            if (assetUrl.hostname === 'localhost' || assetUrl.hostname === '127.0.0.1') {
              isLocalhostAssetRecorded = true;
              continue;
            }

            let proxyiedUrl = assetUrlStr;
            let proxyiedContent: string = '';

            if (proxyAttr === 'style' && operation.frameIriReferencedSvgEls![pUrl]) {
              proxyiedUrl = pUrl;
            }

            if (shouldProxyAsset(assetUrl, svgSpriteUrls, proxyCache) && !operation.frameIriReferencedSvgEls![pUrl]) {
              try {
                const data = await api<ReqProxyAsset, ApiResp<RespProxyAsset>>('/proxyasset', {
                  method: 'POST',
                  body: {
                    origin: assetUrlStr,
                    clientInfo,
                    body: node.props.isInlineSprite || false
                  },
                });
                if (data && data.data && data.data.proxyUri) proxyiedUrl = data.data.proxyUri;
                proxyiedContent = data.data.content ?? '';
                proxyCache.set(assetUrlStr, data.data);
              } catch (e) {
                raiseDeferredError(e as Error);
              }
            } else {
              const possibleCachedResp = proxyCache.get(assetUrlStr);
              if (possibleCachedResp) {
                proxyiedUrl = possibleCachedResp.proxyUri;
                proxyiedContent = possibleCachedResp.content ?? '';
              }
            }

            try {
              if (proxyAttr === 'style') {
                const attrVal = node.attrs[proxyAttr];
                if (attrVal) node.attrs[proxyAttr] = getAllPossibleCssUrlReplace(attrVal, pUrl, proxyiedUrl);
              } else if (proxyAttr === 'cssRules') {
                const propsVal = node.props[proxyAttr];
                if (propsVal) node.props[proxyAttr] = getAllPossibleCssUrlReplace(propsVal, pUrl, proxyiedUrl);
              } else if (proxyAttr === 'adoptedStylesheets') {
                const propsVal = node.props[proxyAttr];
                if (propsVal) node.props[proxyAttr] = getAllPossibleAdoptedStylesheetsUrlReplace(propsVal, pUrl, proxyiedUrl);
              } else if (proxyAttr === 'xlink:href' || proxyAttr === 'href' || proxyAttr === 'src') {
                node.props.origHref = pUrl;
                if (node.props.isInlineSprite) {
                  node.attrs.href = node.props.spriteId ?? assetUrl.hash;
                  if (!(`${assetUrl.origin}${assetUrl.pathname}${assetUrl.search}` in svgSpriteUrls)) {
                    operation.headNode?.chldrn.push({
                      type: -1,
                      name: '-data-f-sprite',
                      attrs: {
                        'f-id': nanoid(),
                      },
                      props: {
                        proxyUrlMap: {},
                        content: proxyiedContent,
                      },
                      chldrn: [],
                      sv: 2
                    });
                  }
                  svgSpriteUrls[`${assetUrl.origin}${assetUrl.pathname}${assetUrl.search}`] = 1;
                } else {
                  node.attrs[proxyAttr] = proxyiedUrl;
                }
              } else if (proxyAttr === 'srcset') {
                node.attrs.srcset = replaceSrcsetUrl(node.attrs.srcset!, pUrl, proxyiedUrl);
              }
            } catch (e) {
              raiseDeferredError(e as Error);
            }
          }
        }
        updateAssetProgress(Object.entries(node.props.proxyUrlMap).length);
      }

      if (operation.frameId === 0 && operation.postProcessPath === operation.frameIconPath && mainFrame) {
        // Only save icon for main frame
        mainFrame.iconPath = node.attrs.href || undefined;
      }
    } catch (e) {
      raiseDeferredError(e as Error);
    }
  }

  return {
    isLocalhostAssetRecorded
  };
};

export interface AssetOperationProps {
  type: 'base64' | 'proxyAsset',
  originalBlobUrl?: string,
  clientInfo: string,
  base64?: string,
  attr?: string,
  node: SerNode,
  headNode?: SerNode | null,
  frameBaseURI: string,
  frameFrameUrl: string,
  frameIconPath: string | undefined,
  frameIriReferencedSvgEls?: Record<string, string>,
  frameId: number,
  postProcessPath: string
}

export function processScreen(
  frames: Array<FrameDataToBeProcessed>,
  cookies: chrome.cookies.Cookie[],
  frameThumbnailPromise: Promise<string>[],
  interactionCtx: Array<InteractionCtxDetail | undefined>
): FrameProcessResult {
  let imageData = '';
  let mainFrame: FrameDataToBeProcessed | undefined;
  let totalItemsToPostProcess = 0;
  const lookupWithProp = new CreateLookupWithProp<FrameDataToBeProcessed>();
  let frameWithInteractionData: FrameDataToBeProcessed | null = null;

  let isMainFrameFound = true;

  for (const frame of frames) {
    if (frame.type === 'thumbnail') {
      imageData = frame.data as string;
      try {
        frameThumbnailPromise.push(uploadImageDataToAws(imageData, 'image/png').then(t => t?.cdnUrl || ''));

        // const imageName = `un_marked_image_${id}.jpeg`;
        // const file = new File([imageData], `temp${Math.random()}`, { type: 'image/jpeg' });
        // frameThumbnailPromise.push(uploadMarkedImageToAws('image/jpeg', anonymousDemoId, imageName, file));
      } catch (error) {
        console.error('Failed to upload thumbnail to S3:', error);
      }
      continue;
    } else if (frame.type !== 'serdom') {
      continue;
    }
    if (frame.interactionCtx) {
      frameWithInteractionData = frame;
    }

    const data = frame.data as SerDoc;
    data.docTree = JSON.parse(data.docTreeStr);
    totalItemsToPostProcess += data.postProcesses.length;
    if (frame.frameId === 0) {
      mainFrame = frame;
    } else {
      data.frameId && lookupWithProp.push('fableGenFrameId', data.frameId, frame);
      lookupWithProp.push('frameId', `${frame.frameId}`, frame);
      !(data.name === undefined || data.name === null || data.name === '')
        && lookupWithProp.push('name', data.name, frame);
      lookupWithProp.push('url', data.frameUrl, frame);
      lookupWithProp.push('urlBase', data.frameUrl, frame);
      lookupWithProp.push('dim', `${data.rect.width}:${data.rect.height}`, frame);
    }
  }

  if (!(mainFrame && mainFrame.data)) {
    isMainFrameFound = false;
    sentryCaptureExceptionWithData('Main frame not found, this should never happen', frames);
  }

  let elPath = '';
  const allCookies = cookies;
  const processedFrames = new Set<number>();
  const assetOperation: AssetOperationProps[] = [];

  function process(
    frame: SerDoc,
    frameId: number,
    traversePath: string,
    numberOfProcessingDone: number
  ): void {
    for (const postProcess of frame.postProcesses) {
      numberOfProcessingDone++;
      if (postProcess.type === 'elpath') {
        elPath = traversePath ? `${traversePath}${postProcess.path}` : postProcess.path;
        continue;
      }
      const traversalPath = postProcess.path.split('.').map((_) => +_);
      const node = resolveElementFromPath(frame.docTree!, traversalPath);
      if (postProcess.type === 'iframe' || postProcess.type === 'object') {
        const urlLookupProp = postProcess.type === 'object' ? 'data' : 'src';
        let subFrame;
        let subFrames = [];
        if ((subFrames = lookupWithProp.find('fableGenFrameId', node.attrs['fable-0-id-id'])).length === 1) {
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find('name', node.attrs.name)).length === 1) {
          // If we find a unique frame record with name then we take it
          // Sometimes the <iframe name="" /> is blank, in that case we do following lookup
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find('url', node.attrs[urlLookupProp])).length === 1) {
          // If we find a unique frame record with url then we take the entry
          // Sometimes the <iframe src="" /> from inside iframe
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find('urlBase', node.attrs[urlLookupProp])).length === 1) {
          // If we find a unique frame record with url then we take the entry
          // Sometimes the <iframe src="" /> from inside iframe
          subFrame = subFrames[0];
        } else if (
          node.props.rect
          && (subFrames = lookupWithProp.find('dim', `${node.props.rect.width}:${node.props.rect.height}`)).length === 1
        ) {
          // If none of the above condition matches we try to get iframe with same dimension
          subFrame = subFrames[0];
        }

        if (!subFrame) {
          console.warn('Node', node);
          raiseDeferredError(new Error(`No sub frame present for node ^^^. src=${node.attrs.src}`));
          sentryCaptureExceptionWithData(`No sub frame present for node ^^^. src=${node.attrs.src}`, frames);
        } else if (processedFrames.has(subFrame.frameId)) {
          raiseDeferredError(new Error(`Circular reference for frame. ${subFrame.frameId}`));
        } else {
          processedFrames.add(subFrame.frameId);
          const subFrameData = subFrame.data as SerDoc;
          if (subFrameData.isHTML5) {
            node.chldrn.push({
              type: 10,
              name: 'html',
              attrs: {},
              props: { proxyUrlMap: {} },
              chldrn: [],
              sv: node.sv,
            });
          }
          node.chldrn.push(subFrameData.docTree!);
          process(
            subFrameData,
            subFrame.frameId,
            `${traversePath}1.${postProcess.path}.`,
            numberOfProcessingDone
          );
        }
      } else {
        const url = new URL(frame.frameUrl);
        const cookieStr = getCookieHeaderForUrl(allCookies, url);
        const clientInfo = btoa(
          JSON.stringify({
            kie: cookieStr,
            ua: frame.userAgent,
          })
        );

        // COMPATIBILITY this is to support the type change proxyUrl (string -> string[]).
        // While the old extension is not released by chromestore we have to support proxyUrl
        // being both string & string[]
        // FIXME Delete this once extension is released
        if (!node.sv) node.sv = 0;
        if (node.sv < 2) {
          const props = node.props as any;
          const proxyUrl = props.proxyUrl as string[];
          const attr = props.proxyAttr as keyof typeof ProxyAttrs;
          node.props.proxyUrlMap = {};
          if (proxyUrl && proxyUrl.length) {
            node.props.proxyUrlMap[attr] = proxyUrl;
          }
        }

        if (!frame.iriReferencedSvgEls) frame.iriReferencedSvgEls = {};

        if (node.props.base64Img) {
          let originalBlobUrl = '';
          let attr = '';

          switch (node.name) {
            case 'img':
              if (node.props.proxyUrlMap.src) {
                originalBlobUrl = node.props.proxyUrlMap.src[0];
              }
              attr = 'src';
              break;
            case 'image':
              if (node.props.proxyUrlMap.href) {
                originalBlobUrl = node.props.proxyUrlMap.href[0];
              }
              attr = 'href';
              break;
            default:
              break;
          }

          if (!originalBlobUrl) continue;

          assetOperation.push({
            type: 'base64',
            originalBlobUrl,
            clientInfo,
            attr,
            node,
            frameBaseURI: frame.baseURI,
            frameFrameUrl: frame.frameUrl,
            frameIconPath: frame.icon?.path,
            frameId,
            postProcessPath: postProcess.path
          });
        } else {
          const headNode = getNodeFromDocTree(frame.docTree!, 'head');
          assetOperation.push({
            type: 'proxyAsset',
            clientInfo,
            node,
            headNode,
            frameBaseURI: frame.baseURI,
            frameFrameUrl: frame.frameUrl,
            frameIriReferencedSvgEls: frame.iriReferencedSvgEls,
            frameIconPath: frame.icon?.path,
            frameId,
            postProcessPath: postProcess.path
          });
        }
      }
    }
  }

  let cumulativeDxDy = {
    dx: 0,
    dy: 0
  };
  if (isMainFrameFound) {
    const mainFrameData = mainFrame!.data as SerDoc;
    process(mainFrameData as SerDoc, mainFrame!.frameId, '', 1);

    // use elpath to traverse and get cumulative dydx
    const pathArr = elPath.split('.').map(Number);
    cumulativeDxDy = traverseTreeByElPath(mainFrameData.docTree!, pathArr);
    if (frameWithInteractionData) {
      const interactionData = {
        frameRect: (mainFrameData as SerDoc).rect,
        interactionCtx: frameWithInteractionData.interactionCtx,
        dxdy: cumulativeDxDy
      };

      if (interactionData.interactionCtx) {
        const allFids = interactionData.interactionCtx!.candidates.map((candidate) => candidate.fid);
        const fidElPathMap = getSerNodesElPathFromFids(mainFrameData.docTree!, allFids);
        interactionData.interactionCtx.candidates = interactionData.interactionCtx.candidates.filter(
          (candidate) => fidElPathMap[candidate.fid]
        ).map((candidate) => ({
          ...candidate,
          elPath: fidElPathMap[candidate.fid].elPath
        }));

        // candidadte does not contain baseEl, so we are adding baseEl
        const baseEl: RectWithFIdAndElpath = {
          ...interactionData.interactionCtx.focusEl,
          elPath
        };
        interactionData.interactionCtx.candidates.unshift(baseEl);
      }

      interactionCtx.push(interactionData);
    } else interactionCtx.push(undefined);
  }
  const frameResult: FrameProcessResult = {
    mainFrame,
    imageData,
    elPath: elPath || '$',
    assetOperation,
    frames
  };
  return frameResult;
}

export interface FrameProcessResult {
  mainFrame: FrameDataToBeProcessed | undefined;
  imageData: string;
  elPath: string;
  assetOperation: AssetOperationProps[],
  frames: FrameDataToBeProcessed[]
}

export async function processNewScreenApiCalls(
  frames: Array<FrameDataToBeProcessed>,
  mainFrame: FrameDataToBeProcessed | undefined,
  imageData: string,
  elPath: string
): Promise<PostProcessSerDocsReturnType> {
  let shouldReplaceWithImgScreen = true;
  let vpd: Vpd | null = null;
  let data: RespScreen | null = null;
  let replacedWithImgScreen = false;

  if (mainFrame) {
    const mainFrameData = mainFrame!.data as SerDoc;
    try {
      shouldReplaceWithImgScreen = false;
      const screenBody: ScreenData = {
        version: '2023-07-27',
        vpd: {
          h: mainFrameData.rect.height,
          w: mainFrameData.rect.width,
        },
        docTree: mainFrameData.docTree!,
        isHTML4: !mainFrameData.isHTML5,
      };
      vpd = {
        height: mainFrameData.rect.height,
        width: mainFrameData.rect.width,
      };

      const resp = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
        method: 'POST',
        body: {
          name: (mainFrameData.title || '').substring(0, 48),
          url: mainFrameData.frameUrl,
          thumbnail: imageData,
          body: JSON.stringify(screenBody),
          favIcon: mainFrame.iconPath,
          type: ScreenType.SerDom,
        },
      });
      data = resp.data;
    } catch (e) {
      raiseDeferredError(e as Error);
      // eslint-disable-next-line max-len
      sentryCaptureExceptionWithData('Error while processing screens data, will replace serdom screen with image screen', frames);
      if (!shouldReplaceWithImgScreen) {
        // in this case the process call is successful but for some reason the screen has not been created
        return { data: null, elPath: '', replacedWithImgScreen: false, skipped: true, vpd: null };
      }
    }
  } else if (!imageData) {
    sentryCaptureExceptionWithData('Screen skipped, could not find image data when main frame was not found', frames);
    return { data: null, elPath: '', replacedWithImgScreen: false, skipped: true, vpd: null };
  }

  if (shouldReplaceWithImgScreen && imageData) {
    try {
      const screenImgFile = dataURLtoFile(imageData, 'img.png');
      const resp = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
        method: 'POST',
        body: {
          name: 'Untitled',
          type: ScreenType.Img,
          body: JSON.stringify(getImgScreenData()),
          contentType: screenImgFile.type
        },
      });

      data = resp.data;
      await uploadImageAsBinary(screenImgFile, {
        baseUrl: data.uploadUrl!,
        cdnUrl: data.uploadUrl!.split('?')[0],
      });
      await api<ReqThumbnailCreation, ApiResp<RespScreen>>('/genthumb', {
        method: 'POST',
        body: {
          screenRid: data.rid
        },
      });
      elPath = '$';
      replacedWithImgScreen = true;
      sentryCaptureExceptionWithData('Screen replaced with image screen.', frames);
    } catch (e) {
      raiseDeferredError(e as Error);
      sentryCaptureExceptionWithData('Screen skipped, could not replace with image screen', frames);
      return { data: null, elPath: '', replacedWithImgScreen: false, skipped: true, vpd: null };
    }
  }
  return { data, elPath, replacedWithImgScreen, skipped: false, vpd };
}

function sentryCaptureExceptionWithData(errStr: string, results: Array<FrameDataToBeProcessed>): void {
  sentryCaptureException(
    new Error(errStr),
    JSON.stringify(results),
    'screendata.txt'
  );
}

function traverseTreeByElPath(node: SerNode, path: number[]): AiDxDy {
  let currNode = node;
  const cumulativeDxDy = {
    dx: 0,
    dy: 0
  };
  for (let i = 1; i < path.length; i++) {
    if (currNode.name === 'iframe') {
      if (currNode.chldrn.length === 0) {
        return cumulativeDxDy;
      }
      cumulativeDxDy.dx += currNode.props.aidxdy?.dx || 0;
      cumulativeDxDy.dy += currNode.props.aidxdy?.dy || 0;
    }
    const index = path[i];
    const nextNode = currNode.chldrn[index];
    if (!nextNode) {
      return cumulativeDxDy;
    }
    currNode = nextNode;
  }
  return cumulativeDxDy;
}

function getAllPossibleCssUrlReplace(str: string, replaceThisUrl: string, replaceWithUrl: string): string {
  return str
    .replaceAll(`url('${replaceThisUrl}')`, `url('${replaceWithUrl}')`)
    .replaceAll(`url("${replaceThisUrl}")`, `url("${replaceWithUrl}")`)
    .replaceAll(`url(${replaceThisUrl})`, `url(${replaceWithUrl})`);
}

function replaceSrcsetUrl(origSrcset: string, origUrl: string, proxyUri: string): string {
  return origSrcset.replace(origUrl, proxyUri);
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]); let n = bstr.length; const
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function getAllPossibleAdoptedStylesheetsUrlReplace(
  adoptedStyleSheets: string[],
  replaceThisUrl: string,
  replaceWithUrl: string
): string[] {
  const res = [];
  for (const sheet of adoptedStyleSheets) {
    res.push(getAllPossibleCssUrlReplace(sheet, replaceThisUrl, replaceWithUrl));
  }

  return res;
}

export function getCookieHeaderForUrl(cookies: chrome.cookies.Cookie[], pageUrl: URL): String {
  const host = pageUrl.host;
  const path = pageUrl.pathname;
  const hostParts = host.split('.');
  const allSubDomains: Record<string, number> = {};

  let cumulativeSubDomain = `.${hostParts[hostParts.length - 1]}`;
  for (let i = hostParts.length - 2; i >= 0; i--) {
    cumulativeSubDomain = `${i > 0 ? '.' : ''}${hostParts[i]}${cumulativeSubDomain}`;
    allSubDomains[cumulativeSubDomain] = 1;
  }

  return cookies
    .filter((cookie) => cookie.domain in allSubDomains && path.startsWith(cookie.path || '/'))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

export function getAbsoluteUrl(urlStr: string, baseUrl: string, frameUrl: string): string {
  try {
    const url = new URL(urlStr, frameUrl);
    return url.href;
  } catch {
    const first2CharOfUrl = urlStr.substring(0, 2);
    if (first2CharOfUrl === '//') {
      // https://stackoverflow.com/a/9646435/2474269
      return new URL(baseUrl).protocol + urlStr;
    }
    if (first2CharOfUrl.charAt(0) === '/') {
      return new URL(baseUrl).origin + urlStr;
    }
    return baseUrl + urlStr;
  }
}

type LookupWithPropType = 'name' | 'url' | 'urlBase' | 'dim' | 'frameId' | 'fableGenFrameId';
class CreateLookupWithProp<T> {
  private static globalRec: Record<LookupWithPropType, Record<string, object[]>> = {
    name: {},
    url: {},
    urlBase: {},
    dim: {},
    frameId: {},
    fableGenFrameId: {}
  };

  private rec: Record<LookupWithPropType, Record<string, T[]>> = {
    name: {},
    url: {},
    urlBase: {},
    dim: {},
    frameId: {},
    fableGenFrameId: {}
  };

  static getNormalizedUrlStr(urlStr: string, justHost: boolean = true): string {
    try {
      const url = new URL(urlStr);
      urlStr = `${url.origin}${justHost ? '' : url.pathname}`;
    } catch (e) {
      /* noop */
    }
    return urlStr;
  }

  push = (prop: LookupWithPropType, key: string, val: T) => {
    if (prop === 'url' || prop === 'urlBase') {
      key = CreateLookupWithProp.getNormalizedUrlStr(key, prop === 'urlBase');
    }
    if (key in this.rec) {
      this.rec[prop][key].push(val);
    } else {
      this.rec[prop][key] = [val];
    }
    if (key in CreateLookupWithProp.globalRec) {
      (CreateLookupWithProp.globalRec as Record<LookupWithPropType, Record<string, T[]>>)[prop][key].push(val);
    } else {
      (CreateLookupWithProp.globalRec as Record<LookupWithPropType, Record<string, T[]>>)[prop][key] = [val];
    }
  };

  find = (prop: LookupWithPropType, key: string | null | undefined): T[] => {
    if (key === null || key === undefined) {
      key = '';
    }
    if (prop === 'url' || prop === 'urlBase') {
      key = CreateLookupWithProp.getNormalizedUrlStr(key, prop === 'urlBase');
    }
    if (!(key in this.rec[prop])) {
      if (!(key in CreateLookupWithProp.globalRec[prop])) {
        return [];
      }
      return CreateLookupWithProp.globalRec[prop][key] as T[];
    }

    return this.rec[prop][key];
  };
}

export function getThemeAnnotationOpts(
  color: string | 'global',
  globalOpts: IGlobalConfig,
  radius: number | 'global' = DEFAULT_BORDER_RADIUS,
): ITourDataOpts {
  const opts = getDefaultTourOpts(globalOpts);

  if (color !== 'global') {
    opts.annotationBodyBackgroundColor = createLiteralProperty(color);
    const relevantColors = getRelevantColors(opts.annotationBodyBackgroundColor._val);
    opts.primaryColor = createLiteralProperty(relevantColors.primary);
    opts.annotationFontColor = createLiteralProperty(relevantColors.font);
  }

  if (radius !== 'global') {
    opts.borderRadius = createLiteralProperty(radius);
  }

  return opts;
}

export const getRelevantColors = (annotationBodyBackgroundColor: string): {
  primary: string,
  selection: string,
  font: string
} => {
  const font = getColorContrast(annotationBodyBackgroundColor) === 'dark' ? '#ffffff' : '#424242';
  if (annotationBodyBackgroundColor.toLowerCase() === '#ffffff') {
    return {
      primary: '#7567FF',
      selection: '#7567FF',
      font,
    };
  }

  if (getColorContrast(annotationBodyBackgroundColor) === 'dark') {
    return {
      primary: '#ffffff',
      selection: annotationBodyBackgroundColor,
      font
    };
  }

  const darkerShade = generateShadeColor(annotationBodyBackgroundColor, 25);
  return {
    primary: darkerShade,
    selection: darkerShade,
    font
  };
};

function generateShadeColor(color: string, percentage: number): string {
  const { red, green, blue } = hexToRGB(color);
  const darkerR = Math.max(0, Math.round(red * (1 - percentage / 100)));
  const darkerG = Math.max(0, Math.round(green * (1 - percentage / 100)));
  const darkerB = Math.max(0, Math.round(blue * (1 - percentage / 100)));

  const darkenRGB = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  const darkerHexColor = rgbToHex(darkenRGB);

  return darkerHexColor;
}

function areColorsDistant(color1: string, color2: string): boolean {
  const color1Rgb = hexToRGB(color1);
  const color2Rgb = hexToRGB(color2);

  const d = deltaE([color1Rgb.red, color1Rgb.green, color1Rgb.blue], [color2Rgb.red, color2Rgb.green, color2Rgb.blue]);
  // d <= 1.0 not visible by human eyes
  // d (1, 2] perceptible through close observation
  // d (2, 10] perceptible at a glance
  // d (10, 49] more similar to opposite color
  // d == 100 opposite
  return d > 20;
}

(window as any).ffn = areColorsDistant;

function deltaE(rgbA: [number, number, number], rgbB: [number, number, number]): number {
  const labA = rgb2lab(rgbA);
  const labB = rgb2lab(rgbB);
  const deltaL = labA[0] - labB[0];
  const deltaA = labA[1] - labB[1];
  const deltaB = labA[2] - labB[2];
  const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  const deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  const sc = 1.0 + 0.045 * c1;
  const sh = 1.0 + 0.015 * c1;
  const deltaLKlsl = deltaL / (1.0);
  const deltaCkcsc = deltaC / (sc);
  const deltaHkhsh = deltaH / (sh);
  const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function rgb2lab(rgb: [number, number, number]): [number, number, number] {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;
  let x;
  let y;
  let z;
  r = (r > 0.04045) ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = (g > 0.04045) ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = (b > 0.04045) ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = (x > 0.008856) ? x ** (1 / 3) : (7.787 * x) + 16 / 116;
  y = (y > 0.008856) ? y ** (1 / 3) : (7.787 * y) + 16 / 116;
  z = (z > 0.008856) ? z ** (1 / 3) : (7.787 * z) + 16 / 116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

export const getOrderedColorsWithScore = (colorsPerNode: ThemeColorCandidatPerNode): Array<{
  hex: string,
  occurrence: number,
  default?: boolean
}> => {
  const newColors: Record<string, number> = {};

  for (const [tag, colorMap] of Object.entries(colorsPerNode)) {
    let factor = 1;
    if (tag === NODE_NAME.a) {
      factor = 8;
    } else if (tag === NODE_NAME.button) {
      factor = 3;
    }

    for (const [hex, occurrence] of Object.entries(colorMap)) {
      if (hex in newColors) newColors[hex] += occurrence * factor;
      else newColors[hex] = occurrence * factor;
    }
  }

  let orderedCandidates = Object.entries(newColors).map(kv => ({
    hex: kv[0],
    occurrence: kv[1]
  })).sort((m, n) => n.occurrence - m.occurrence);

  // remove color with similar shade
  if (orderedCandidates.length === 1) {
    return orderedCandidates;
  }

  const candidateColorMap = orderedCandidates.slice(0, 30).reduce((ob, c) => {
    ob[c.hex] = c.occurrence;
    return ob;
  }, {} as Record<string, number>);

  const candidateColors = Object.keys(candidateColorMap);

  for (let i = 0; i < candidateColors.length - 1; i++) {
    for (let k = i + 1; k < candidateColors.length; k++) {
      if (!areColorsDistant(candidateColors[i], candidateColors[k])) {
        const scoreI = candidateColorMap[candidateColors[i]];
        const scoreK = candidateColorMap[candidateColors[k]];
        if (scoreK > scoreI) delete candidateColorMap[candidateColors[i]];
        else delete candidateColorMap[candidateColors[k]];
      }
    }
  }

  orderedCandidates = Object.entries(candidateColorMap).map(kv => ({
    hex: kv[0],
    occurrence: kv[1]
  })).sort((m, n) => n.occurrence - m.occurrence);

  return orderedCandidates;
};

const median = (arr: number[]): number => {
  const mid = Math.floor(arr.length / 2);
  const nums = [...arr].sort((a, b) => a - b);
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};

export const getBorderRadius = (nodeBorderRadius: ThemeBorderRadiusCandidatePerNode): [number, number] => {
  const divBr = nodeBorderRadius[NODE_NAME.div];
  const orderedBorderRadius = Object.entries(divBr).sort((m, n) => n[1] - m[1]);
  const mostUsedBorderRadius = orderedBorderRadius[0];

  let option1;
  let option2;
  // check if the most frequently used border radius is in perceptible range from DEFAULT_BORDER_RADIUS
  if (+mostUsedBorderRadius[0] - DEFAULT_BORDER_RADIUS <= 4) {
    option1 = +mostUsedBorderRadius[0];
    option2 = (2.5 * option1) | 0;
  } else {
    option1 = DEFAULT_BORDER_RADIUS;
    option2 = +mostUsedBorderRadius[0];
  }

  return [option1, option2];
};

export const getThemeData = async (
  anonymousDemoId: string,
  imagesUrl: string[],
  lookAndFeelRequirement: string,
  taskType: 'create' | 'update',
  exisitingPalette?: guide_theme
): Promise<suggest_guide_theme | null> => {
  try {
    if (imagesUrl.length <= 0) throw new Error('Images not found');
    const imageUrl = imagesUrl[Math.floor(imagesUrl.length / 2)];
    // imageUrl needs to be from private bucket pvt so upload it and use that url.
    // ref on query parameters: https://stackoverflow.com/a/55265139
    const response = await fetch(`${imageUrl}?x-request=xhr`);
    const blob = await response.blob();
    const imageName = `unmarked_image_${anonymousDemoId}.jpeg`;
    const file = new File([blob], `temp${Math.random()}`, { type: 'image/jpeg' });
    const pvtImageUrl = await uploadMarkedImageToAws('image/jpeg', anonymousDemoId, imageName, file);

    const refs: RefForMMV[] = [
      { id: 1, url: removeBaseUrl(THEME_BASE_IMAGE_URL) },
      { id: 2, url: removeBaseUrl(pvtImageUrl), type: 'image/jpeg' }
    ];

    const payload: ThemeForGuideV1 = {
      v: 1,
      type: LLMOpsType.ThemeSuggestionForGuides,
      thread: `${anonymousDemoId}|theme_suggestion_for_guides`,
      model: 'default',
      user_payload: {
        theme_objective: lookAndFeelRequirement,
        refsForMMV: refs,
        exisiting_palette: exisitingPalette
      }
    };

    const toolUse = await handleLlmApi(payload);
    const inp = toolUse.input as suggest_guide_theme;
    const fallbackBgColor = '#ffffff';
    const relevantColor = getRelevantColors(fallbackBgColor);
    const themeData : suggest_guide_theme = {
      backgroundColor: inp.backgroundColor || fallbackBgColor,
      borderRadius: inp.borderRadius || 4,
      borderColor: inp.borderColor || relevantColor.selection,
      primaryColor: inp.primaryColor || relevantColor.primary,
      fontColor: inp.fontColor || relevantColor.font
    };
    return themeData;
  } catch (err) {
    handleRaiseDeferredErrorWithAnnonymousId(err, 'Failed to generate theme data', anonymousDemoId);
    return null;
  }
};

const defaultCategory = 'marketing';

const removeBaseUrl = (url:string): string => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.substring(1);
};

export const getAllDemoAnnotationText = async (
  anonymousDemoId: string,
  refsForMMV: RefForMMV[],
  aboutProject: string,
  demoObjective: string,
  baseAiData: create_guides_router,
  updateProgress: (val: number)=>void,
  metaData: string,
): Promise<AiData> => {
  const completeDemoData: AiData = { items: [] };
  try {
    // TODO - addd last 3 screen for step-by-step guide
    const BATCH_SIZE = 5;
    const totalBatch = Math.ceil(refsForMMV.length / BATCH_SIZE);
    const usecase: CreateNewDemoV1['user_payload']['usecase'] = baseAiData.categoryOfDemo === 'step-by-step'
      ? 'step-by-step-guide'
      : baseAiData.categoryOfDemo === 'na'
        ? defaultCategory : baseAiData.categoryOfDemo;

    const demoState: DemoState[] = [];
    for (let i = 0; i < totalBatch; i++) {
      const start = i * BATCH_SIZE;
      const end = start + BATCH_SIZE;

      const urlsForBatch = refsForMMV.slice(start, end);
      const parsedUrlForBatch = urlsForBatch.map(item => ({
        id: item.id,
        url: removeBaseUrl(item.url)
      }));

      const payload: CreateNewDemoV1 = {
        v: 1,
        type: LLMOpsType.CreateDemoPerUsecase,
        model: 'default',
        user_payload: {
          usecase,
          totalBatch,
          currentBatch: i + 1,
          demoState: JSON.stringify(demoState),
          product_details: aboutProject,
          demo_objective: demoObjective,
          functional_requirement: baseAiData.functionalRequirement,
          refsForMMV: parsedUrlForBatch,
          req: metaData
        },
        thread: `${anonymousDemoId}|create-demo-per-use-case`
      };

      const batchResp = await getDemoAnnotationText(payload);
      const batchDemoState : DemoState[] = batchResp.items.map(item => ({
        id: item.screenId,
        text: item.text,
        nextButtonText: item.nextButtonText
      }));

      demoState.push(...batchDemoState);
      completeDemoData.items.push(...batchResp.items as any);

      const progress = Math.min(((i + 1) / totalBatch) * 100, 95);
      updateProgress(progress);
    }

    return completeDemoData;
  } catch (err) {
    handleRaiseDeferredErrorWithAnnonymousId(err, 'Failed to generate annotation text data', anonymousDemoId);
    return completeDemoData;
  }
};

const getDemoAnnotationText = async (payload: CreateNewDemoV1): Promise<
create_guides_marketing_p | create_guides_step_by_step_p
> => {
  const toolUse = await handleLlmApi(payload);
  let richAiData = toolUse.input as create_guides_marketing | create_guides_step_by_step;

  if (richAiData && richAiData.items) {
    richAiData = {
      items: richAiData.items.map(item => ({
        richText: item.richText || '',
        screenId: item.screenId === undefined ? randomScreenId() : item.screenId,
        element: item.element || LLM_MARK_COLORS[0],
        nextButtonText: item.nextButtonText || '',
        skip: item.skip
      }))
    };
  }
  const annTexts = addTextToDemoAnnRichText(richAiData);
  return annTexts;
};

export const createDemoUsingAI = async (
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string
): Promise<create_guides_router | null> => {
  try {
    const payload : RouterForTypeOfDemoCreation = {
      v: 1,
      type: LLMOpsType.CreateDemoRouter,
      model: 'default',
      user_payload: {
        product_details: productDetails,
        demo_objective: demoObjective
      },
      thread: `${anonymousDemoId}|${LLMOpsType.CreateDemoRouter}`,
    };

    const toolUse = await handleLlmApi(payload);
    const result = processLLMDemoRouterResponse(toolUse);
    return result;
  } catch (err) {
    const msg = 'Failed to generate AI router data';
    handleRaiseDeferredErrorWithAnnonymousId(err, msg, anonymousDemoId);
    return null;
  }
};

const processLLMDemoRouterResponse = (toolUse: ToolUseBlockParam): create_guides_router => {
  const inp = toolUse.input as create_guides_router;
  const result: create_guides_router = {
    categoryOfDemo: inp.categoryOfDemo || defaultCategory,
    functionalRequirement: inp.functionalRequirement || '',
    lookAndFeelRequirement: inp.lookAndFeelRequirement || ''
  };

  if (!['marketing', 'product', 'step-by-step'].includes(result.categoryOfDemo)) {
    result.categoryOfDemo = defaultCategory;
  }

  return result;
};

export const getDemoMetaData = async (
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
  refsForMMV: RefForMMV[],
  demoCategory: create_guides_router['categoryOfDemo'],
  subs: P_RespSubscription | null
): Promise<{metaData: string, screenCleanup: number[]}> => {
  try {
    let newRefsForMMV = [...refsForMMV];
    if (!isActiveBusinessPlan(subs)) {
      newRefsForMMV = refsForMMV.slice(0, Math.min(refsForMMV.length, 10));
    }
    const parsedRefsForMMV = newRefsForMMV.map(item => ({
      id: item.id,
      url: removeBaseUrl(item.url)
    }));

    const metReq = demoCategory === 'step-by-step' ? 'user_intent' : 'product_enablement';
    const payload: DemoMetadata = {
      v: 1,
      type: LLMOpsType.DemoMetadata,
      model: 'default',
      user_payload: {
        demo_objective: demoObjective,
        product_details: productDetails,
        metReq,
        refsForMMV: parsedRefsForMMV
      },
      thread: `${anonymousDemoId}|${LLMOpsType.DemoMetadata}`
    };

    const toolUse = await handleLlmApi(payload);
    const richAnnData = toolUse.input as demo_metadata;

    // TODO - uncomment when we need to use screen_cleanup
    // const screenCleanup = richAnnData.screen_cleanup && Array.isArray(richAnnData.screen_cleanup) ? richAnnData.screen_cleanup : [];

    let screenCleanup :number[] = [];
    if (metReq === 'product_enablement' && richAnnData.product_enablement) {
      // TODO[now]
      screenCleanup = [];
      return { screenCleanup, metaData: richAnnData.product_enablement };
    }

    if (metReq === 'user_intent' && richAnnData.user_intent) {
      screenCleanup = [];
      return { screenCleanup, metaData: richAnnData.user_intent };
    }

    return { metaData: '', screenCleanup };
  } catch (err) {
    handleRaiseDeferredErrorWithAnnonymousId(err, 'Failed to generate metadata', anonymousDemoId);
    return { metaData: '', screenCleanup: [] };
  }
};

export const postProcessAIText = async (
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
  demoState: string,
  shouldBreakIntoModule: boolean,
  moduleRequirement?: string
): Promise<post_process_demo_p | null> => {
  try {
    const payload : PostProcessDemoV1 = {
      v: 1,
      type: LLMOpsType.PostProcessDemo,
      model: 'default',
      user_payload: {
        product_details: productDetails,
        demo_objective: demoObjective,
        module_recommendations: shouldBreakIntoModule ? moduleRequirement || 'yes' : 'no',
        demo_state: demoState
      },
      thread: `${anonymousDemoId}|${LLMOpsType.PostProcessDemo}`,
    };

    const toolUse = await handleLlmApi(payload);
    const richAnnData = toolUse.input as post_process_demo;

    const normalizedRichAnnData: post_process_demo = {
      title: richAnnData.title || '',
      description: richAnnData.description || '',
      updateCurrentDemoStateContent: richAnnData.updateCurrentDemoStateContent || [],
      modules: richAnnData.modules || [],
      demo_intro_guide: {
        richText: richAnnData.demo_intro_guide.richText || '',
        nextButtonText: richAnnData.demo_intro_guide.nextButtonText || ''
      },
      demo_outro_guide: {
        richText: richAnnData.demo_outro_guide.richText || '',
        nextButtonText: richAnnData.demo_outro_guide.nextButtonText || ''
      }
    };

    const annTexts = addTextToPostProcessRichText(normalizedRichAnnData);
    return annTexts;
  } catch (err) {
    handleRaiseDeferredErrorWithAnnonymousId(err, 'Failed to postprocess AI data', anonymousDemoId);
    return null;
  }
};

export const getElpathFromCandidate = (
  replaceWithImgScreen: boolean,
  currElpath: string,
  currAiData: AiItem | null,
  anonymousDemoId: string,
  ctx?: InteractionCtxWithCandidateElpath,
): string => {
  let index = 0;
  try {
    if (!currAiData || !ctx || ctx.candidates.length === 0) return currElpath;
    if (replaceWithImgScreen) return currElpath;
    const color = currAiData.element;
    index = LLM_MARK_COLORS.indexOf(color);
    if (index < 0 || index > ctx.candidates.length - 1) return currElpath;
    return ctx.candidates[index].elPath;
  } catch (err) {
    const sentryData = {
      candidateArr: ctx?.candidates,
      aiData: currAiData,
      anonymousDemoId,
      index
    };

    sentryCaptureException(
      new Error('Failed to get elPath from candidate for anonymousDemoId '),
      JSON.stringify(sentryData),
      'elPathFromCandidate.txt'
    );
    return currElpath;
  }
};

const addTextToPostProcessRichText = (richAiData: post_process_demo): post_process_demo_p => {
  const aiTextData:post_process_demo_p = {
    ...richAiData,
    title: richAiData.title.substring(0, 250),
    demo_intro_guide: {
      ...richAiData.demo_intro_guide,
      text: extractTextFromHTMLString(richAiData.demo_intro_guide.richText)
    },
    demo_outro_guide: {
      ...richAiData.demo_outro_guide,
      text: extractTextFromHTMLString(richAiData.demo_outro_guide.richText)
    },
    updateCurrentDemoStateContent: richAiData.updateCurrentDemoStateContent
    && richAiData.updateCurrentDemoStateContent.map(content => ({
      ...content,
      text: extractTextFromHTMLString(content.richText)
    })),
    modules: richAiData.modules && richAiData.modules.map(module => ({
      ...module,
      module_intro_guide: module.module_intro_guide
        ? {
          ...module.module_intro_guide,
          text: extractTextFromHTMLString(module.module_intro_guide.richText)
        } : undefined
    }))
  };
  return aiTextData;
};

const addTextToDemoAnnRichText = (richAiData: create_guides_marketing | create_guides_step_by_step): AiData => ({
  ...richAiData,
  items: richAiData.items.map(item => ({
    ...item,
    text: extractTextFromHTMLString(item.richText)
  }))
});

export const randomScreenId = (): number => Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1)) + Number.MAX_SAFE_INTEGER;

export const getDemoRouterFromExistingDemo = async (anonymousDemoId: string): Promise<create_guides_router> => {
  const defaultData: create_guides_router = {
    categoryOfDemo: 'marketing',
    functionalRequirement: '',
    lookAndFeelRequirement: '',
  };

  try {
    const toolUse = await llmRunsCall(anonymousDemoId, LLMOpsType.CreateDemoRouter);
    if (!toolUse) {
      return defaultData;
    }

    const result = processLLMDemoRouterResponse(toolUse);
    return result;
  } catch (err) {
    handleRaiseDeferredErrorWithAnnonymousId(err, 'Failed to get demo router data', anonymousDemoId);
    return defaultData;
  }
};

const llmRunsCall = async (anonymousDemoId: string, opsType: LLMOpsType) : Promise<ToolUseBlockParam | null> => {
  const thread_id = `${anonymousDemoId}|${opsType}`;
  const resp = await api<null, ApiResp<LLMOps[]>>(`/llmruns/${thread_id}`, {
    auth: true,
  });

  const respData = resp.data;
  if (!respData || respData.length === 0 || !respData[0].data) {
    return null;
  }

  const responseData = respData[0].data as LLMRunData;
  const assistantMessage = responseData.messages.find((data) => data.role === 'assistant');

  if (!assistantMessage || assistantMessage.content.length === 0) {
    return null;
  }

  const assistantMessageContent = assistantMessage!.content[0] as ToolUseBlockParam;
  if (assistantMessageContent.name !== opsType) {
    return null;
  }

  return assistantMessageContent;
};

export const deleteSurveyStatusFromLocalStore = (): void => {
  localStorage.removeItem(`seenSurvey_${SURVEY_ID}`);
};
