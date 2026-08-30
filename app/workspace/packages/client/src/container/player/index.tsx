import React, { MutableRefObject, Suspense, lazy } from 'react';
import { connect } from 'react-redux';
import {
  JourneyData, IAnnotationButtonType, IAnnotationConfig, ITourDataOpts, ITourLoaderData,
  LoadingStatus, ScreenData,
} from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { FrameSettings, Responsiveness, ScreenType } from '@fable/common/dist/api-contract';
import { loadScreenAndData, loadTourAndData, removeScreenDataForRids, updateElPathKey } from '../../action/creator';
import * as GTags from '../../common-styled';
import PreviewWithEditsAndAnRO from '../../component/screen-editor/preview-with-edits-and-annotations-readonly';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import createAdjacencyList, { ScreenAdjacencyList, bfsTraverse, QueueNode } from '../../screen-adjacency-list';
import { withRouter, WithRouterProps } from '../../router-hoc';
import {
  AnnotationPerScreen,
  EditItem,
  NavFn,
  FlowProgress,
  InternalEvents,
  Payload_JourneySwitch,
  Payload_DemoLoadingStarted,
  Payload_DemoLoadingFinished,
  queryData,
  TourMainValidity,
  ScreenSizeData,
  IframePos,
  ElPathKey,
  ExtMsg,
  Payload_UpdateDemo,
  Payload_Navigation,
  VoiceoverMediaState,
  Payload_TrackerAnnInfo,
  Payload_AnnotationPos,
  INTERACTIVE_MODE,
} from '../../types';
import {
  openTourExternalLink,
  getAnnotationsPerScreen,
  getJourneyProgress,
  saveJourneyProgress,
  getCurrentFlowMain,
  updateAllAnnotationsForTour,
  updateAllAnnotations,
  getSearchParamData,
  getTourMainValidity,
  preloadImagesInTour,
  isTourResponsive,
  isLandscapeMode,
  isEventValid,
  getMobileOperatingSystem,
  fillLeadFormForAllAnnotationsForTour,
  fillLeadFormForAllAnnotations,
  getIsMobileSize,
  shouldReduceMotionForMobile,
  getProcessedJourney,
  isMobileOperatingSystem,
  isFrameSettingsValidValue,
  combineAllEdits,
  ParsedQueryResult,
  getPersVarsDataFromQueryParams,
  getAllOrderedAnnotationsInTour,
  isMediaAnnotation,
  isVideoAnnotation,
  getBorderRadiusForAnnotation,
  getExportBaseUrl,
} from '../../utils';
import { removeSessionId } from '../../analytics/utils';
import {
  AnnotationSerialIdMap,
  getAnnotationSerialIdMap
} from '../../component/annotation/ops';
import FullScreenLoader from '../../component/loader-editor/full-screen-loader';
import { ANN_ZOOMED, DEMO_LOADED_AFTER_AI_UPDATE, HEADER_CTA, IFRAME_BASE_URL, SCREEN_DIFFS_SUPPORTED_VERSION, SCREEN_SIZE_MSG } from '../../constants';
import { emitEvent } from '../../internal-events';
import MainValidityInfo from './main-validity-info';
import { CtaClickedInternal, CtaFrom } from '../../analytics/types';
import { FableLeadContactProps, JourneyNameIndexData, UserFromQueryParams, addToGlobalAppData } from '../../global';
import { isSerNodeDifferent } from '../../component/screen-editor/utils/diffs/get-diffs';
import RotateScreenModal from './rotate-srn-modal';
import DemoProgressBar from '../../component/demo-progress-bar';
// TODO handle this as this will always import journey menu increasing bundle size
import { getMenu } from '../../component/journey-menu';
import DemoFrame from '../../component/demo-frame/demo-frame';
import ViewDemoOverlay from './view-demo-overlay';
import { IAnnotationConfigWithScreenId } from '../../component/annotation/annotation-config-utils';
import VoiceoverControl from '../../component/voiceover-control';
import Tracker from './tracker';
import AnnotationMedia from '../../component/annotation/media-player';
import InfoCon from '../../component/info-con';

const JourneyMenu = lazy(() => import('../../component/journey-menu'));
interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (
    rid: string,
    loadPublishedData: boolean,
    ts: string | null,
    freshLoading: boolean,
    persVarData: {
    text: Record<string, string>,
    dataset: ParsedQueryResult,
  } | null,
  exportedTourParam: boolean,
  baseUrl: string
) => Promise<void>,
  loadScreenAndData: (rid: string, isPreloading: boolean, loadPublishedDataFor?: P_RespTour, isForExportedTour?:boolean, baseUrl?: string) => void,
  updateElpathKey: (elPathKey: ElPathKey) => void,
  removeScreenDataForRids: (ids: number[]) => Promise<void>,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (
    rid,
    loadPublishedData,
    ts: string | null,
    freshLoading: boolean,
    persVarsData,
    exportedTourParam: boolean,
    baseUrl: string
  ) => dispatch(
    loadTourAndData(rid, true, freshLoading, loadPublishedData, ts, false, true, persVarsData, exportedTourParam, baseUrl)
  ),
  loadScreenAndData: (rid, isPreloading, loadPublishedDataFor, isForExportedTour, baseUrl) => dispatch(
    loadScreenAndData(rid, true, isPreloading, loadPublishedDataFor, isForExportedTour, baseUrl)
  ),
  updateElpathKey: (elPathKey: ElPathKey) => dispatch(updateElPathKey(elPathKey)),
  removeScreenDataForRids: (ids: number[]) => dispatch(removeScreenDataForRids(ids)),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screenDataAcrossScreens: Record<string, ScreenData>;
  allScreens: P_RespScreen[];
  isTourLoaded: boolean;
  allAnnotations: Record<string, IAnnotationConfig[]>;
  tourOpts: ITourDataOpts | null;
  editsAcrossScreens: Record<string, EditItem[]>;
  isScreenLoaded: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  tourLoaderData: ITourLoaderData | null;
  journey: JourneyData | null;
  elpathKey: ElPathKey;
  globalEdits: EditItem[];
  annotationsInOrder: IAnnotationConfigWithScreenId[] | null;
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const tourOpts = state.default.remoteTourOpts;
  let allAnnotationsForTour = getAnnotationsPerScreen(state);
  let allAnnotations = state.default.remoteAnnotations;
  const annotationsInOrder = state.default.tourLoaded ? getAllOrderedAnnotationsInTour(
    allAnnotationsForTour,
    state.default.journey,
    tourOpts ? tourOpts.main : ''
  ) : null;
  // TODO: this calculation is done every time any state changes in the redux. For performance
  // improvement, this should be moved to component state and these calculations should be made
  // only when the relevant redux state changes
  const params = new URL(window.location.href).searchParams; // these are base params
  const searchParam = params.get('c');
  const paramData: queryData | null = getSearchParamData(searchParam);

  if (paramData && paramData.ha) {
    allAnnotationsForTour = updateAllAnnotationsForTour(allAnnotationsForTour);
    allAnnotations = updateAllAnnotations(allAnnotations);
  }

  // todo: move to component did mount
  const queryParams: Record<string, string> = {};
  params.forEach((v, k) => queryParams[k] = v);

  if (Object.entries(queryParams).length) {
    allAnnotationsForTour = fillLeadFormForAllAnnotationsForTour(allAnnotationsForTour, queryParams);
    allAnnotations = fillLeadFormForAllAnnotations(allAnnotations, queryParams);
  }

  return {
    tour: state.default.currentTour,
    tourLoaderData: state.default.tourLoaderData,
    // screen: state.default.currentScreen,
    screenDataAcrossScreens: state.default.screenData,
    isTourLoaded: state.default.tourLoaded,
    allScreens: state.default.currentTour?.screens || [],
    allAnnotations,
    tourOpts,
    isScreenLoaded: state.default.screenLoadingStatus === LoadingStatus.Done,
    editsAcrossScreens: state.default.remoteEdits,
    allAnnotationsForTour,
    journey: state.default.journey,
    elpathKey: state.default.elpathKey,
    globalEdits: state.default.remoteGlobalEdits,
    annotationsInOrder
  };
};

