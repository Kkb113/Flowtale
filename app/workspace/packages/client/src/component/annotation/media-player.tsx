import React, { RefObject, ReactElement } from 'react';
import Hls from 'hls.js';
import { IAnnotationConfig, ITourDataOpts, VideoAnnotationPositions } from '@fable/common/dist/types';
import {
  ArrowLeftOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import * as Tags from './styled';
import { isCoverAnnotation } from './annotation-config-utils';
import {
  TimeSpentInAnnotationPayload,
  VideoAnnotationSkippedPayload
} from '../../analytics/types';
import { convertUrlToBlobUrl, generateShadeColor } from './utils';
import AudioVisualizer from '../audio-visualizer';
import { getColorContrast, isSafari } from '../../utils';
import SoundWavePlaceholder from './sound-wave-placeholder';
import { FABLE_AUDIO_MEDIA_CONTROLS } from '../../constants';
import { getAnnotationBtn } from './ops';
import * as GTags from '../../common-styled';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { AnimEntryDir, ScreenSizeData, VoiceoverMediaState } from '../../types';

interface IProps {
  borderRadius: string;
  confRefId: string;
  playMode: boolean,
  annFollowPositions: { top: number, left: number, dir: AnimEntryDir },
  width: number;
  height: number;
  tourId: number;
  type: 'audio' | 'video';
  opts: ITourDataOpts;
  nav: (dir: 'prev' | 'next' | 'custom', btnId?: string)=>void
  conf: IAnnotationConfig;
  annScale: number;
  doNotAutoplayMedia: string[];
  handleMediaStateChange?: (mediaS: VoiceoverMediaState)=> void;
  screenSizeData?: ScreenSizeData;
}

interface IOwnStateProps {
  showControls: boolean;
  mediaState: 'none' | 'paused' | 'playing' | 'ended';
  showAudioVisualizer: boolean;
  blobUrls: null | { webm: string, mp4: string, type: 'video' } | { webm: string, type: 'audio' },
  mediaLoaded: boolean;
  mediaProgress: number;
  showBtnOverlay: boolean;
  isMaximized: boolean;
}

export default class AnnotationMedia extends React.PureComponent<IProps, IOwnStateProps> {
  private mediaRef: RefObject<HTMLVideoElement> = React.createRef();

  private mediaRefCon: RefObject<HTMLDivElement> = React.createRef();

  private transitionTimer : number | NodeJS.Timeout = 0;

  private hls: Hls | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showControls: false,
      showAudioVisualizer: false,
      blobUrls: null,
      mediaLoaded: false,
      mediaProgress: 0,
      mediaState: 'none',
      showBtnOverlay: false,
      isMaximized: false
    };
    // TODO - handle hsl for export??
    if (Hls.isSupported() && !this.props.playMode) {
      const config = this.props.conf;
      const hlsURl = this.props.type === 'audio' ? config.audio?.hls : config.videoUrlHls;

      if (hlsURl) {
        this.initPlayer(hlsURl);
      }
    }

    this.convertToBlob();
  }

  convertToBlob = async (): Promise<void> => {
    const config = this.props.conf;

    if (config.audio) {
      const webmUrl = config.audio.webm;
      const blobUrl = await convertUrlToBlobUrl(webmUrl);
      this.setState({ blobUrls: { type: 'audio', webm: blobUrl } });
      return;
    }

    const urls = [config.videoUrlWebm, config.videoUrlMp4];
    const [blobWebmUrl, blobMp4Url] = await Promise.all(urls.map(url => convertUrlToBlobUrl(url)));
    this.setState({ blobUrls: { type: 'video', webm: blobWebmUrl, mp4: blobMp4Url } });
  };

  // eslint-disable-next-line react/no-unused-class-component-methods
  handlePlayPauseVoiceoverFromScreen(): void {
    if (this.props.conf.voiceover) this.handlePlayPauseMedia();
  }

  private handlePlayPauseMedia(): void {
    if (this.state.mediaState === 'playing') {
      this.mediaRef.current!.pause();
    } else if (this.state.mediaState === 'paused') {
      this.playMedia();
    }
  }

  private initPlayer(hlsUrl: string): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.hls = new Hls({
      enableWorker: false,
    });
    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      this.hls!.loadSource(hlsUrl);

      this.hls!.on(Hls.Events.MANIFEST_PARSED, () => {
        this.mediaRef!.current!.setAttribute('data-playable', 'true');
      });
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.hls!.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.hls!.recoverMediaError();
            break;
          default:
            this.initPlayer(hlsUrl);
            break;
        }
      }
    });
  }

  componentDidMount(): void {
    if (!isSafari()) {
      this.setState(prev => ({ showAudioVisualizer: this.props.type === 'audio'
        && (prev.mediaState === 'playing') }));
    }

    if (!this.props.playMode) {
      this.setState({ mediaState: 'paused', showControls: true });
    }

    if (this.props.confRefId) {
      this.setState({ isMaximized: this.props.conf.refId === this.props.confRefId });
    }

    if (!this.hls) {
      this.mediaRef!.current!.setAttribute('data-playable', 'true');
      return;
    }
    this.hls.attachMedia(this.mediaRef!.current!);

    if (this.shouldAutoplayVideo()) {
      this.playMediaFromStart();
    }
  }

  componentWillUnmount(): void {
    clearTimeout(this.transitionTimer);
    this.transitionTimer = 0;
    if (!this.hls) return;
    this.hls.destroy();
    this.hls = null;
  }

  shouldAutoplayVideo = (): boolean => this.state.isMaximized && this.props.playMode
   && !this.props.doNotAutoplayMedia.includes(this.props.confRefId);

  handleAutoplayMedia = (): boolean => {
    if (this.shouldAutoplayVideo()) {
      this.playMediaFromStart();
      if (this.props.conf.voiceover && this.mediaRef?.current) this.mediaRef.current.playbackRate = 1.2;
      return true;
    }
    return false;
  };

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.confRefId !== this.props.confRefId) {
      this.setState({ isMaximized: this.props.conf.refId === this.props.confRefId });
    }

    let isMediaPlayed = false;
    if (prevState.isMaximized !== this.state.isMaximized) {
      if (this.state.isMaximized) {
        this.props.playMode && this.resetAnnPos();
        isMediaPlayed = this.handleAutoplayMedia();
        if (!isMediaPlayed) {
          this.setState({ mediaState: 'paused', showControls: true });
        }
      } else {
        this.mediaRef.current!.pause();
        this.mediaRef.current!.currentTime = 0;
      }
    }

    if (this.state.mediaState === 'none' && this.state.isMaximized && prevState.blobUrls !== this.state.blobUrls) {
      isMediaPlayed = this.handleAutoplayMedia();
    }

    if (
      this.props.type === 'audio'
      && !this.state.showAudioVisualizer
      && prevState.mediaState !== this.state.mediaState
      && (this.state.mediaState === 'playing')
      && !isSafari()
    ) {
      this.setState({ showAudioVisualizer: true });
    }

    if (this.state.isMaximized && this.props.handleMediaStateChange
      && this.state.mediaState !== prevState.mediaState && this.props.conf.voiceover) {
      const mediaState = (this.state.showBtnOverlay
        ? 'overlay' : this.state.mediaState);
      this.props.handleMediaStateChange(mediaState);
    }
  }

  playMediaFromStart = (): void => {
    this.mediaRef.current!.currentTime = 0;
    this.setState({ showBtnOverlay: false });
    this.playMedia();
  };

  playMedia = (): void => {
    this.mediaRef.current!
      .play()
      .then(() => {
        this.onMediaPlay();
      }).catch((e) => {
        console.log(e);
        this.onMediaPause();
      });
  };

  logStepEvent = (direction: 'next' | 'prev'): void => {
    const ann_id = this.props.conf.refId;
    const tour_id = this.props.tourId;
    const time_in_sec_played = Math.ceil(this.mediaRef.current!.currentTime);
    const videoAnnSkippedPayload: VideoAnnotationSkippedPayload = { tour_id, ann_id, time_in_sec_played };
    if (!this.mediaRef.current!.ended) {
      // logEvent(AnalyticsEvents.VIDEO_ANN_SKIPPED, videoAnnSkippedPayload);
    } else {
      const timeSpentOnAnnPayload: TimeSpentInAnnotationPayload = {
        tour_id,
        ann_id,
        time_in_sec: Math.ceil(this.mediaRef.current!.duration)
      };

      // logEvent(AnalyticsEvents.TIME_SPENT_IN_ANN, timeSpentOnAnnPayload);
    }
  };

  getPositioningAndSizingStyles(): Record<string, string> {
    const position = this.props.conf.positioning;
    const isCover = isCoverAnnotation(this.props.conf.id);

    let styles: Record<string, string> = {};
    switch (position) {
      case VideoAnnotationPositions.BottomRight:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.BottomLeft:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.Center:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.Follow:
      default: {
        if (isCover) {
          styles = { ...styles,
            top: `${this.props.annFollowPositions.top}px`,
            left: `${this.props.annFollowPositions.left}px`
          };
        } else {
          styles = {
            ...styles,
            top: `${this.props.annFollowPositions.top}px`,
            left: `${this.props.annFollowPositions.left}px`,
          };
          const annDir = this.props.annFollowPositions.dir;
          styles.display = 'flex';
          if (annDir === 't') {
            styles.alignItems = 'end';
          } else if (annDir === 'b') {
            styles.alignItems = 'start';
          } else {
            styles.alignItems = 'center';
          }
        }
        break;
      }
    }
    return {
      ...styles,
      width: `${this.props.width}px`,
      height: `${this.props.height}px`,
    };
  }

  navigateAnns = (direction: 'prev' | 'next', btnId: string): void => {
    this.logStepEvent(direction);

    this.mediaRef.current!.pause();
    this.mediaRef.current!.currentTime = 0;
    this.props.nav(direction);
  };

  onMediaEnded = (): void => {
    this.mediaRefCon.current!.style.opacity = '0';
    this.setState({ mediaState: 'ended', showControls: false, isMaximized: false });

    if (this.props.playMode) {
      if (this.props.conf.voiceover && this.props.conf.buttons.length > 2) {
        this.setState({ showBtnOverlay: true });
        return;
      }
      const btnConf = getAnnotationBtn(this.props.conf, 'next');
      this.navigateAnns('next', btnConf.id);
    }
  };

  onMediaPlay = (): void => {
    this.mediaRefCon.current!.style.opacity = '1';
    this.setState({ mediaState: 'playing', showControls: false });
  };

  onMediaPause = (): void => {
    if (this.mediaRef.current!.ended) return;
    this.setState({ mediaState: 'paused', showControls: true });
  };

  updateMediaProgress = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement, Event>): void => {
    const currentTime = e.currentTarget.currentTime;
    const duration = e.currentTarget.duration;
    const progress = (currentTime / duration) * 100;
    this.setState({ mediaProgress: progress });
  };

  resetAnnPos = (): void => {
    this.transitionTimer = setTimeout(() => {
      this.mediaRefCon.current!.style.transform = 'translate(0px, 0px)';
    }, 48);
  };

  render(): ReactElement {
    const config = this.props.conf;
    const hlsURl = this.props.type === 'audio' ? config.audio?.hls : config.videoUrlHls;
    const isHlsSupported = this.hls && hlsURl && this.props.playMode;
    const padding: number[] = this.props.opts.annotationPadding._val.split(/\s+/).map(v => (Number.isFinite(+v) ? +v : 14));
    if (padding.length === 1) padding.push(padding[0]);
    if (padding.length === 0) padding.push(14, 14);

    const d = 30;
    let tx = 0;
    let ty = 0;

    if (this.props.playMode) {
      if (!isCoverAnnotation && !(
        this.props.conf.positioning === VideoAnnotationPositions.BottomLeft
      || this.props.conf.positioning === VideoAnnotationPositions.BottomRight)) {
        if (this.props.annFollowPositions.dir === 'l') {
          tx -= d;
        } else if (this.props.annFollowPositions.dir === 'r') {
          tx += d;
        } else if (this.props.annFollowPositions.dir === 't') {
          ty -= d;
        } else if (this.props.annFollowPositions.dir === 'b') {
          ty += d;
        }
      } else {
        ty -= d;
      }
    }
    const showMediaAnn = (!this.props.playMode || !this.props.conf.voiceover) && this.state.isMaximized;

    return (
      <>
        <Tags.AnMediaContainer
          style={{
            ...this.getPositioningAndSizingStyles(),
            visibility: showMediaAnn ? 'visible' : 'hidden',
            opacity: showMediaAnn ? '1' : '0',
            position: 'absolute',
            transform: `scale(${this.props.annScale})`,
            transition: 'transform 0.3s ease-out, opacity 0.3s cubic-bezier(0.51, 0.05, 0, 0.93)'
          }}
          onMouseOver={() => this.setState({ showControls: true })}
          onMouseOut={() => {
            if (this.state.mediaState === 'playing') {
              this.setState({ showControls: false });
            }
          }}
        >
          <Tags.MediaCon
            ref={this.mediaRefCon}
            style={{
              position: 'relative',
              display: 'flex',
              transform: `translate(${tx}px, ${ty}px)`
            }}
          >
            {
            this.props.type === 'video' && (
              <Tags.AnVideo
                ref={this.mediaRef}
                id={`fable-ann-video-${config.refId}`}
                className="fable-video"
                playsInline
                onPause={() => this.onMediaPause()}
                onPlay={() => this.onMediaPlay()}
                onEnded={() => this.onMediaEnded()}
                preload="metadata"
                onLoadedData={() => this.setState({ mediaLoaded: true })}
                onTimeUpdate={(e) => this.updateMediaProgress(e)}
              >
                {!isHlsSupported && this.state.blobUrls?.type === 'video' && (
                <>
                  <source src={this.state.blobUrls.mp4} type="video/mp4" />
                  <source src={this.state.blobUrls.webm} type="video/webm" />
                  {/* {config.videoUrl && (<source src={config.videoUrlWebm} type="video/webm" />)} */}
                </>
                )}
              </Tags.AnVideo>
            )
          }

            {
            this.props.type === 'audio' && (
              <Tags.AnAudioCon
                style={{ borderRadius: this.props.borderRadius }}
                id={`fable-ann-audio-${config.refId}`}
                className="fable-audio"
                bgColor={this.props.opts.annotationBodyBackgroundColor._val}
              >
                <audio
                  ref={this.mediaRef}
                  onPause={() => this.onMediaPause()}
                  onPlay={() => this.onMediaPlay()}
                  onEnded={() => this.onMediaEnded()}
                  crossOrigin="anonymous"
                  preload="metadata"
                  onLoadedData={() => this.setState({ mediaLoaded: true })}
                  onTimeUpdate={(e) => this.updateMediaProgress(e)}
                >
                  {!isHlsSupported && this.state.blobUrls?.type === 'audio' && (
                  <>
                    <source src={this.state.blobUrls.webm} type="audio/webm" />
                    <source src={config.audio!.fb.url} type={config.audio!.fb.type} />
                  </>
                  )}
                </audio>
                {this.state.showAudioVisualizer && (
                  <AudioVisualizer
                    audioElement={this.mediaRef.current!}
                    barWidth={1}
                    barColor={getColorContrast(this.props.opts.annotationBodyBackgroundColor._val) === 'dark'
                      ? '#fff' : '#000'}
                  />
                )}

                {
                  !this.state.showAudioVisualizer && this.state.mediaLoaded && (
                  <SoundWavePlaceholder bgColor={getColorContrast(
                    this.props.opts.annotationBodyBackgroundColor._val
                  ) === 'dark'
                    ? '#fff' : '#000'}
                  />
                  )
                }
              </Tags.AnAudioCon>
            )
          }

            <Tags.AnMediaControls
              style={{ borderRadius: this.props.borderRadius }}
              showOverlay={this.state.showControls || !this.state.mediaLoaded}
            >
              {this.state.mediaLoaded && (
              <>
                <Tags.AnMediaCtrlBtnsCon>
                  {/* Replay button */}
                  {
                  this.state.mediaState === 'playing' && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.playMediaFromStart();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <ReloadOutlined />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                  {/* Play button */}
                  {
                  (this.state.mediaState === 'paused' || this.state.mediaState === 'ended') && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.playMedia();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <PlayCircleFilled />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                  {/* Pause button */}
                  {
                  this.state.mediaState === 'playing' && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.mediaRef.current!.pause();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <PauseCircleFilled />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                </Tags.AnMediaCtrlBtnsCon>
                { this.state.showControls
              && (
              <Tags.NavButtonCon
                padding={padding as [number, number]}
                pcolor={this.props.opts.primaryColor._val}
              >
                {this.props.conf.buttons.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                  <Tags.ABtn
                    style={{
                      border: btnConf.type === 'prev' ? 'none' : '',
                      background: btnConf.type === 'prev' ? '#00000040' : ''
                    }}
                    bg={generateShadeColor(this.props.opts.primaryColor._val)}
                    idx={idx}
                    key={btnConf.id}
                    btnStyle={btnConf.style._val}
                    color={this.props.opts.primaryColor._val}
                    size={btnConf.size._val}
                    fontFamily={this.props.opts.annotationFontFamily._val}
                    btnLayout="default"
                    borderRadius={this.props.opts.borderRadius._val}
                    onClick={() => {
                      if (btnConf.type === 'next') {
                        this.navigateAnns('next', btnConf.id);
                      } else if (btnConf.type === 'prev') {
                        this.navigateAnns('prev', btnConf.id);
                      } else {
                        raiseDeferredError(new Error(`Custom button for ${this.props.type} is not implemented`));
                      }
                    }}
                  >
                    { btnConf.type === 'next' ? btnConf.text._val : <ArrowLeftOutlined />}
                  </Tags.ABtn>
                ))}
              </Tags.NavButtonCon>
              )}
              </>
              )}
              {!this.state.mediaLoaded && (
              <Tags.AnMediaCtrlBtnsCon>
                <Tags.Loader />
              </Tags.AnMediaCtrlBtnsCon>
              )}
            </Tags.AnMediaControls>
            <Tags.LoaderCon>
              <GTags.LoaderBar
                style={{
                  width: 'calc(100% - 2rem)',
                  transform: 'translate(1rem, 0.5rem)'
                }}
              >
                <GTags.LoaderProgress
                  bwidth={this.state.mediaProgress}
                  bcolor={this.props.opts.annotationBodyBorderColor._val}
                  bradius={4}
                  bopacity={0.50}
                />
              </GTags.LoaderBar>
            </Tags.LoaderCon>
          </Tags.MediaCon>
        </Tags.AnMediaContainer>
        {this.state.showBtnOverlay
        && (
        <Tags.VoiceoverBtnOverlay
          bgColor={this.props.opts.annotationBodyBackgroundColor._val}
          height={this.props.screenSizeData ? this.props.screenSizeData.iframePos.height : 0}
          width={this.props.screenSizeData ? this.props.screenSizeData.iframePos.width : 0}
          top={this.props.screenSizeData ? this.props.screenSizeData.iframePos.top : 0}
          left={this.props.screenSizeData ? this.props.screenSizeData.iframePos.left : 0}
        >
          {this.props.conf.buttons.filter((btn => btn.type !== 'prev'))
            .sort((m, n) => m.order - n.order).map((btnConf, idx) => (
              <Tags.ABtn
                bg={this.props.opts.annotationBodyBackgroundColor._val}
                className={`f-${generateCSSSelectorFromText(btnConf.text._val)}-btn f-ann-btn`}
                idx={idx}
                key={btnConf.id}
                btnStyle={btnConf.style._val}
                color={this.props.opts.primaryColor._val}
                size={btnConf.size._val}
                fontFamily={this.props.opts.annotationFontFamily._val}
                btnLayout="default"
                borderRadius={this.props.opts.borderRadius._val}
                onClick={(e) => {
                  e.stopPropagation();
                  this.setState({ showBtnOverlay: false });
                  this.props.nav(btnConf.type, btnConf.id);
                }}
              >
                {btnConf.text._val}
              </Tags.ABtn>
            ))}
        </Tags.VoiceoverBtnOverlay>
        )}
      </>
    );
  }
}
