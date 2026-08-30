import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseOutlined,
  CodeFilled,
  EditOutlined,
  InfoCircleFilled,
  InfoCircleOutlined,
  ShareAltOutlined,
  SoundFilled,
  UndoOutlined
} from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { ReqTourPropUpdate } from '@fable/common/dist/api-contract';
import { CmnEvtProp, IAnnotationConfig, LoadingStatus, TourData, TourDataWoScheme, TourScreenEntity } from '@fable/common/dist/types';
import { deepcopy } from '@fable/common/dist/utils';
import { Button as AntButton, Dropdown, MenuProps, Popover, Progress, Tooltip } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  addVoiceOver,
  clearCurrentTourSelection,
  flushTourDataToMasterFile,
  getCustomDomains,
  getSubscriptionOrCheckoutNew,
  loadTourAndData,
  publishTour,
  recreateUsingAI,
  upateTourDataUsingLLM,
  updateTourProp
} from '../../action/creator';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { IAnnotationConfigWithScreenId, clearAnnotationAudio } from '../../component/annotation/annotation-config-utils';
import Button from '../../component/button';
import BuyMoreCredit from '../../component/create-tour/buy-more-credit';
import Header from '../../component/header';
import PersonalVarEditor from '../../component/personal-var-editor/personal-var-editor';
import PublishOptions from '../../component/publish-preview/publish-options';
import { DEMO_LOADED_AFTER_AI_UPDATE, IFRAME_BASE_URL, SCREEN_SIZE_MSG } from '../../constants';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import {
  ExtMsg,
  INTERACTIVE_MODE,
  QuillyInPreviewProgress,
  ScreenSizeData,
  SiteData,
  TourMainValidity
} from '../../types';
import {
  DisplaySize,
  RESP_MOBILE_SRN_HEIGHT,
  RESP_MOBILE_SRN_WIDTH,
  createIframeSrc,
  getAllOrderedAnnotationsInTour,
  getAnnotationsPerScreen,
  getDimensionsBasedOnDisplaySize,
  getTourMainValidity,
  initLLMSurvey,
  isEventValid,
  isMobilePreviewDisplaySize,
  sendPreviewHeaderClick,
  setEventCommonState,
} from '../../utils';
import * as Tags from './styled';
import ShareTourModal from '../../component/publish-preview/share-modal';
import InfoCon from '../../component/info-con';
import { amplitudeShareModalOpen } from '../../amplitude';
import VoiceoverPopup from './voiceover-popup';
import { OurSegmented } from '../../common-styled';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

const progressMap = {
  [QuillyInPreviewProgress.NOT_STARTED]: 0,
  [QuillyInPreviewProgress.ROOT_ROUTER]: 40,
  [QuillyInPreviewProgress.LLM_CALL_FOR_TOUR_UPDATE]: 75,
  [QuillyInPreviewProgress.UPDATE_TOUR]: 90,
  [QuillyInPreviewProgress.LOAD_TOUR]: 99
};
const progressStepOrder: QuillyInPreviewProgress[] = Object.keys(progressMap) as QuillyInPreviewProgress[];

export const VoiceOptions = [
  { label: 'Amber',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Amber.mp3',
    name: 'alloy',
    description: 'Rich & balanced tone that feels like a warm conversation with a trusted friend'
  },
  {
    label: 'Azure',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Azure.mp3',
    name: 'echo',
    description: 'Bright and dynamic voice, perfect for grabbing attention and keeping listeners engaged'
  },
  {
    label: 'Cerise',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Cerise.mp3',
    name: 'fable',
    description: 'Brings stories to life with a smooth, captivating charm that makes every word memorable'
  },
  {
    label: 'Cobalt',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Cobalt.mp3',
    name: 'onyx',
    description: 'Deep, authoritative presence, ideal for serious and impactful messaging'
  },
  {
    label: 'Crimson',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Crimson.mp3',
    name: 'nova',
    description: 'Fresh and energizing, adding a burst of enthusiasm to every message'
  },
  {
    label: 'Pearl',
    audioUrl: 'https://scdna.sharefable.com/audio_samples/Pearl.mp3',
    name: 'shimmer',
    description: 'Gentle and melodic tone creates a soothing listening experience, making it ideal for calm and comforting content'
  }
];

const mapDispatchToProps = (dispatch: any) => ({
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true, true)),
  publishTour: (tour: P_RespTour) => dispatch(publishTour(tour)),
  clearCurrentTour: () => dispatch(clearCurrentTourSelection()),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
  getVanityDomains: () => dispatch(getCustomDomains()),
  upateTourDataUsingLLM: (
    newDemoObjective: string,
    currentAnnotationRefId: string | null,
    updateCompletedStep: (currStep: QuillyInPreviewProgress) => void,
  ) => dispatch(upateTourDataUsingLLM(newDemoObjective, currentAnnotationRefId, updateCompletedStep)),
  flushTourDataToMasterFile:
    (tour: P_RespTour, updatedTour: TourDataWoScheme) => dispatch(flushTourDataToMasterFile(tour, updatedTour)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
  addVoiceOver: (
    tour: P_RespTour,
    allAnnsInOrder: IAnnotationConfigWithScreenId[],
    voice: string,
    updateVoiceoverProgress: (progress: number)=> void
  ) => dispatch(addVoiceOver(tour, allAnnsInOrder, voice, updateVoiceoverProgress)),
  recreateUsingAI: (updateLoading:(step: string)=>void) => dispatch(recreateUsingAI(updateLoading)),
});