interface IOwnProps {
  title: string;
  staging: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenRid?: string;
    annotationId?: string;
  }>;

interface IOwnStateProps {
  initialScreenRid: string;
  initiallyPrerenderedScreens: Record<string, boolean>;
  isMinLoaderTimeDone: boolean;
  isJourneyMenuOpen: boolean;
  annotationSerialIdMap: AnnotationSerialIdMap;
  currentFlowMain: string;
  tourMainValidity: TourMainValidity;
  screenSizeData: Record<string, ScreenSizeData>;
  showRotateScreenModal: boolean;
  isIOSPhone: boolean;
  screenPrerenderCount: number;
  previewReplayerKey: number;
  frameSetting: FrameSettings;
  allScreensLocal: P_RespScreen[];
  showViewDemo: boolean;
  isMediaPlaying: boolean;
  firstAnnRefId: string;
  showVoiceoverControl: boolean;
  trackerAnnInfo: Payload_TrackerAnnInfo | null;
  trackerPos: {
    centerX: number,
    centerY: number,
  } | null,
  currAnnRefId: string,
  annPos: Payload_AnnotationPos | null;
  showShadowAroundFrame: boolean;
  interactiveMode: INTERACTIVE_MODE;
  isVoiceoverAppliedToAtleastOneAnnInDemo: boolean;
  exportedTourParam: boolean;
  baseUrl: string;
}

interface ScreenInfo {
  type: typeof SCREEN_SIZE_MSG,
  scaleFactor: number,
  screenId: number,
  iframePos: IframePos
}

interface HeaderCta {
  type: typeof HEADER_CTA,
  ctaFrom: CtaFrom,
  btnId: string,
  url: string,
  btnTxt: string,
  tourId: number,
  annId: string
}

interface AnnZoomed extends Payload_Navigation {
  type: typeof ANN_ZOOMED,
  centerX: number,
  centerY: number,
}

export interface OnNavigationEvent extends Partial<Event> {
  detail?: Payload_Navigation
}

interface OnAnnPosUpdate extends Partial<Event> {
  detail?: Payload_AnnotationPos;
}

class Player extends React.PureComponent<IProps, IOwnStateProps> {
  private adjList: ScreenAdjacencyList | null = null;

  private renderSlots: Record<string, number> = {};

  private frameRefs: Record<number, React.RefObject<HTMLIFrameElement | null>> = {};

  private loadedScreenIds: Set<number> = new Set<number>();

  private iframesToPrerenderIds: Set<number> = new Set<number>();

  private localJourneyProgress: Record<string, FlowProgress[]> = getJourneyProgress();

  private loadedScreenHosts: Set<string> = new Set<string>();

  private isLoadingCompleteMsgSentRef: MutableRefObject<boolean | null>;

  private queryData: queryData | null = getSearchParamData(this.props.searchParams.get('c'));

  private areDiffsAppliedSrnMap = new Map<string, boolean>();

  private isMobileSize: boolean = getIsMobileSize();

  private shouldSkipLeadForm: boolean = false;

  private paramsFrameSettingValue: FrameSettings | null = null;

  private playerRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private mediaRef: React.MutableRefObject<AnnotationMedia | null> = React.createRef();

  constructor(props: IProps) {
    super(props);

    this.state = {
      tourMainValidity: TourMainValidity.Valid,
      initialScreenRid: '',
      initiallyPrerenderedScreens: {},
      isMinLoaderTimeDone: false,
      isJourneyMenuOpen: false,
      annotationSerialIdMap: {},
      currentFlowMain: '',
      screenSizeData: {},
      showRotateScreenModal: false,
      isIOSPhone: getMobileOperatingSystem() === 'iOS',
      screenPrerenderCount: 2,
      previewReplayerKey: Math.random(),
      frameSetting: (this.props.tour?.info.frameSettings || FrameSettings.NOFRAME),
      allScreensLocal: this.props.allScreens,
      showViewDemo: false,
      isMediaPlaying: true,
      firstAnnRefId: '',
      showVoiceoverControl: false,
      trackerAnnInfo: null,
      trackerPos: null,
      currAnnRefId: '',
      annPos: null,
      showShadowAroundFrame: false,
      interactiveMode: INTERACTIVE_MODE.INTERACTIVE_TOUR,
      isVoiceoverAppliedToAtleastOneAnnInDemo: false,
      exportedTourParam: false,
      baseUrl: window.location.origin
    };

    this.isLoadingCompleteMsgSentRef = React.createRef<boolean>();
  }

  receiveMessage = async (e: MessageEvent<ScreenInfo | HeaderCta | Payload_UpdateDemo | AnnZoomed>): Promise<void> => {
    if (!isEventValid(e)) return;

    if (e.data.type === ANN_ZOOMED) {
      const data = e.data as AnnZoomed;
      this.setState({
        trackerPos: {
          centerX: data.centerX,
          centerY: data.centerY
        },
        trackerAnnInfo: {
          currentAnnotationRefId: data.currentAnnotationRefId,
          annotationType: data.annConfigType
        }
      });
    }
    if (e.data.type === SCREEN_SIZE_MSG) {
      if ((e.data as any).propogated) return;
      const data = e.data as ScreenInfo;
      this.setState(prevS => {
        const currScreenData: ScreenSizeData = {
          iframePos: data.iframePos,
          scaleFactor: data.scaleFactor
        };
        return {
          screenSizeData: { ...prevS.screenSizeData, [data.screenId]: currScreenData }
        };
      });

      // Propagate the data to the parent iframes
      window.parent && window.parent.postMessage({ ...e.data, propogated: true }, '*');
    }

    if (e.data.type === HEADER_CTA) {
      const data = e.data as HeaderCta;
      emitEvent<CtaClickedInternal>(InternalEvents.OnCtaClicked, {
        ctaFrom: data.ctaFrom,
        btnId: data.btnId,
        url: data.url,
        btnTxt: data.btnTxt
      });
    }

    if (e.data.type === ExtMsg.UpdateDemo) {
      const demoUpdated = e.data.demoUpdated;
      if (!demoUpdated) return;

      const ts = this.props.searchParams.get('_ts');
      const params = new URL(window.location.href).searchParams;
      const persVarsData = getPersVarsDataFromQueryParams(params);

      await this.props.loadTourWithDataAndCorrespondingScreens(
        this.props.match.params.tourId,
        !this.props.staging,
        ts,
        false,
        persVarsData,
        this.state.exportedTourParam,
        this.state.baseUrl
      );

      window.parent && window.parent.postMessage({
        type: DEMO_LOADED_AFTER_AI_UPDATE
      }, '*');

      if (this.props.annotationsInOrder) {
        const isVoiceoverAppliedToAtleastOneAnnInDemo = this.getIsVoiceoverAppliedToAtleastOneAnnInTheDemo();
        this.setState(prevState => ({ showVoiceoverControl: isVoiceoverAppliedToAtleastOneAnnInDemo
          && prevState.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO,
        isVoiceoverAppliedToAtleastOneAnnInDemo
        }));
      }
    }
  };

  componentDidMount(): void {
    document.title = this.props.title;
    const ts = this.props.searchParams.get('_ts');
    const exportedTour = this.props.searchParams.get('exportedTour');
    const baseUrl = getExportBaseUrl(window.location.origin);

    this.setState({ exportedTourParam: exportedTour === '1' });
    const params = new URL(window.location.href).searchParams;

    const mode = params.get('mode');
    const interactiveMode = mode && mode === 'video' ? INTERACTIVE_MODE.INTERACTIVE_VIDEO
      : INTERACTIVE_MODE.INTERACTIVE_TOUR;
    this.setState({ interactiveMode });

    const persVarsData = getPersVarsDataFromQueryParams(params);

    this.props.loadTourWithDataAndCorrespondingScreens(
      this.props.match.params.tourId,
      !this.props.staging,
      ts,
      true,
      persVarsData,
      exportedTour === '1',
      baseUrl
    );

    if (this.props.searchParams.get('skiplf') === '1') {
      this.shouldSkipLeadForm = true;
    }

    const queryFrameSetting = this.props.searchParams.get('fframe');
    if (queryFrameSetting) {
      this.paramsFrameSettingValue = isFrameSettingsValidValue(queryFrameSetting);
    }

    const shadow = this.props.searchParams.get('shadow');
    if (shadow && !Number.isNaN(+shadow)) {
      this.setState({ showShadowAroundFrame: Boolean(+shadow) });
    }

    window.addEventListener('beforeunload', removeSessionId);
    window.addEventListener('message', this.receiveMessage, false);
    document.addEventListener(InternalEvents.OnNavigation, this.handleCurrentAnn);
    document.addEventListener(InternalEvents.OnSelectedElChange, this.onAnnPositionChange);
  }

  onAnnPositionChange = (event: OnAnnPosUpdate): void => {
    this.setState({ annPos: event.detail! });
  };

  createRenderSlotsBasedOnDomain(): Record<string, number> {
    let slotIdx = 0;
    const slots: Record<string, number> = {};
    for (const screen of this.props.allScreens) {
      const url = screen.urlStructured;
      if (url.hostname in slots) continue;
      slots[url.hostname] = slotIdx++;
    }
    return slots;
  }

  preRender(): void {
    this.renderSlots = this.createRenderSlotsBasedOnDomain();
    this.adjList = createAdjacencyList(this.props.allAnnotations, this.props.allScreens);
    for (const screen of this.props.allScreens) {
      this.frameRefs[screen.id] = React.createRef();
    }
  }

  // TODO [optimization]: get prev n next screens to prerender in one function call
  async getScreenDataPreloaded(
    screen: P_RespScreen,
    tour: P_RespTour,
    nextScreenPrerenderCount: number,
    startScreens: P_RespScreen[],
    initalScreenLoad: boolean,
  ): Promise<P_RespScreen[]> {
    const nextScreensToPrerender = bfsTraverse(
      this.adjList!,
      startScreens,
      nextScreenPrerenderCount,
      'next'
    );
    const screenIdsToBeAdded : Set<number> = new Set();

    screenIdsToBeAdded.add(screen.id);
    const prevScreensToPrerender = bfsTraverse(this.adjList!, [screen], 1, 'prev');
    const prerenderList = this.removeDuplicateScreens([
      ...nextScreensToPrerender.traversedNodes,
      ...prevScreensToPrerender.traversedNodes,
    ]).filter(({ screen: s }) => {
      screenIdsToBeAdded.add(s.id);
      return !this.loadedScreenIds.has(s.id);
    });

    if (shouldReduceMotionForMobile(this.props.tourOpts)) {
      // if mobile phone we remove unecessary screenData so that memory usage is reduced.
      this.loadedScreenIds.clear();
      await this.props.removeScreenDataForRids(Array.from(screenIdsToBeAdded));
    }
    prerenderList.forEach(({ screen: s }) => this.loadedScreenIds.add(s.id));

    prerenderList.map(({ screen: s }) => this.props.loadScreenAndData(
      s.rid,
      s.id !== screen.id,
      this.props.staging ? undefined : tour,
      this.state.exportedTourParam,
      this.state.baseUrl
    ));

    return this.handleIframesToPrerender(prerenderList, initalScreenLoad);
  }

  handleIframesToPrerender = (initialPrerenderList: QueueNode[], initalScreenLoad: boolean): P_RespScreen[] => {
    initialPrerenderList
      .sort((a, b) => a.level - b.level);

    const filteredPrerenderList: P_RespScreen[] = [];

    if (initalScreenLoad) {
      const prerenderListGroupedByScreen: Record<number, P_RespScreen[]> = {};
      initialPrerenderList.forEach(node => {
        const key = node.startScreenId;
        if (prerenderListGroupedByScreen[key]) {
          prerenderListGroupedByScreen[key].push(node.screen);
        } else {
          prerenderListGroupedByScreen[key] = [node.screen];
        }
      });

      Object.entries(prerenderListGroupedByScreen).forEach(([key, screens]) => {
        const loadedScreenHosts: Set<string> = new Set<string>();

        screens.forEach(currScreen => {
          const currScreenHost = currScreen.urlStructured.host;

          if (!loadedScreenHosts.has(currScreenHost)) {
            filteredPrerenderList.push(currScreen);
            loadedScreenHosts.add(currScreenHost);
            this.loadedScreenHosts.add(currScreenHost);
          }
        });
      });
    } else {
      initialPrerenderList.forEach(node => {
        const currScreenHost = node.screen.urlStructured.host;
        if (!this.loadedScreenHosts.has(currScreenHost)) {
          filteredPrerenderList.push(node.screen);
          this.loadedScreenHosts.add(currScreenHost);
        }
      });
    }

    filteredPrerenderList.forEach(screen => this.iframesToPrerenderIds.add(screen.id));

    return filteredPrerenderList;
  };