const mapStateToProps = (state: TState) => {
  const allAnnotationsForTour = getAnnotationsPerScreen(state);
  const allAnnsInOrder = state.default.tourData ? getAllOrderedAnnotationsInTour(
    allAnnotationsForTour,
    state.default.tourData.journey,
    state.default.tourData.opts.main
  ) : null;
  const tourMainValidity = state.default.tourLoaded && state.default.tourData ? getTourMainValidity(
    state.default.tourData.opts,
    state.default.tourData.journey,
    allAnnotationsForTour
  ) : TourMainValidity.Valid;

  return {
    tour: state.default.currentTour,
    principal: state.default.principal,
    isTourLoaded: state.default.tourLoaded,
    org: state.default.org,
    vanityDomains: state.default.vanityDomains,
    subs: state.default.subs,
    annotationsForScreens: state.default.remoteAnnotations,
    tourData: state.default.tourData,
    updateDemoUsingAIError: state.default.updateDemoUsingAIError,
    globalEdits: state.default.remoteGlobalEdits,
    allAnnsInOrder,
    tourMainValidity,
  };
};

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  WithRouterProps<{ tourId: string }>;

interface IOwnStateProps {
  showReplayOverlay: boolean;
  previewIframeKey: number;
  showShareModal: boolean;
  viewScale: number;
  minimalHeader: boolean;
  embedQueryParams: string;
  showPersVarsEditor: boolean;
  currentAnnRefId: string | null;
  screenSizeData: ScreenSizeData | null;
  newDemoObjective: string;
  quillyProgress: number;
  tourDataEditStack: {id: number, tourData: TourData, description: string}[];
  nextEditId: number;
  activeEditId: number;
  tourUpdateMode: 'ai' | 'history' | 'na';
  placeholderText: string;
  placeholderWordIndex: number;
  prevDescription: string;
  completedStep: QuillyInPreviewProgress | null;
  updateDemoLoadingStatus: LoadingStatus;
  showVoiceoverPopover: boolean;
  sampleVoicePlaying: null | { audio: HTMLAudioElement, name: string };
  selectedVoice: string;
  voiceoverProgress: number;
  isVoiceoverAppliedToAtleastOneAnnInDemo: boolean;
  creditRequiredForVoiceover: number;
  isPublishing: boolean;
  activeSegment: INTERACTIVE_MODE,
  showVoiceoverInsteadOfIframe: boolean;
}

const MAX_EDIT_STACK = 5;
const CREDIT_USED_FOR_LLM_CALL = 2;
const placeholderOptions = [
  'Tell Quilly what modification you\'d want to do in the demo [Beta]',
  'Translate the demo content to Spanish',
  'Personalize demo by addressing by {{ first_name }}',
  'Switch the demo to dark theme',
  'Make the demo content humorous and engaging'
];