  // eslint-disable-next-line class-methods-use-this
  removeDuplicateScreens(nodes: QueueNode[]): QueueNode[] {
    const uniqueScreens: QueueNode[] = [];
    const traversedScreenIds: Record<string, boolean> = {};

    nodes.forEach(node => {
      if (!traversedScreenIds[node.screen.id]) {
        uniqueScreens.push(node);
        traversedScreenIds[node.screen.id] = true;
      }
    });

    return uniqueScreens;
  }

  navigateToMain = (): void => {
    this.preRender();
    const opts = this.props.tourOpts;

    if (this.props.match.params.screenRid && this.props.match.params.annotationId) return;

    const tourMainValidity = getTourMainValidity(opts, this.props.journey, this.props.allAnnotationsForTour);
    if (tourMainValidity !== TourMainValidity.Valid) {
      this.setState({ tourMainValidity });
      return;
    }

    this.goToMain();
  };

  goToMain = (): void => {
    const opts = this.props.tourOpts;
    const flowIdx = Number(this.props.searchParams.get('n'));
    let main = '';
    if (flowIdx && flowIdx >= 1 && this.props.journey && this.props.journey.flows.length >= flowIdx) {
      main = this.props.journey!.flows[flowIdx - 1].main;
    } else if (this.isJourneyAdded()) {
      main = this.props.journey!.flows[0].main;
    } else {
      main = opts!.main;
    }
    if (main.length !== 0) {
      const annId = main.split('/')[1];
      this.setState({ firstAnnRefId: annId });
    }
    this.navigateTo(main);
  };

  initJourneyProgress = (
    main: string,
    totalSteps: number,
    currentTourId: number
  ): void => {
    const flowProgress: FlowProgress = {
      main,
      completedSteps: 0,
      totalSteps
    };

    if (this.localJourneyProgress[currentTourId]) {
      // if the flow is already saved in local store we are updating total steps if its less than new total steps.
      let flowExistInJourney = false;
      this.localJourneyProgress[currentTourId].forEach((storeFlow) => {
        if (storeFlow.main === flowProgress.main) {
          flowExistInJourney = true;
          if (storeFlow.totalSteps < flowProgress.totalSteps) {
            storeFlow.totalSteps = flowProgress.totalSteps;
          }
        }
      });
      if (!flowExistInJourney) { this.localJourneyProgress[currentTourId].push(flowProgress); }
    } else this.localJourneyProgress[currentTourId] = [flowProgress];
  };

  updateJourneyProgress = (stepNumber: number): void => {
    const tourId = this.props.tour!.id;
    const currentFlowIdx = this.localJourneyProgress[tourId].findIndex(
      (tour) => tour.main === this.state.currentFlowMain
    );

    const currentFlowProgress = this.localJourneyProgress[tourId];
    if (currentFlowIdx !== -1) {
      currentFlowProgress[currentFlowIdx].completedSteps = Math.max(
        stepNumber,
        currentFlowProgress[currentFlowIdx].completedSteps
      );
      this.localJourneyProgress[tourId] = currentFlowProgress;
      saveJourneyProgress(this.localJourneyProgress);
    }
  };

  setSerialMapAndJoruneyProgress = (annotationSerialIdMap: AnnotationSerialIdMap): AnnotationSerialIdMap => {
    for (const flow of this.props.journey!.flows) {
      const main = flow.main;
      const annId = main.split('/')[1];
      const idxs = annotationSerialIdMap[annId];
      this.initJourneyProgress(main, idxs.len, this.props.tour!.id);
    }
    saveJourneyProgress(this.localJourneyProgress);
    return annotationSerialIdMap;
  };

  setCurrentFlowMain(anId: string = this.props.match.params.annotationId!): void {
    const main = getCurrentFlowMain(
      anId,
      this.props.allAnnotationsForTour,
      this.props.journey!.flows
    );

    if (main !== this.state.currentFlowMain) {
      emitEvent<Partial<Payload_JourneySwitch>>(InternalEvents.JourneySwitch, {
        fromJourney: this.state.currentFlowMain,
        currentJourney: main,
      });
      this.addJourneyToGlobalData(main);
      this.setState({ currentFlowMain: main });
    }
  }

  // Handle query parameters for analytics / handle utm parameters
  handleParams(): void {
    const searchParams = new URLSearchParams(this.props.location.search);
    const userEmail: string | undefined = searchParams.get('email') ?? undefined;
    const firstName = searchParams.get('first_name') ?? undefined;
    const lastName = searchParams.get('last_name') ?? undefined;
    const org = searchParams.get('org') ?? undefined;
    const phone = searchParams.get('phone') ?? undefined;

    const userFromQueryParams: UserFromQueryParams = {
      first_name: firstName,
      last_name: lastName,
      org,
      phone,
      email: userEmail
    };

    addToGlobalAppData('userFromQueryParams', userFromQueryParams);

    const pk_val = userFromQueryParams[this.props.tourOpts!.lf_pkf];
    if (pk_val || userEmail || firstName || lastName || org || phone) {
      emitEvent<Partial<FableLeadContactProps>>(InternalEvents.LeadAssign, {
        pk_key: this.props.tourOpts!.lf_pkf,
        pk_val: pk_val as string,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        phone,
        org
      });
    }
  }

  handleResponsiveness = (): void => {
    if (!getIsMobileSize()) return;
    if (this.props.tour && isTourResponsive(this.props.tour)) {
      this.props.updateElpathKey('m_id');
      return;
    }

    if (!isLandscapeMode(window.screen.orientation.type)) {
      this.setState({ showRotateScreenModal: true });
      window.screen.orientation.addEventListener('change', this.screenOrientationChangeListener);
    }
  };

  screenOrientationChangeListener = (e: ScreenOrientationEventMap['change']): void => {
    const evTarget = e.target as ScreenOrientation;
    if (evTarget.type.includes('landscape')) {
      this.setState({ showRotateScreenModal: false });
      window.screen.orientation.removeEventListener('change', this.screenOrientationChangeListener);
    }
  };

  // eslint-disable-next-line class-methods-use-this
  getProgressMap(entries: Array<[string, AnnotationPerScreen[]]>): AnnotationSerialIdMap {
    let start = 0;
    let map: AnnotationSerialIdMap = {};
    for (const entry of entries) {
      [map, start] = getAnnotationSerialIdMap(entry[0], entry[1], map, start);
    }
    return map;
  }

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    const prevTourLoaded = prevProps.isTourLoaded;
    const currTourLoaded = this.props.isTourLoaded;
    const prevScreenRId = prevProps.match.params.screenRid;
    const currScreenRId = this.props.match.params.screenRid;
    if (!currScreenRId && currScreenRId !== prevScreenRId) {
      this.navigateToMain();
    }

    let firstTimeTourLoading = false;
    if (currTourLoaded && prevTourLoaded !== currTourLoaded) {
      firstTimeTourLoading = true;
      this.handleParams();
      const prerenderCount = shouldReduceMotionForMobile(this.props.tourOpts) ? 1 : 2;
      this.setState({ screenPrerenderCount: prerenderCount });
      this.handleResponsiveness();

      addToGlobalAppData('anonymousDemoId', this.props.tour?.info.annDemoId);
      let annotationSerialIdMap: AnnotationSerialIdMap = {};
      let isJourneyMenuOpen = false;
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
        isJourneyMenuOpen = this.isJourneyMenuDefaultOpen();
        annotationSerialIdMap = this.getProgressMap(
          this.props.journey!.flows.map(flow => [flow.main, this.props.allAnnotationsForTour])
        );
        this.setSerialMapAndJoruneyProgress(annotationSerialIdMap);
      } else {
        annotationSerialIdMap = this.props.tourOpts
          ? this.getProgressMap([[this.props.tourOpts.main, this.props.allAnnotationsForTour]]) : {};
      }
      addToGlobalAppData('annotationSerialIdMap', annotationSerialIdMap);
      this.setState({ annotationSerialIdMap, isJourneyMenuOpen });
      this.navigateToMain();
      emitEvent<Partial<Payload_DemoLoadingStarted>>(InternalEvents.DemoLoadingStarted, {});

      // add images to preload
      const main = this.props.tourOpts ? this.props.tourOpts.main : '';
      preloadImagesInTour(this.props.allAnnotationsForTour, this.props.journey, main);

      const isVoiceoverAppliedToAtleastOneAnnInDemo = this.getIsVoiceoverAppliedToAtleastOneAnnInTheDemo();

      // for backward compatibility
      // when in /embed or /live route we display voiceover if isVideo is undefined and voiceover
      // exist in demo even if mode=video param is not added in demo url
      let interactiveMode = prevState.interactiveMode;
      if (this.props.tour!.info.isVideo === undefined && interactiveMode !== INTERACTIVE_MODE.INTERACTIVE_VIDEO
         && !this.props.staging) {
        interactiveMode = isVoiceoverAppliedToAtleastOneAnnInDemo ? INTERACTIVE_MODE.INTERACTIVE_VIDEO
          : INTERACTIVE_MODE.INTERACTIVE_TOUR;
      }

      // When the first ann has a voiceover that is played as an audio element,
      // browser's might block the autoplay, a dedicated overlay with view demo forces
      // user interact with the page before autoplay happens.
      const isVoiceoverAppliedToFirstAnn = Boolean(this.props.annotationsInOrder
         && this.props.annotationsInOrder.length > 0
         && (isMediaAnnotation(
           this.props.annotationsInOrder[0],
           interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO
         )));