class PublishPreview extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private frameConRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private originalQueryParams = '?staging=true';

  private intervalId: NodeJS.Timeout | null = null;

  private placeholderTimer: NodeJS.Timeout | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      screenSizeData: null,
      previewIframeKey: 0,
      showShareModal: false,
      viewScale: 1,
      minimalHeader: false,
      embedQueryParams: this.originalQueryParams,
      showPersVarsEditor: false,
      currentAnnRefId: null,
      newDemoObjective: '',
      quillyProgress: 0,
      tourDataEditStack: [],
      tourUpdateMode: 'na',
      nextEditId: 1,
      activeEditId: -1,
      placeholderText: '',
      placeholderWordIndex: 0,
      prevDescription: '',
      completedStep: null,
      updateDemoLoadingStatus: LoadingStatus.NotStarted,
      showVoiceoverPopover: false,
      sampleVoicePlaying: null,
      selectedVoice: VoiceOptions[0].name,
      voiceoverProgress: 0,
      isVoiceoverAppliedToAtleastOneAnnInDemo: false,
      creditRequiredForVoiceover: 0,
      isPublishing: false,
      activeSegment: INTERACTIVE_MODE.INTERACTIVE_TOUR,
      showVoiceoverInsteadOfIframe: false
    };
  }

  receiveMessage = (e: MessageEvent): void => {
    if (!isEventValid(e)) return;
    if (e.data.type === 'lastAnnotation') {
      this.setState({ showReplayOverlay: true });
      initLLMSurvey();
    } else if (e.data.sender === 'sharefable.com' && e.data.type === ExtMsg.OnNavigation) {
      const annRefId = e.data.payload.currentAnnotationRefId;
      this.setState({ currentAnnRefId: annRefId });
    } else if (e.data.type === SCREEN_SIZE_MSG) {
      this.setState({
        screenSizeData: {
          // TODO fix the types
          iframePos: (e.data as any).iframePos,
          scaleFactor: (e.data as any).scaleFactor
        }
      });
    } else if (e.data.type === DEMO_LOADED_AFTER_AI_UPDATE) {
      this.amplitudeEvtForQuillyTextAreaUsed(true);
      this.resetQuillyProgress();
    }
  };

  resetQuillyProgress = () : void => {
    if (this.state.voiceoverProgress !== 0) {
      const temp = setTimeout(() => {
        this.updateVoiceoverProgress(0);
        clearTimeout(temp);
      }, 5000);
    }

    this.setState({
      newDemoObjective: '',
      completedStep: null,
      updateDemoLoadingStatus: LoadingStatus.NotStarted,
    });
    this.placeholderTimer && clearTimeout(this.placeholderTimer);
    this.placeholderTimer = null;
    this.typewritePlaceholderTextInQuillyTextbox();
    this.intervalId && clearInterval(this.intervalId);
  };

  componentDidMount(): void {
    document.title = this.props.title;

    window.addEventListener('message', this.receiveMessage, false);

    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
    this.showMinimalHeaderIfReq();
    this.props.getVanityDomains();
    this.typewritePlaceholderTextInQuillyTextbox();
    setEventCommonState(CmnEvtProp.TOUR_URL, createIframeSrc(`/demo/${this.props.match.params.tourId}`));
  }

  showMinimalHeaderIfReq(): void {
    const isMinimalHeader = this.props.searchParams.get('i');
    if (isMinimalHeader === '1') {
      this.setState({ minimalHeader: true });
    }
  }

  amplitudeEvtForQuillyTextAreaUsed = (isUpdateSuccessfull: boolean): void => {
    if (this.state.tourUpdateMode !== 'ai') return;
    traceEvent(AMPLITUDE_EVENTS.PREVIEW_DEMO_QUILLY_USED, {
      anonymous_demo_id: this.props.tour!.info.annDemoId || '',
      update_requested: this.state.newDemoObjective,
      is_update_successfull: isUpdateSuccessfull
    }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  };

  handleRecreateUsingAI = async (updateLoading: (step:string)=>void): Promise<void> => {
    await this.props.recreateUsingAI(updateLoading);
    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
  };

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
      if (this.props.searchParams.get('s') !== '3') {
        this.setState({ viewScale: 1 });
      } else {
        const timer = setTimeout(() => {
          const vpdW = RESP_MOBILE_SRN_WIDTH;
          const vpdH = RESP_MOBILE_SRN_HEIGHT;
          const headerHeight = 76;

          const frameConRect = this.frameConRef.current?.getBoundingClientRect();

          if (frameConRect && (frameConRect.width < vpdW || frameConRect.height < vpdH)) {
            const scaleX = frameConRect.width / vpdW;
            const scaleY = (frameConRect.height - headerHeight) / vpdH;
            const scale = Math.round(Math.min(scaleX, scaleY) * 100) / 100;

            this.setState({ viewScale: scale });
          }
          clearTimeout(timer);
        }, 50);
      }
    }

    if (prevProps.searchParams.get('i') !== this.props.searchParams.get('i')) {
      this.showMinimalHeaderIfReq();
    }

    if (prevProps.updateDemoUsingAIError.hasErr !== this.props.updateDemoUsingAIError.hasErr
       && this.props.updateDemoUsingAIError.hasErr) {
      this.amplitudeEvtForQuillyTextAreaUsed(false);
      if (this.props.updateDemoUsingAIError.isSkillNa) {
        traceEvent(
          AMPLITUDE_EVENTS.QUILLY_RETURNED_SKILL_AS_NA,
          {
            update_requested: this.state.newDemoObjective,
          },
          [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
        );
      }
      this.setState({ updateDemoLoadingStatus: LoadingStatus.Error, completedStep: null });
    }

    if (this.state.completedStep !== prevState.completedStep) {
      // load tour in iframe
      if (this.state.completedStep === QuillyInPreviewProgress.UPDATE_TOUR) {
        this.previewFrameRef.current && this.previewFrameRef.current.contentWindow!.postMessage(
          {
            type: ExtMsg.UpdateDemo,
            demoUpdated: true,
          },
          '*'
        );
      }

      // update progress
      const currentStepIdx = progressStepOrder.findIndex((ele) => ele === this.state.completedStep);
      this.setState(ps => (ps.completedStep && { ...ps, quillyProgress: progressMap[ps.completedStep] }));
      const nextStepIdx = Math.min(currentStepIdx + 1, progressStepOrder.length - 1);
      const nextStep = progressStepOrder[nextStepIdx];
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      this.intervalId = setInterval(() => {
        this.setState((ps) => {
          const progress = ps.quillyProgress;

          const newProgress = Math.min(progress + 1, progressMap[nextStep]);

          return { ...ps, quillyProgress: newProgress };
        });
      }, 600);
    }

    if (((this.state.showVoiceoverPopover !== prevState.showVoiceoverPopover && this.state.showVoiceoverPopover)
       || (this.props.isTourLoaded !== prevProps.isTourLoaded))
       && this.props.allAnnsInOrder) {
      // this block handles -> selecting existing voice for a demo, calculating credits required,
      // and showing remove voiceover btn if, voiceover is already applied to demo.

      // selecting existing voice for a demo:
      // Whenever user opens voiceover popup, if voiceover is applied to demo we show voice used instead of
      // voiceOptions[0].name
      let annVoice = VoiceOptions[0].name;
      let isVoiceoverAppliedToTour = false;
      this.props.allAnnsInOrder.forEach((ann) => {
        if (isVoiceoverAppliedToTour) return;
        if (ann.voiceover) {
          isVoiceoverAppliedToTour = true;
          annVoice = ann.voiceover.voiceUsed;
        }
      });

      if (this.state.creditRequiredForVoiceover === 0) {
        this.setState({ creditRequiredForVoiceover: this.props.allAnnsInOrder.length });
      }

      this.setState({ isVoiceoverAppliedToAtleastOneAnnInDemo: isVoiceoverAppliedToTour,
        selectedVoice: annVoice,
      });
    }

    if (this.state.activeSegment !== prevState.activeSegment) {
      let showVoiceoverInsteadOfIframe = false;
      if (!this.state.isVoiceoverAppliedToAtleastOneAnnInDemo && this.state.activeSegment === INTERACTIVE_MODE.INTERACTIVE_VIDEO) {
        showVoiceoverInsteadOfIframe = true;
      }
      this.setState({ showVoiceoverInsteadOfIframe });
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);
  }

  updateDisplaySize = (displaySize: DisplaySize): void => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.set('s', displaySize.toString());
    const updatedUrl = url.pathname + url.search;
    this.props.navigate(updatedUrl);
  };

  handleReplayClick = (): void => {
    this.setState({ showReplayOverlay: false, previewIframeKey: Math.random() });
    sendPreviewHeaderClick();
  };

  private onSiteDataChange = (site: SiteData): void => {
    this.props.updateTourProp(this.props.tour!.rid, 'site', site);
  };

  handleUpdateDisplaySize = (selectedDisplaySize: DisplaySize): void => {
    sendPreviewHeaderClick();
    this.updateDisplaySize(selectedDisplaySize);
  };

  addPrevTourToEditStack = (): void => {
    if (!this.props.tourData) return;
    if (this.props.updateDemoUsingAIError.hasErr) {
      this.setState(prevState => ({
        prevDescription: prevState.newDemoObjective,
        activeEditId: -1
      }));
      return;
    }

    this.setState(prevState => {
      const newEdit = {
        id: prevState.nextEditId,
        description: prevState.prevDescription || 'base',
        tourData: this.props.tourData!
      };

      let allEdits;
      const activeEditIndex = prevState.tourDataEditStack.findIndex(item => item.id === prevState.activeEditId);
      if (activeEditIndex === -1) {
        allEdits = [newEdit, ...prevState.tourDataEditStack].slice(0, MAX_EDIT_STACK);
      } else {
        allEdits = [...prevState.tourDataEditStack.slice(activeEditIndex)].slice(0, MAX_EDIT_STACK);
      }

      return {
        nextEditId: prevState.nextEditId + 1,
        tourDataEditStack: allEdits,
        prevDescription: prevState.newDemoObjective,
        activeEditId: -1
      };
    });
  };

  updateCompletedStep = (currStep: QuillyInPreviewProgress): void => {
    this.setState({ completedStep: currStep });
  };

  handleQuillySubmit = async (isDisabled: boolean): Promise<void> => {
    if (isDisabled) return;
    this.addPrevTourToEditStack();
    this.setState({ tourUpdateMode: 'ai', updateDemoLoadingStatus: LoadingStatus.InProgress });
    this.props.upateTourDataUsingLLM(this.state.newDemoObjective, this.state.currentAnnRefId, this.updateCompletedStep);
  };

  handleHistoryUpdate = async (
    item: {
    id: number;
    tourData: TourData;
    description: string;
  },
    quillyUpdateLoading: boolean
  ): Promise<void> => {
    if (quillyUpdateLoading) return;
    if (this.state.tourUpdateMode === 'ai') this.addPrevTourToEditStack();
    this.setState({
      tourUpdateMode: 'history',
      activeEditId: item.id,
      updateDemoLoadingStatus: LoadingStatus.InProgress
    });
    await this.props.flushTourDataToMasterFile(this.props.tour!, item.tourData);
    this.setState({ completedStep: QuillyInPreviewProgress.UPDATE_TOUR });
    traceEvent(AMPLITUDE_EVENTS.PREVIEW_DEMO_HISTORY_SELECTED, {
      anonymous_demo_id: this.props.tour!.info.annDemoId || '',
      edit_id: item.id,
      edit_description: item.description
    }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  };

  // TODO use react-type-animation package
  // This also has some experiencial issue -- once the sentence is finished, the next sentence is started immediately
  // without waiting for the user to wait
  typewritePlaceholderTextInQuillyTextbox = (): void => {
    const wordIndex = this.state.placeholderWordIndex;
    const placeholder = this.state.placeholderText;
    const currentWord = placeholderOptions[wordIndex];

    if (placeholder.length < currentWord.length) {
      this.setState(prevState => ({
        placeholderText: currentWord.substring(0, prevState.placeholderText.length + 1)
      }));
      this.placeholderTimer = setTimeout(this.typewritePlaceholderTextInQuillyTextbox, 100);
    } else {
      this.setState(prevState => ({
        placeholderText: '',
        placeholderWordIndex: (prevState.placeholderWordIndex + 1) % placeholderOptions.length
      }));
      this.placeholderTimer = setTimeout(() => {
        this.typewritePlaceholderTextInQuillyTextbox();
      }, 500);
    }
  };

  handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    if (this.placeholderTimer) {
      clearTimeout(this.placeholderTimer);
      this.placeholderTimer = null;
    } else if (e.target.value.length === 0) {
      this.typewritePlaceholderTextInQuillyTextbox();
    }
    this.setState({ newDemoObjective: e.target.value });
  };

  handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, quillySubmitDisabled: boolean): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      this.handleQuillySubmit(quillySubmitDisabled);
    }
  };

  updateVoiceoverProgress = (progress:number): void => {
    this.setState({ voiceoverProgress: progress });
  };

  handleVoiceover = async (): Promise<void> => {
    this.closeVoiceoverPopup();
    if (!this.props.allAnnsInOrder) return;
    this.updateVoiceoverProgress(5);

    const isVoiceoverAdded = await this.props.addVoiceOver(
      this.props.tour as P_RespTour,
      this.props.allAnnsInOrder!,
      this.state.selectedVoice.toLowerCase(),
      this.updateVoiceoverProgress
    );
    isVoiceoverAdded && this.previewFrameRef.current && this.previewFrameRef.current.contentWindow!.postMessage(
      {
        type: ExtMsg.UpdateDemo,
        demoUpdated: true,
      },
      '*'
    );
    this.updateVoiceoverProgress(100);
    this.setState({ isVoiceoverAppliedToAtleastOneAnnInDemo: true, showVoiceoverInsteadOfIframe: false });
    traceEvent(
      AMPLITUDE_EVENTS.VOICEOVER_APPLIED,
      {
        voice_used: this.state.selectedVoice
      },
      [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
    );

    // clear progress tick after few seconds
    const tempTimer = setTimeout(() => {
      this.updateVoiceoverProgress(0);
      clearTimeout(tempTimer);
    }, 3000);
  };

  playPauseSampleVoice = (e: typeof VoiceOptions[0]): void => {
    if (this.state.sampleVoicePlaying) {
      this.state.sampleVoicePlaying.audio.pause();
      this.setState({ sampleVoicePlaying: null });
    }
    if (!this.state.sampleVoicePlaying || this.state.sampleVoicePlaying.name !== e.name) {
      // Only play audio if a differnet voice is  played or if no voice is being played
      const audio = new Audio(e.audioUrl);
      audio.play();
      audio.addEventListener('ended', () => {
        this.setState({ sampleVoicePlaying: null });
      });
      this.setState({ sampleVoicePlaying: { audio, name: e.name } });
    }
  };

  // eslint-disable-next-line class-methods-use-this
  updateTourDataToRemoveVoiceOver = (
    tourData: TourData,
  ): TourData => {
    const newTourData = deepcopy(tourData);

    for (const entity of Object.values(newTourData.entities)) {
      if (entity.type === 'screen') {
        const screenEntity = entity as TourScreenEntity;
        for (const ind in (screenEntity.annotations)) {
          if (screenEntity.annotations[ind].voiceover) {
            const newAnnConfig = clearAnnotationAudio(screenEntity.annotations[ind] as IAnnotationConfig);
            screenEntity.annotations[ind] = { ...newAnnConfig };
          }
        }
      }
    }
    return newTourData;
  };

  handleRemoveVoiceover = async (): Promise<void> => {
    this.closeVoiceoverPopup();
    const currentInfo = { ...this.props.tour!.info };
    currentInfo.isVideo = false;
    await this.props.updateTourProp(this.props.tour!.rid, 'info', currentInfo);

    const updatedTourData = this.updateTourDataToRemoveVoiceOver(this.props.tourData!);
    await this.props.flushTourDataToMasterFile(this.props.tour!, updatedTourData);
    this.previewFrameRef.current && this.previewFrameRef.current.contentWindow!.postMessage(
      {
        type: ExtMsg.UpdateDemo,
        demoUpdated: true,
      },
      '*'
    );
  };

  closeVoiceoverPopup = (): void => {
    this.setState({ showVoiceoverPopover: false });
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);
    const isMobilePreview = isMobilePreviewDisplaySize(+displaySize);
    const embedParams = isMobilePreview ? '&fframe=noframe' : '';
    const modeParam = this.state.activeSegment === INTERACTIVE_MODE.INTERACTIVE_VIDEO ? '&mode=video' : '';
    const quillyUpdateLoading = this.state.updateDemoLoadingStatus === LoadingStatus.InProgress
     || this.state.voiceoverProgress !== 0;
    const quillySubmitDisabled = quillyUpdateLoading || this.state.newDemoObjective.trim().length === 0;
    const items: MenuProps['items'] = this.state.tourDataEditStack.length === 0
      ? [{
        label: <p>No history available, please make <br />some edit using quilly first</p>,
        key: 0
      }]
      : this.state.tourDataEditStack.map((item, index) => {
        const t = {
          label: (
            <div
              onClick={() => this.handleHistoryUpdate(item, quillyUpdateLoading)}
              style={{
                backgroundColor: item.id === this.state.activeEditId ? 'whitesmoke' : 'white',
                padding: '0.3rem 1rem'
              }}
            >
              Edit {item.id}
              <br />
              <span className="typ-sm">{item.description}</span>
            </div>
          ),
          key: index,
          style: { padding: 0 },
        };
        return t;
      });

    if (this.props.tour && this.props.tour.info.locked) {
      return (
        <InfoCon
          heading="This demo is locked!"
          body={(
            <>
              <p className="typ-reg">
                You cannot access this demo as you're on a free plan. Please upgrade to access this demo!
              </p>
              <p className="typ-reg">
                If you have any questions, you can message our team using the in-app chat option.
              </p>
            </>

          )}
          btns={[{
            linkTo: '/billing',
            text: 'Upgrade now!',
            type: 'primary'
          }, {
            linkTo: '/demos',
            text: 'See all demos',
            type: 'secondary'
          }]}
        />
      );
    }

    return (
      <Tags.Con ref={this.frameConRef}>
        <Tags.HeaderCon>
          {this.props.tour && <Header
            tourMainValidity={this.props.tourMainValidity}
            subs={this.props.subs}
            org={this.props.org}
            userGuidesToShow={['Sharing or embedding your interactive demo']}
            showOnboardingGuides
            onLogoClicked={() => this.props.clearCurrentTour()}
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={(
              <div
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span className="overflow-ellipsis">
                  {this.props.tour.displayName}
                </span>
              </div>
            )}
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour.rid}`} style={{ color: 'black' }}>
                <AntButton
                  size="small"
                  className="edit-btn"
                  type="default"
                  onClick={() => {
                    sendPreviewHeaderClick();
                    traceEvent(
                      AMPLITUDE_EVENTS.EDIT_DEMO,
                      {
                        edit_clicked_from: 'analytics'
                      },
                      [CmnEvtProp.EMAIL]
                    );
                  }}
                >
                  Edit demo
                </AntButton>
              </Link>
            )]}
            principal={this.props.principal}
            tour={this.props.tour}
            publishTour={this.props.publishTour}
            publishOptions={<PublishOptions
              handleReplayClick={this.handleReplayClick}
              tour={this.props.tour}
              selectedDisplaySize={+displaySize}
              setSelectedDisplaySize={this.handleUpdateDisplaySize}
              minimalHeader={this.state.minimalHeader}
              recreateUsingAI={this.handleRecreateUsingAI}
              annotationsForScreens={this.props.annotationsForScreens}
              subs={this.props.subs}
            />}
            onSiteDataChange={this.onSiteDataChange}
            showCalendar
            minimalHeader={this.state.minimalHeader}
            vanityDomains={this.props.vanityDomains}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
            clickedFrom="preview"
          />}
        </Tags.HeaderCon>
        {this.props.tour && (
          <div style={{ marginTop: '1rem' }}>
            <OurSegmented
              options={[INTERACTIVE_MODE.INTERACTIVE_TOUR, INTERACTIVE_MODE.INTERACTIVE_VIDEO]}
              onChange={(value) => {
                traceEvent(
                  AMPLITUDE_EVENTS.PREVIEW_MODE_CHANGED,
                  {
                    demo_mode: INTERACTIVE_MODE.INTERACTIVE_TOUR === value
                      ? INTERACTIVE_MODE.INTERACTIVE_TOUR : INTERACTIVE_MODE.INTERACTIVE_VIDEO
                  },
                  [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                );

                this.setState({ activeSegment: INTERACTIVE_MODE.INTERACTIVE_TOUR === value
                  ? INTERACTIVE_MODE.INTERACTIVE_TOUR : INTERACTIVE_MODE.INTERACTIVE_VIDEO,
                showVoiceoverInsteadOfIframe: false,
                showReplayOverlay: false });
              }}
            />
          </div>
        )}
        <Tags.PreviewFrameWrapper
          showOverlay={this.state.showReplayOverlay}
          style={{ transform: `scale(${this.state.viewScale})` }}
        >
          {this.state.showReplayOverlay && (
            <div className="replay-overlay" style={{ height, width }}>
              <Button
                intent="secondary"
                icon={<UndoOutlined />}
                iconPlacement="left"
                style={{ background: '#fff' }}
                onClick={this.handleReplayClick}
              >
                Replay
              </Button>

              <Button
                intent="secondary"
                icon={<EditOutlined />}
                iconPlacement="left"
                onClick={() => {
                  traceEvent(
                    AMPLITUDE_EVENTS.EDIT_DEMO,
                    {
                      edit_clicked_from: 'analytics'
                    },
                    [CmnEvtProp.EMAIL]
                  );
                  this.props.navigate(`/demo/${this.props.tour?.rid}`);
                }}
                style={{ background: '#7ceaf3' }}
              >
                Edit
              </Button>

              {
                !this.state.minimalHeader && (
                  <Button
                    intent="primary"
                    icon={<ShareAltOutlined />}
                    iconPlacement="left"
                    onClick={() => {
                      this.setState({ showShareModal: true });
                      amplitudeShareModalOpen('preview');
                    }}
                  >
                    Share
                  </Button>
                )
              }
            </div>
          )}

          {this.props.isTourLoaded && !this.state.showVoiceoverInsteadOfIframe && (
          <iframe
            key={this.state.previewIframeKey}
            ref={this.previewFrameRef}
            id="preview-frame"
            height={height}
            width={width}
            className="preview-frame"
            src={`${baseURL}/${IFRAME_BASE_URL}/demo/${this.props.tour?.rid}${this.state.embedQueryParams}${embedParams}${modeParam}`}
            title="hello"
          />
          )}
          {
            this.props.isTourLoaded && this.state.showVoiceoverInsteadOfIframe && (
              <Tags.PopoverCon>
                <div
                  className="typ-reg"
                  style={{
                    width: '390px',
                    marginBottom: '1rem',
                    opacity: 0.6,
                    lineHeight: '1.25rem'
                  }}
                >
                  <InfoCircleOutlined style={{ fontSize: '0.85rem' }} />&nbsp;Generate an interactive demo video with a lead form, smooth zoom and pan effects, transitions, and custom CTAs.
                </div>
                <VoiceoverPopup
                  handleRemoveVoiceover={this.handleRemoveVoiceover}
                  handleVoiceover={this.handleVoiceover}
                  quillyUpdateLoading={quillyUpdateLoading}
                  showRemoveVoiceover={this.state.isVoiceoverAppliedToAtleastOneAnnInDemo}
                  closeVoiceoverPopup={this.closeVoiceoverPopup}
                  playPauseSampleVoice={this.playPauseSampleVoice}
                  selectedVoice={this.state.selectedVoice}
                  subs={this.props.subs}
                  creditRequiredForVoiceover={this.state.creditRequiredForVoiceover}
                  getSubscriptionOrCheckoutNew={this.props.getSubscriptionOrCheckoutNew}
                  updateVoiceOption={(name: string) => this.setState({ selectedVoice: name })}
                  hideCloseIcon
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Progress
                    showInfo={false}
                    size="small"
                    style={{
                      margin: 0,
                      width: '300px',
                      display: this.state.voiceoverProgress === 0 || this.state.voiceoverProgress === 100
                        ? 'none' : 'block'
                    }}
                    strokeLinecap="round"
                    percent={this.state.voiceoverProgress}
                    strokeColor="#9ba7ae"
                  />
                  {this.state.voiceoverProgress === 100 && (
                  <div style={{ marginTop: '5px' }}>
                    <CheckCircleFilled
                      style={{
                        fontSize: 13,
                        color: 'green',
                        position: 'absolute',
                      }}
                    />
                  </div>
                  )}
                </div>
              </Tags.PopoverCon>
            )
          }
          <Tags.EditCon>
            {this.props.isTourLoaded && this.state.screenSizeData && (
            <Tags.QuickEditPanel
              h={this.state.screenSizeData.iframePos.height}
              y={this.state.screenSizeData.iframePos.top}
              x={this.state.screenSizeData.iframePos.left}
            >
              <div>
                <div
                  className="panel-item"
                >
                  <Popover
                    overlayClassName="quick-edit-popover"
                    content={
                      <Tags.QuickEditPopoverCon>
                        <div className="close-btn" onClick={() => this.setState({ showPersVarsEditor: false })}>
                          <CloseOutlined />
                        </div>
                        <div>
                          <PersonalVarEditor
                            setShowEditor={(showPersVarsEditor: boolean) => {
                              this.setState({ showPersVarsEditor });
                            }}
                            annotationsForScreens={this.props.annotationsForScreens}
                            tour={this.props.tour!}
                            changePersVarParams={(embedQueryParams: string) => {
                              this.setState({ embedQueryParams });
                            }}
                            originalPersVarsParams={this.originalQueryParams}
                            datasets={this.props.tour!.datasets!}
                            edits={this.props.globalEdits}
                          />
                        </div>
                      </Tags.QuickEditPopoverCon>
                  }
                    open={this.state.showPersVarsEditor}
                    placement="left"
                  >
                    <div onClick={() => this.setState(state => ({ showPersVarsEditor: !state.showPersVarsEditor }))}>
                      <Tooltip title="Customize demo" placement="left">
                        <CodeFilled />
                      </Tooltip>
                    </div>
                  </Popover>
                </div>
                {(this.state.activeSegment === INTERACTIVE_MODE.INTERACTIVE_VIDEO
                 && !this.state.showVoiceoverInsteadOfIframe) && (
                 <div
                   className="panel-item"
                   style={{ marginTop: '10px' }}
                 >
                   <Popover
                     overlayClassName="quick-edit-popover"
                     content={<VoiceoverPopup
                       handleRemoveVoiceover={this.handleRemoveVoiceover}
                       handleVoiceover={this.handleVoiceover}
                       quillyUpdateLoading={quillyUpdateLoading}
                       showRemoveVoiceover={this.state.isVoiceoverAppliedToAtleastOneAnnInDemo}
                       closeVoiceoverPopup={this.closeVoiceoverPopup}
                       playPauseSampleVoice={this.playPauseSampleVoice}
                       selectedVoice={this.state.selectedVoice}
                       subs={this.props.subs}
                       creditRequiredForVoiceover={this.state.creditRequiredForVoiceover}
                       getSubscriptionOrCheckoutNew={this.props.getSubscriptionOrCheckoutNew}
                       updateVoiceOption={(name: string) => this.setState({ selectedVoice: name })}
                     />}
                     open={this.state.showVoiceoverPopover}
                     placement="left"
                   >
                     <div
                       style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                       onClick={() => this.setState(state => ({ showVoiceoverPopover: !state.showVoiceoverPopover }))}
                     >
                       <Tooltip title="Update Voiceover" placement="left">
                         <SoundFilled />
                       </Tooltip>
                       <div>
                         <Progress
                           showInfo={false}
                           size="small"
                           style={{
                             margin: 0,
                             lineHeight: 0,
                             display: this.state.voiceoverProgress === 0 || this.state.voiceoverProgress === 100
                               ? 'none' : 'block'
                           }}
                           strokeLinecap="round"
                           percent={this.state.voiceoverProgress}
                           strokeColor="#9ba7ae"
                         />
                         {this.state.voiceoverProgress === 100 && <CheckCircleFilled
                           style={{
                             fontSize: 13,
                             color: 'green',
                             position: 'absolute',
                           }}
                         />}
                       </div>
                     </div>
                   </Popover>
                 </div>
                )}
              </div>
              {displaySize === '0' && (
                <div className="panel-item">
                  <Tooltip placement="left" title="History">
                    <Dropdown
                      menu={{ items }}
                      trigger={['click']}
                      placement="topRight"
                    >
                      <ClockCircleFilled />
                    </Dropdown>
                  </Tooltip>
                </div>
              )}
            </Tags.QuickEditPanel>
            )}
          </Tags.EditCon>
        </Tags.PreviewFrameWrapper>
        {this.props.subs && this.props.isTourLoaded && displaySize === '0' && (
          <Tags.QuillyCon>
            <Tags.QuillyInputCon>
              <div
                style={{
                  visibility: this.state.updateDemoLoadingStatus === LoadingStatus.Error ? 'visible' : 'hidden',
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                className="err-line"
              >
                <span>Failed to update demo. Please try by changing the prompt in the textarea.&nbsp;
                  {this.props.updateDemoUsingAIError.errMsg
                 && <span>[Message from Quilly: {this.props.updateDemoUsingAIError.errMsg}]</span>}
                </span>
                <CloseOutlined
                  style={{ cursor: 'pointer' }}
                  onClick={this.resetQuillyProgress}
                />
              </div>
              <Progress
                showInfo={false}
                size="small"
                style={{
                  margin: 0,
                  lineHeight: 0,
                  padding: '0px 4px',
                  visibility: this.state.updateDemoLoadingStatus === LoadingStatus.InProgress ? 'visible' : 'hidden'
                }}
                strokeLinecap="round"
                percent={this.state.quillyProgress}
                strokeColor="#9ba7ae"
              />
              <textarea
                onChange={this.handleTextAreaChange}
                placeholder={this.state.placeholderText}
                value={this.state.newDemoObjective}
                onKeyDown={(e) => this.handleTextAreaKeyDown(e, quillySubmitDisabled)}
                disabled={this.state.updateDemoLoadingStatus === LoadingStatus.InProgress}
              />
            </Tags.QuillyInputCon>
            { this.props.subs && this.props.subs.availableCredits < CREDIT_USED_FOR_LLM_CALL
              ? <BuyMoreCredit
                  currentCredit={this.props.subs.availableCredits}
                  checkCredit={this.props.getSubscriptionOrCheckoutNew}
                  showCreditInfo={false}
                  clickedFrom="preview"
              />
              : (
                <Tooltip
                  placement="topLeft"
                  title={
                  quillySubmitDisabled
                    ? 'Tell Quilly what edit you want to do and press Ctrl/Cmd + Enter'
                    : 'Submit (or press Ctrl/Cmd + Enter)'
                }
                >
                  <Tags.QuillySubmit
                    onClick={() => this.handleQuillySubmit(quillySubmitDisabled)}
                    disabled={quillySubmitDisabled}
                  />
                </Tooltip>
              )}
          </Tags.QuillyCon>
        )}
        {
          this.props.tour && (
          <ShareTourModal
            publishTour={this.props.publishTour}
            isModalVisible={this.state.showShareModal}
            relativeUrl={`/demo/${this.props.tour?.rid}`}
            closeModal={() => this.setState({ showShareModal: false })}
            tour={this.props.tour}
            openShareModal={() => this.setState({ showShareModal: true })}
            isPublishing={this.state.isPublishing}
            setIsPublishing={(isPublishing: boolean) => { this.setState({ isPublishing }); }}
            vanityDomains={this.props.vanityDomains}
            onSiteDataChange={this.onSiteDataChange}
            clickedFrom="preview"
          />
          )
        }
      </Tags.Con>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PublishPreview));