      this.setState({
        frameSetting: this.paramsFrameSettingValue || this.props.tour!.info.frameSettings,
        showViewDemo: isVoiceoverAppliedToFirstAnn,
        isVoiceoverAppliedToAtleastOneAnnInDemo,
        interactiveMode
      });
    }
    if (currScreenRId && (!firstTimeTourLoading && currScreenRId !== prevScreenRId)) {
      if (this.state.initialScreenRid) {
        const screen = this.getScreenAtId(currScreenRId, 'rid');
        const startScreens = bfsTraverse(
          this.adjList!,
          [screen],
          this.state.screenPrerenderCount,
          'next'
        ).lastLevelNodes;
        this.getScreenDataPreloaded(screen, this.props.tour!, 1, startScreens, false);
      } else {
        // this happens when the user uses the tourURl as  /tour/tourid without any screen id
        // in this case, we navigate to main, hence, firstTimeLoading is false
        // but still we are rendering the screens for the first time
        this.initialScreenLoad(currScreenRId, this.props.tour!);
        if (this.isJourneyAdded()) {
          this.setCurrentFlowMain();
        }
      }
    }
    // this happens when the user uses the tourUrl as /tour/tourid/screenid/annid
    if (currScreenRId && firstTimeTourLoading) {
      this.initialScreenLoad(currScreenRId, this.props.tour!);
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
      }
    }

    if (this.props.tourLoaderData !== prevProps.tourLoaderData && this.props.tourLoaderData) {
      const timer = setTimeout(() => {
        this.setState({ isMinLoaderTimeDone: true });
        clearTimeout(timer);
      }, 300);
    }

    if (this.props.allScreens !== prevProps.allScreens) {
      // we are sorting this as the order between the iframes was shuffling when integrating quilly in preview route
      // due to this annotation is not displayed as frameAsset load is called on shuffling
      this.setState({ allScreensLocal:
        this.props.allScreens
          .sort((m, n) => m.id - n.id)
      });
    }
  }

  getIsVoiceoverAppliedToAtleastOneAnnInTheDemo = (): boolean => {
    if (!this.props.annotationsInOrder) return false;

    const isVoiceoverAppliedToAtleastOneAnnInDemo = this.props.annotationsInOrder.findIndex(
      ann => ann.voiceover !== null
    ) !== -1;
    return isVoiceoverAppliedToAtleastOneAnnInDemo;
  };

  getScreenAtId(id: string, key: keyof P_RespScreen): P_RespScreen {
    const screen = this.props.allScreens.find(s => s[key]!.toString() === id);
    if (!screen) {
      throw new Error(`No screen found for ${key}=${id}`);
    }
    return screen;
  }

  async initialScreenLoad(screenRid: string, tour: P_RespTour): Promise<void> {
    const obj: Record<string, boolean> = {};
    const startScreens: P_RespScreen[] = [];

    const mainScreen = this.getScreenAtId(screenRid, 'rid');
    startScreens.push(mainScreen);

    if (this.isJourneyAdded()) {
      if (!shouldReduceMotionForMobile(this.props.tourOpts)) {
        this.props.journey!.flows.forEach((flow) => {
          const flowScreenId = flow.main.split('/')[0];
          const flowScreen = this.getScreenAtId(flowScreenId, 'id');
          startScreens.push(this.props.allScreens.find(s => s.rid === flowScreen.rid)!);
        });
      }
    }

    const initiallyPrerenderedScreens = await this.getScreenDataPreloaded(
      mainScreen,
      tour,
      this.state.screenPrerenderCount,
      startScreens,
      true
    );
    initiallyPrerenderedScreens.forEach(screen => obj[screen.rid] = false);

    this.setState({ initialScreenRid: screenRid, initiallyPrerenderedScreens: obj });
  }

  componentWillUnmount(): void {
    window.removeEventListener('beforeunload', removeSessionId);
    window.removeEventListener('message', this.receiveMessage, false);
    document.removeEventListener(InternalEvents.OnNavigation, this.handleCurrentAnn);
    document.addEventListener(InternalEvents.OnSelectedElChange, this.onAnnPositionChange);
  }

  handleCurrentAnn = (e: OnNavigationEvent): void => {
    if (e.type === InternalEvents.OnNavigation && e.detail) {
      this.setState(prevS => ({
        showVoiceoverControl: e.detail!.annotationType === 'voiceover'
        && prevS.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO,
        currAnnRefId: e.detail!.currentAnnotationRefId
      }));
    }
  };

  handleMediaStateChange = (mediaState: VoiceoverMediaState): void => {
    const isMediaPlaying = mediaState === 'playing';
    this.setState((prevS) => ({
      isMediaPlaying,
      showVoiceoverControl: mediaState === 'overlay' ? false : prevS.showVoiceoverControl
    }));
  };

  isLoadingComplete = (): boolean => this.props.isTourLoaded && this.props.isScreenLoaded;

  navigateTo = (qualifiedAnnotaionUri: string): void => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.allScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/${IFRAME_BASE_URL}/demo/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}${window.location.search}`;
      this.props.navigate(url);
      if (anId && this.isJourneyAdded()) {
        this.setCurrentFlowMain(anId);
      }
    } else {
      raiseDeferredError(new Error(`Can't navigate because screenId ${screenId} is not found`));
    }
  };

  navFn: NavFn = (uri, type, openInSameTab) => {
    if (type === 'annotation-hotspot') {
      this.navigateTo(uri);
    } else {
      openTourExternalLink(uri, openInSameTab);
    }
  };

  navigateToAndLogEvent = (journeyData: JourneyData, type: 'annotation-hotspot' | 'abs'): void => {
    this.navFn(journeyData.cta!.navigateTo._val, type);
    Promise.resolve().then(() => {
      if (type !== 'annotation-hotspot') {
        emitEvent<CtaClickedInternal>(InternalEvents.OnCtaClicked, {
          ctaFrom: CtaFrom.Module,
          url: journeyData.cta!.navigateTo._val,
          btnTxt: journeyData.cta!.text._val
        });
      }
    });
  };

  getScreenWithRenderSlot(currentScreenId: number): {
    slotIdx: number;
    screen: P_RespScreen;
    isRenderReady: boolean;
    screenData: ScreenData;
    screenEdits: EditItem[];
  }[] {
    const v = this.state.allScreensLocal
      .map(screen => {
        const slotIdx = this.renderSlots[screen.id];
        const screenData = this.props.screenDataAcrossScreens[screen.id];
        const screenEdits = this.props.editsAcrossScreens[screen.id];
        const isRenderReady = !!(screenData && screenEdits);
        return {
          slotIdx, // this is not yet used anywhere
          screen,
          isRenderReady,
          screenData,
          screenEdits
        };
      }).filter(slot => {
        const isNavigatedToCurrScreen = slot.screen.id === currentScreenId;
        if (isNavigatedToCurrScreen) return true;

        // In ios few demos were crashing, so we are rendering only one iframe at a time.
        // this is done to reduce the number of nodes in the DOM
        if (this.state.isIOSPhone) {
          return false;
        }

        const shouldPrerenderIframe = this.iframesToPrerenderIds.has(slot.screen.id);
        if (shouldPrerenderIframe) return true;

        if (!slot.isRenderReady || !this.adjList) return false;

        const adjListEntries = this.adjList[slot.screen.id];

        const willDiffsApply = this.shouldDiffApply(
          {
            screen: slot.screen,
            data: slot.screenData,
          },
          [...adjListEntries[1], ...adjListEntries[2]].map(screen => ({
            screen,
            data: this.props.screenDataAcrossScreens[screen.id]
          }))
        );

        return !willDiffsApply;
      });
    return v;
  }

  // eslint-disable-next-line class-methods-use-this
  shouldDiffApply(
    screen1Slot: {
      screen: P_RespScreen,
      data: ScreenData
    },
    screen2Slot: {
      screen: P_RespScreen,
      data: ScreenData
    }[]
  ): boolean {
    const isAnyOfThemScreenImg = screen1Slot.screen.type === ScreenType.Img
      || screen2Slot.find(slot => slot.screen.type === ScreenType.Img);
    const isCurrScreenOldVersioned = screen1Slot.data?.version !== SCREEN_DIFFS_SUPPORTED_VERSION;
    const isAdjacentScreensOldVersioned = screen2Slot
      .filter(slot => slot.data)
      .find(slot => slot.data.version !== SCREEN_DIFFS_SUPPORTED_VERSION);
    const isHostDifferent = screen2Slot.find(slot => screen1Slot.screen.urlStructured.host
      !== slot.screen.urlStructured.host);
    const isHTMLNodeDifferent = screen2Slot
      .filter(slot => slot.data)
      .find(slot => isSerNodeDifferent(screen1Slot.data.docTree, slot.data.docTree));

    return !(isAnyOfThemScreenImg || isCurrScreenOldVersioned || isAdjacentScreensOldVersioned
      || isHostDifferent || isHTMLNodeDifferent);
  }

  getCurrScreenId(): number {
    if (!this.props.match.params.screenRid) return -1;
    if (this.props.allScreens.length === 0) return -1;
    return this.props.allScreens.find(screen => screen.rid === this.props.match.params.screenRid!)!.id;
  }

  isInitialPrerenderingComplete(): boolean {
    if (!this.state.isMinLoaderTimeDone) {
      return false;
    }

    if (!this.state.isIOSPhone) {
      for (const isPrerendered of Object.values(this.state.initiallyPrerenderedScreens)) {
        if (!isPrerendered) return false;
      }
    }

    if (!this.props.isTourLoaded) {
      return false;
    }

    if (this.isJourneyAdded() && !this.state.currentFlowMain) {
      return false;
    }

    if (!this.isLoadingCompleteMsgSentRef.current) {
      emitEvent<Partial<Payload_DemoLoadingFinished>>(InternalEvents.DemoLoadingFinished, {});
      this.isLoadingCompleteMsgSentRef.current = true;
    }
    return true;
  }

  isJourneyAdded = (): boolean => (this.props.journey !== null && this.props.journey.flows.length !== 0);

  shouldHideJourney = (): boolean => Boolean(this.isMobileSize && this.props.journey?.hideModuleOnMobile);

  isJourneyMenuDefaultOpen = (): boolean => Boolean(this.props.journey && !this.props.journey.hideModuleOnLoad);

  addJourneyToGlobalData = (main: string): void => {
    let journeyIndex = -1;
    const journeyName = this.props.journey?.flows
      .find((flow, index) => {
        if (flow.main === main) {
          journeyIndex = index;
          return true;
        }
        return false;
      })?.header1 || null;

    const journeyData: JourneyNameIndexData = {
      journeyName,
      journeyIndex
    };

    addToGlobalAppData('journeyData', journeyData);
  };

  playMediaAnnn = (): void => {
    this.mediaRef.current?.playMediaFromStart();
  };

  handleDemoPlayAndPause = (): void => {
    this.mediaRef.current?.handlePlayPauseVoiceoverFromScreen();
  };

  replayDemo = (): void => {
    this.goToMain();
    this.setState({
      previewReplayerKey: Math.random(),
      firstAnnRefId: ''
    });
  };

  render(): JSX.Element {
    if (this.state.tourMainValidity !== TourMainValidity.Valid) {
      return <MainValidityInfo
        tourMainValidity={this.state.tourMainValidity}
        tourRid={this.props.tour!.rid}
      />;
    }

    if (this.state.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO
       && !this.state.isVoiceoverAppliedToAtleastOneAnnInDemo && this.props.isTourLoaded) {
      return (
        <div>
          <InfoCon
            heading="Interactive Video is not created for this demo"
            body={<></>}
            btns={[
              {
                type: 'primary',
                onClick: () => { this.setState({ interactiveMode: INTERACTIVE_MODE.INTERACTIVE_TOUR }); },
                text: 'Go to Interactive Tour',
              },
            ]}
          />
        </div>
      );
    }

    // TODO the border color has to match with frame theme. Right now these values are hard coded in two place.
    // One hard coding is done here, another hard coding is done in demo-frame
    let frameBorderColor: string | undefined;
    if (this.state.frameSetting === FrameSettings.LIGHT) frameBorderColor = '#dedad6';
    else if (this.state.frameSetting === FrameSettings.DARK) frameBorderColor = '#171717';
    else frameBorderColor = '#616161';

    const preRendering = !this.isInitialPrerenderingComplete();
    // We don't show frame on mobile
    const frame = isMobileOperatingSystem() ? FrameSettings.NOFRAME : this.state.frameSetting;
    const currScreenId = this.getCurrScreenId();
    const annScaleFactor = this.state.screenSizeData[currScreenId]
      ? this.state.screenSizeData[currScreenId].scaleFactor : 1;

    if (this.props.tour && this.props.tour.info.locked) {
      return (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '1rem'
        }}
        >
          <img src="/not-found.png" alt="not-found" />
          <div>
            This <GTags.OurLink href="https://sharefable.com" inline>Fable demo</GTags.OurLink> is not available any more
          </div>
        </div>
      );
    }

    return (
      <GTags.BodyCon
        style={{
          height: '100%',
          padding: 0,
          overflow: 'hidden',
          gap: '0',
          position: 'relative',
        }}
        ref={this.playerRef}
      >
        {
          this.isLoadingComplete() && this.getScreenWithRenderSlot(currScreenId)
            .filter(c => c.isRenderReady)
            .map(config => (
              <PreviewWithEditsAndAnRO
                isFromScreenEditor={false}
                resizeSignal={1}
                journey={this.props.journey!}
                screenRidOnWhichDiffsAreApplied={this.props.match.params.screenRid!}
                key={config.screen.id + this.state.previewReplayerKey}
                innerRef={this.frameRefs[config.screen.id]}
                screen={config.screen}
                hidden={config.screen.id !== currScreenId}
                screenData={config.screenData}
                navigate={this.navFn}
                playMode
                stashAnnIfAny={false}
                onBeforeFrameBodyDisplay={() => { }}
                allAnnotationsForScreen={this.props.allAnnotations[config.screen.id]}
                tourDataOpts={this.props.tourOpts!}
                allEdits={combineAllEdits([...config.screenEdits, ...this.props.globalEdits])}
                globalEdits={this.props.globalEdits}
                toAnnotationId={
                  config.screen.id === currScreenId ? this.props.match.params.annotationId || '' : ''
                }
                onFrameAssetLoad={() => {
                  if (this.state.initiallyPrerenderedScreens[config.screen.rid] === false) {
                    this.setState(prev => ({
                      initiallyPrerenderedScreens: {
                        ...prev.initiallyPrerenderedScreens,
                        [config.screen.rid]: true
                      }
                    }));
                  }
                }}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                tour={this.props.tour!}
                allScreensData={this.props.screenDataAcrossScreens}
                allScreens={this.props.allScreens}
                editsAcrossScreens={this.props.editsAcrossScreens}
                preRenderNextScreen={(screen: P_RespScreen) => {
                  const startScreens = bfsTraverse(
                    this.adjList!,
                    [screen],
                    this.state.screenPrerenderCount,
                    'next'
                  ).lastLevelNodes;
                  this.getScreenDataPreloaded(screen, this.props.tour!, 1, startScreens, false);
                }}
                updateCurrentFlowMain={(btnConfig: IAnnotationButtonType, main?: string) => {
                  const currentMain = this.state.currentFlowMain;
                  let newMain = currentMain;
                  if (main) {
                    newMain = main;
                  } else {
                    const allFlows = this.props.journey!.flows.map(flow => flow.main) || [];
                    const currentFlowMainIndex = allFlows.findIndex((flow) => flow === currentMain);
                    if (btnConfig === 'next' && currentFlowMainIndex < allFlows.length - 1) {
                      newMain = allFlows[currentFlowMainIndex + 1];
                      this.navFn(newMain, 'annotation-hotspot');
                    } else if (btnConfig === 'prev' && currentFlowMainIndex > 0) {
                      newMain = allFlows[currentFlowMainIndex - 1];
                      this.navFn(newMain, 'annotation-hotspot');
                    }
                    if ((btnConfig === 'next' || btnConfig === 'custom') && currentFlowMainIndex === this.props.journey!.flows.length - 1) {
                      window.parent.postMessage({ type: 'lastAnnotation', demoRid: this.props.tour!.rid }, '*');
                    }
                  }
                }}
                closeJourneyMenu={(): void => {
                  if (this.state.isJourneyMenuOpen) { this.setState({ isJourneyMenuOpen: false }); }
                }}
                updateJourneyProgress={(annRefId: string) => {
                  if (this.state.currentFlowMain) {
                    const currentStepNumber = this.state.annotationSerialIdMap[annRefId].idx;
                    this.updateJourneyProgress(currentStepNumber + 1);
                  }
                }}
                flows={this.props.journey?.flows || []}
                areDiffsAppliedSrnMap={this.areDiffsAppliedSrnMap}
                isResponsive={isTourResponsive(this.props.tour!)}
                elpathKey={this.props.elpathKey}
                updateElPathKey={this.props.updateElpathKey}
                handleMenuOnScreenResize={() => {
                  if (this.state.isJourneyMenuOpen) {
                    this.setState({ isJourneyMenuOpen: false });
                    const timer = setTimeout(() => {
                      this.setState({ isJourneyMenuOpen: true });
                      clearTimeout(timer);
                    }, 100);
                  }
                }}
                shouldSkipLeadForm={this.shouldSkipLeadForm}
                frameSetting={frame}
                borderColor={frameBorderColor}
                isStaging={this.props.staging}
                onIframeClick={() => {
                  this.handleDemoPlayAndPause();
                }}
                showShadowAroundFrame={this.state.showShadowAroundFrame}
                interactiveMode={this.state.interactiveMode}
              />
            ))
        }
        { /* Show tracker only if voiceover is present */}
        {this.state.showVoiceoverControl && this.state.trackerAnnInfo && this.state.trackerPos && this.state.screenSizeData[this.getCurrScreenId()] && <Tracker
          trackerAnnInfo={this.state.trackerAnnInfo}
          screenSizeData={this.state.screenSizeData[this.getCurrScreenId()]}
          trackerPos={this.state.trackerPos}
        />}
        {
          (this.props.tourOpts && this.props.annotationsInOrder
            && this.props.annotationsInOrder.filter(ann => isMediaAnnotation(
              ann,
              this.state.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO
            )).map(ann => (
              <AnnotationMedia
                ref={this.state.annPos && this.state.currAnnRefId === ann.refId
                  ? this.mediaRef : null}
                key={ann.refId}
                borderRadius={getBorderRadiusForAnnotation(
                  ann.positioning,
                  Boolean(this.state.annPos && this.state.annPos.annotationType === 'cover'),
                  this.props.tourOpts!.showFableWatermark._val,
                  this.state.annPos && this.state.currAnnRefId === ann.refId
                    ? this.state.annPos.dir : 'l',
                  this.props.tourOpts!.borderRadius._val
                )}
                playMode
                annFollowPositions={{
                  top: this.state.annPos && this.state.currAnnRefId === ann.refId
                    ? this.state.annPos.top * annScaleFactor
                    + (this.state.screenSizeData[currScreenId]?.iframePos?.top || 0) : -9999999,
                  left: this.state.annPos && this.state.currAnnRefId === ann.refId
                    ? this.state.annPos.left * annScaleFactor
                    + (this.state.screenSizeData[currScreenId]?.iframePos?.left || 0) : -999999,
                  dir: this.state.annPos && this.state.currAnnRefId === ann.refId
                    ? this.state.annPos.dir : 'l'
                }}
                confRefId={this.state.currAnnRefId}
                tourId={parseInt(this.props.match.params.tourId, 10)}
                type={isVideoAnnotation(ann) ? 'video' : 'audio'}
                width={this.state.annPos?.width || -999999}
                height={this.state.annPos?.height || -999999}
                opts={this.props.tourOpts!}
                nav={(dir: 'prev' | 'next' | 'custom', btnId?: string) => {
                  if (dir !== 'custom') {
                  this.frameRefs[currScreenId].current!.contentWindow!.postMessage({
                    type: dir === 'next' ? 'f-go-next-ann' : 'f-go-prev-ann',
                  });
                  } else {
                    this.frameRefs[currScreenId].current!.contentWindow!.postMessage({
                      type: 'f-custom-btn',
                      btnId
                    });
                  }
                }}
                conf={ann}
                annScale={annScaleFactor}
                doNotAutoplayMedia={this.state.showViewDemo ? [this.state.firstAnnRefId] : []}
                handleMediaStateChange={this.handleMediaStateChange}
                screenSizeData={this.state.screenSizeData[currScreenId]}
              />
            )))
        }
        {this.state.screenSizeData[currScreenId]
        && this.props.tourOpts && this.props.tourOpts.showStepNum._val
        && (
        <DemoProgressBar
          bg={this.props.tourOpts.annotationBodyBackgroundColor._val}
          fg={this.props.tourOpts.primaryColor._val}
          textColor={this.props.tourOpts.annotationFontColor._val}
          iframePos={this.state.screenSizeData[currScreenId].iframePos}
          annotationSerialIdMap={this.state.annotationSerialIdMap}
          frame={frame}
        />
        )}
        {frame !== FrameSettings.NOFRAME && this.state.screenSizeData[currScreenId] && (
          <DemoFrame
            mode={this.state.frameSetting}
            screenSizeData={this.state.screenSizeData[currScreenId]}
            modules={this.props.journey}
            currentModuleMain={this.state.currentFlowMain}
            showModule={
              !preRendering
              && this.isJourneyAdded()
              && (!this.queryData || !this.queryData.hm)
              && !this.shouldHideJourney()
            }
            isJourneyMenuOpen={this.state.isJourneyMenuOpen}
            setIsJourneyMenuOpen={() => {
              this.setState(prevState => ({
                isJourneyMenuOpen: !prevState.isJourneyMenuOpen
              }));
            }}
            JourneyMenuComponent={
              getMenu(
                getProcessedJourney(this.props.journey!),
                this.navigateTo,
                () => this.navigateToAndLogEvent(this.props.journey!, 'abs'),
                this.props.tourOpts!,
                this.state.currentFlowMain,
                this.localJourneyProgress[this.props.tour!.id],
                (isMenuOpen: boolean): void => {
                  this.setState({ isJourneyMenuOpen: isMenuOpen });
                },
                this.state.screenSizeData[currScreenId].iframePos.width,
                frame === FrameSettings.LIGHT ? 'light' : 'dark'
              )
            }
            tour={this.props.tour!}
            replayHandler={this.replayDemo}
            makeEmbedFrameFullScreen={() => this.playerRef.current!.requestFullscreen()}
          />
        )}
        <Suspense fallback={null}>
          {
            !preRendering
            && this.isJourneyAdded()
            && (!this.queryData || !this.queryData.hm)
            && !this.shouldHideJourney()
            && (frame === FrameSettings.NOFRAME)
            && (
              <JourneyMenu
                currScreenId={currScreenId}
                journey={this.props.journey!}
                isJourneyMenuOpen={this.state.isJourneyMenuOpen}
                navigateToJourney={this.navigateTo}
                updateJourneyMenu={(isMenuOpen: boolean): void => {
                  this.setState({ isJourneyMenuOpen: isMenuOpen });
                }}
                navigateToCta={() => this.navigateToAndLogEvent(this.props.journey!, 'abs')}
                tourOpts={this.props.tourOpts!}
                currentFlowMain={this.state.currentFlowMain}
                journeyProgress={this.localJourneyProgress[this.props.tour!.id]}
                screenSizeData={this.state.screenSizeData}
              />
            )
          }
        </Suspense>
        {this.props.tourLoaderData && preRendering
          && (
            <FullScreenLoader
              data={this.props.tourLoaderData}
              vpd={this.props.tour!.settings}
              screenSizeData={this.state.screenSizeData[currScreenId]}
              isResponsive={this.props.tour!.responsive2 === Responsiveness.Responsive}
            />
          )}

        {
          this.state.showRotateScreenModal && <RotateScreenModal
            closeModal={() => {
              const journeyMenuOpen = this.isJourneyMenuDefaultOpen();
              this.setState({
                showRotateScreenModal: false,
                isJourneyMenuOpen: journeyMenuOpen
              });
            }}
          />
        }
        {this.state.screenSizeData[currScreenId] && !preRendering && this.state.showViewDemo
        && <ViewDemoOverlay
          screenSizeData={this.state.screenSizeData[currScreenId]}
          onViewDemoClick={() => {
            this.playMediaAnnn();
            this.setState({ showViewDemo: false });
          }}
          showWatermark={this.props.tourOpts?.showFableWatermark._val || false}
        />}
        {this.state.screenSizeData[currScreenId]
         && !this.state.showViewDemo && this.state.showVoiceoverControl
         && (
         <VoiceoverControl
           isWatermarkPresent={this.props.tourOpts?.showFableWatermark._val || false}
           screenSizeData={this.state.screenSizeData[currScreenId]}
           replayScreen={() => this.playMediaAnnn()}
           playPauseVideo={() => this.handleDemoPlayAndPause()}
           isVoiceoverPlaying={this.state.isMediaPlaying}
         />
         )}
        {}
      </GTags.BodyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Player));
