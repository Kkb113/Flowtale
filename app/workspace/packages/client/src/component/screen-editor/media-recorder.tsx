import React, { ReactElement, SetStateAction, useEffect, useRef, Dispatch, useState } from 'react';
import { Tabs } from 'antd';
import { IAnnotationConfig, VideoAnnotationPositions } from '@fable/common/dist/types';
import { captureException } from '@sentry/react';
import { MediaType } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import Button from '../button';
import { uploadMediaToAws, transcodeVideo, transcodeAudio, uploadImgFileObjectToAws } from '../../upload-media-to-aws';
import {
  updateAnnotationBoxSize,
  updateAnnotationPositioning,
  updateAnnotationVideo,
} from '../annotation/annotation-config-utils';
import { blobToUint8Array } from './utils/blob-to-uint8array';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
// import { uploadFileToAws } from './utils/upload-img-to-aws';
import AudioVisualizer from '../audio-visualizer';
import Upgrade from '../upgrade';
import { handleAddAnnotationAudio } from '../../utils';

type Props = {
  tour: P_RespTour,
  closeRecorder: () => void,
  setConfig: Dispatch<SetStateAction<IAnnotationConfig>>,
  annotationFeatureAvailable: string[],
  subs: P_RespSubscription | null,
}

type MediaState = {
  isMediaModalOpen: boolean;
  isRecording: boolean;
  doneRecording: boolean;
  recordedMediaURL: string;
  saving: boolean;
  permissionGiven: boolean;
  isMediaReady: boolean;
  mediaRecorder: MediaRecorder | null;
};

type Action = {
  type: string;
  payload?: {
    [key: string]: any;
  };
};

const initialState: MediaState = {
  isMediaModalOpen: true,
  isRecording: false,
  doneRecording: false,
  recordedMediaURL: '',
  saving: false,
  permissionGiven: true,
  isMediaReady: false,
  mediaRecorder: null,
};

const VIDEO_CODEC_OPTIONS = { mimeType: 'video/webm;codecs=h264' };
const AUDIO_CODEC_OPTIONS = { mimeType: 'audio/webm; codecs=opus' };

// videoReducer is local to this video recorder component, that's why it's placed here
const mediaReducer = (state: MediaState, action: Action): MediaState => {
  switch (action.type) {
    case 'OPEN_MEDIA_MODAL':
      return {
        ...state,
        isMediaModalOpen: true,
      };
    case 'CLOSE_MEDIA_MODAL':
      return {
        ...state,
        isMediaModalOpen: false,
      };
    case 'SET_IS_RECORDING':
      return {
        ...state,
        isRecording: action.payload!.isRecording,
      };
    case 'SET_DONE_RECORDING':
      return {
        ...state,
        doneRecording: action.payload!.doneRecording,
      };
    case 'SET_RECORDED_MEDIA_URL':
      return {
        ...state,
        recordedMediaURL: action.payload!.url,
      };
    case 'START_SAVING':
      return {
        ...state,
        saving: true,
      };
    case 'FINISH_SAVING':
      return {
        ...state,
        saving: false,
      };
    case 'SET_PERMISSION_GIVEN':
      return {
        ...state,
        permissionGiven: action.payload!.given,
      };
    case 'SET_IS_MEDIA_READY':
      return {
        ...state,
        isMediaReady: action.payload!.isMediaReady,
      };
    case 'SET_MEDIA_RECORDER':
      return {
        ...state,
        mediaRecorder: action.payload!.mediaRecorder,
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

const getUserMediaContraints = (mediaType: AnnMediaType): MediaStreamConstraints => {
  const baseMediaConstraints: MediaStreamConstraints = { audio: true };

  if (mediaType === 'video') {
    return {
      ...baseMediaConstraints,
      video: {
        width: { exact: 200 },
        height: { exact: 300 },
        frameRate: { ideal: 12 },
      }
    };
  }

  return baseMediaConstraints;
};

function MediaRecorderModal(props: Props): ReactElement {
  const recorderRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();
  const recordedPartsRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder>();
  const [activeTabKey, setActiveTabKey] = useState<AnnMediaType>('video');
  const [state, dispatch] = React.useReducer(mediaReducer, initialState);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia(getUserMediaContraints(activeTabKey))
      .then(stream => {
        streamRef.current = stream;
        recorderRef.current!.srcObject = stream;
        dispatch({
          type: 'SET_PERMISSION_GIVEN',
          payload: {
            given: true
          }
        });
        dispatch({
          type: 'SET_IS_MEDIA_READY',
          payload: {
            isMediaReady: true
          }
        });
      }).catch(err => {
        if (err.message === 'Permission denied') {
          captureException('Camera & mic permission denied while recording video annotation');
          dispatch({
            type: 'SET_PERMISSION_GIVEN',
            payload: {
              given: false
            }
          });
          dispatch({
            type: 'SET_IS_MEDIA_READY',
            payload: {
              isMediaReady: false
            }
          });
        } else {
          raiseDeferredError(err);
        }
      });
    return () => { cleanup(); };
  }, [activeTabKey]);

  const cleanup = (): void => {
    dispatch({ type: 'RESET_STATE' });

    mediaRecorderRef.current?.stop();

    recordedPartsRef.current = [];

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    mediaRecorderRef.current = undefined;
  };

  const startRecording = (mediaType: AnnMediaType): void => {
    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: false
      }
    });

    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: true
      }
    });

    if (streamRef.current) {
      const mediaRecorder = mediaRecorderRef.current = new MediaRecorder(
        streamRef.current,
        mediaType === 'audio' ? AUDIO_CODEC_OPTIONS : VIDEO_CODEC_OPTIONS
      );
      dispatch({
        type: 'SET_MEDIA_RECORDER',
        payload: {
          mediaRecorder,
        }
      });
      mediaRecorder.start(1);
      recordedPartsRef.current = [];
      mediaRecorder.ondataavailable = function (e) {
        recordedPartsRef.current.push(e.data);
      };
    }
  };

  const stopRecording = (mediaType: AnnMediaType): void => {
    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: true
      }
    });

    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: false
      }
    });

    mediaRecorderRef.current!.stop();
    const blob = new Blob(recordedPartsRef.current, {
      type: mediaType === 'audio' ? AUDIO_CODEC_OPTIONS.mimeType : VIDEO_CODEC_OPTIONS.mimeType
    });
    const url = URL.createObjectURL(blob);
    dispatch({
      type: 'SET_RECORDED_MEDIA_URL',
      payload: {
        url
      }
    });
  };

  const restartRecording = (): void => {
    recordedPartsRef.current = [];
    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: false
      }
    });

    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: false
      }
    });

    dispatch({
      type: 'SET_RECORDED_MEDIA_URL',
      payload: {
        url: ''
      }
    });

    dispatch({
      type: 'SET_MEDIA_RECORDER',
      payload: {
        mediaRecorder: null,
      }
    });
  };

  const transcodeVideoHandler = async (url: string, cdnUrl: string): Promise<void> => {
    const [err, stream1, stream2] = await transcodeVideo(url, cdnUrl, props.tour.rid);
    if (err || stream1.failureReason || stream2.failureReason) {
      throw new Error('Transcoding failed');
    }

    let videoHls = '';
    let videoMp4 = '';

    [stream1, stream2].forEach(stream => {
      if (stream.mediaType === MediaType.VIDEO_HLS) {
        videoHls = stream.processedCdnPath;
      }
      if (stream.mediaType === MediaType.VIDEO_MP4) {
        videoMp4 = stream.processedCdnPath;
      }
    });

    props.setConfig(c => updateAnnotationVideo(c, { videoUrlHls: videoHls, videoUrlMp4: videoMp4, videoUrlWebm: url }));

    props.setConfig(c => {
      if (c.type === 'cover') {
        return updateAnnotationPositioning(c, VideoAnnotationPositions.Center);
      }
      return updateAnnotationPositioning(c, VideoAnnotationPositions.BottomRight);
    });

    props.setConfig(c => updateAnnotationBoxSize(c, 'medium'));

    dispatch({
      type: 'FINISH_SAVING'
    });

    closeRecorder();
  };

  const transcodeAudioHandler = async (url: string, cdnUrl: string, type: 'audio/webm' | 'audio/mpeg'): Promise<void> => {
    const [err, stream1, stream2] = await transcodeAudio(url, cdnUrl, props.tour.rid);

    if (err || stream1.failureReason || stream2.failureReason) {
      throw new Error('Transcoding failed');
    }

    let hlsAudio = '';
    let webmAudio = '';

    [stream1, stream2].forEach(stream => {
      if (stream.mediaType === MediaType.AUDIO_HLS) {
        hlsAudio = stream.processedFilePath;
      }
      if (stream.mediaType === MediaType.AUDIO_WEBM) {
        webmAudio = stream.processedFilePath;
      }
    });

    props.setConfig(c => handleAddAnnotationAudio(c, hlsAudio, webmAudio, url, type));

    dispatch({
      type: 'FINISH_SAVING'
    });

    closeRecorder();
  };

  const saveRecording = async (): Promise<void> => {
    dispatch({
      type: 'START_SAVING'
    });

    const webmBlob = new Blob(recordedPartsRef.current, {
      type: activeTabKey === 'audio' ? AUDIO_CODEC_OPTIONS.mimeType : VIDEO_CODEC_OPTIONS.mimeType
    });
    const webm = await blobToUint8Array(webmBlob);
    const webmUrl = await uploadMediaToAws(webm, activeTabKey === 'audio' ? 'audio/webm' : 'video/webm');
    if (!webmUrl) return;

    const baseUrl = webmUrl.baseUrl.split('?')[0];
    if (activeTabKey === 'audio') {
      await transcodeAudioHandler(baseUrl, webmUrl.cdnUrl, 'audio/webm');
    } else {
      await transcodeVideoHandler(baseUrl, webmUrl.cdnUrl);
    }
  };

  const handleUploadMediaOnClick = async (mediaFile: File, mediaType: AnnMediaType): Promise<void> => {
    dispatch({
      type: 'START_SAVING'
    });

    const mediaUrl = await uploadImgFileObjectToAws(mediaFile);
    if (!mediaUrl) return;

    const baseUrl = mediaUrl.baseUrl.split('?')[0];
    if (mediaType === 'audio') {
      await transcodeAudioHandler(baseUrl, mediaUrl.cdnUrl, 'audio/mpeg');
    } else {
      await transcodeVideoHandler(baseUrl, mediaUrl.cdnUrl);
    }
  };

  useEffect(() => {
    if (!state.doneRecording) {
      recorderRef.current!.srcObject = streamRef.current!;
    }
  }, [state.doneRecording]);

  const closeRecorder = async (): Promise<void> => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    dispatch({
      type: 'CLOSE_MEDIA_MODAL'
    });
    setTimeout(() => props.closeRecorder(), 1000);
  };

  const tabs = [
    {
      label: 'Video guide',
      key: 'video',
      children: <MediaRecorderTab
        annMediaType="video"
        state={state}
        recorderRef={recorderRef}
        stopRecording={stopRecording}
        startRecording={startRecording}
        restartRecording={restartRecording}
        saveRecording={saveRecording}
        handleUploadMediaOnClick={handleUploadMediaOnClick}
        isFeatureAvailable={props.annotationFeatureAvailable.includes('video')}
        subs={props.subs}
      />
    },
    {
      label: 'Audio guide',
      key: 'audio',
      children: <MediaRecorderTab
        annMediaType="audio"
        state={state}
        recorderRef={recorderRef}
        stopRecording={stopRecording}
        startRecording={startRecording}
        restartRecording={restartRecording}
        saveRecording={saveRecording}
        handleUploadMediaOnClick={handleUploadMediaOnClick}
        isFeatureAvailable={props.annotationFeatureAvailable.includes('audio')}
        subs={props.subs}
      />
    },
  ];

  return (
    <GTags.BorderedModal
      donotShowHeaderStip
      containerBg="#f5f5f5"
      style={{ height: '10px', top: '20px' }}
      open={state.isMediaModalOpen}
      onOk={closeRecorder}
      onCancel={closeRecorder}
      footer={null}
    >
      <p
        className="typ-h1"
        style={{
          margin: '0 0 1rem'
        }}
      >Create video/audio guide
      </p>
      <Tabs
        onTabClick={(activeKey) => setActiveTabKey(activeKey as AnnMediaType)}
        activeKey={activeTabKey}
        destroyInactiveTabPane
        type="line"
        size="small"
        items={tabs}
      />
    </GTags.BorderedModal>
  );
}

type AnnMediaType = 'video' | 'audio';

interface MediaRecorderTabProps {
  annMediaType: AnnMediaType;
  state: MediaState;
  recorderRef: React.RefObject<HTMLVideoElement>;
  stopRecording: (mediaType: AnnMediaType) => void;
  startRecording: (mediaType: AnnMediaType) => void;
  restartRecording: () => void;
  saveRecording: () => Promise<void>;
  handleUploadMediaOnClick: (mediaFile: File, mediaType: AnnMediaType) => Promise<void>,
  isFeatureAvailable: boolean,
  subs: P_RespSubscription | null
}

function MediaRecorderTab(props: MediaRecorderTabProps): JSX.Element {
  return (
    <div
      className={props.isFeatureAvailable ? '' : 'upgrade-plan'}
    >
      {props.state.permissionGiven ? (
        <>
          {props.annMediaType === 'audio' ? (
            <p className="typ-reg">Record an audio explaining the feature you selected on the screen.</p>
          ) : (
            <p className="typ-reg">Record a video explaining the feature you selected on the screen.</p>
          )}

          {
            !props.state.doneRecording && (
              <>
                {props.annMediaType === 'video' ? (
                  <video
                    autoPlay
                    muted
                    ref={props.recorderRef}
                    style={{ height: '300px', width: '200px', margin: 'auto', display: 'block', borderRadius: '24px' }}
                  />
                ) : (
                  <audio
                    autoPlay
                    muted
                    ref={props.recorderRef}
                    style={{ height: '225px', margin: 'auto', display: 'block', borderRadius: '12px' }}
                  />
                )}

                {
                  props.annMediaType === 'audio' && props.state.isMediaReady && props.state.mediaRecorder && (
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AudioVisualizer
                      mediaRecorder={props.state.mediaRecorder}
                      barWidth={1}
                      height={50}
                      style={{
                        width: '50%',
                        height: '50px',
                        margin: '1rem 0',
                      }}
                    />
                  </div>
                  )
                }

                {
                  props.state.isMediaReady && (
                    <div style={{ margin: '1rem auto', marginBottom: '0', display: 'flex', justifyContent: 'center' }}>
                      {
                        props.state.isRecording
                          ? <Button onClick={() => props.stopRecording(props.annMediaType)}>Stop Recording</Button>
                          : (
                            <Button
                              disabled={props.state.saving}
                              onClick={() => props.startRecording(props.annMediaType)}
                            >
                              Start Recording
                            </Button>
                          )
                      }
                    </div>
                  )
                }
              </>
            )
          }
          {
            props.state.doneRecording && (
              <>
                {props.annMediaType === 'video' ? (
                  <video
                    autoPlay
                    controls
                    src={props.state.recordedMediaURL}
                    style={{ height: '300px', width: '200px', margin: 'auto', display: 'block', borderRadius: '24px' }}
                  />
                ) : (
                  <audio
                    autoPlay
                    controls
                    src={props.state.recordedMediaURL}
                    style={{ margin: 'auto', display: 'block' }}
                  />
                )}

                {
                  props.state.saving && (
                    <div style={{ margin: '1rem auto' }}>
                      <div style={{ textAlign: 'center' }}>Saving</div>
                    </div>
                  )
                }
                {
                  !props.state.saving && (
                    <Tags.ActionBtnCon>
                      <Button intent="secondary" onClick={props.restartRecording}>Discard</Button>
                      <Button onClick={props.saveRecording}>Save</Button>
                    </Tags.ActionBtnCon>
                  )
                }
              </>
            )
          }
        </>
      ) : (
        <>
          {props.annMediaType === 'audio' ? (
            <p>Microphone permission is required for this feature!</p>
          ) : (
            <p>Camera and microphone permission is required for this feature!</p>
          )}
        </>
      )}

      <div
        style={{
          borderBottom: '1px solid lightgray',
          position: 'relative',
          margin: '2rem 0'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#f5f5f5',
            padding: '0 0.5rem'
          }}
        >
          or
        </div>
      </div>

      <UploadMediaButton
        annMediaType={props.annMediaType}
        state={props.state}
        handleUploadMediaOnClick={props.handleUploadMediaOnClick}
      />
      {!props.isFeatureAvailable && <Upgrade subs={props.subs} clickedFrom="annotation_edit" />}

    </div>
  );
}

interface UploadMediaButtonProps {
  annMediaType: AnnMediaType;
  state: MediaState;
  handleUploadMediaOnClick: (mediaFile: File, mediaType: AnnMediaType) => Promise<void>
}

const getButtonTitle = (
  annMediaType: AnnMediaType,
  saving: boolean,
  fileName: string,
): string => {
  if (saving) {
    return 'Uploading';
  }

  if (fileName) {
    return `Uploaded ${annMediaType}: ${fileName}`;
  }

  return `Upload an already recorded ${annMediaType}`;
};

const getMediaAcceptProp = (annMediaType: AnnMediaType): string => {
  switch (annMediaType) {
    case 'audio':
      return '.mp3';
    case 'video':
      return '.mp4';
    default:
      return '';
  }
};

function UploadMediaButton(props: UploadMediaButtonProps): JSX.Element {
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [buttonTitle, setButtonTitle] = useState('');
  const [mediaAcceptProp, setMediaAcceptProp] = useState(() => getMediaAcceptProp(props.annMediaType));

  useEffect(() => {
    const btnTitle = getButtonTitle(props.annMediaType, props.state.saving, selectedFileName);
    setButtonTitle(btnTitle);

    const mediaProp = getMediaAcceptProp(props.annMediaType);
    setMediaAcceptProp(mediaProp);
  }, [props.state.saving, selectedFileName, props.annMediaType]);

  return (
    <Tags.UploadMediaLabel
      htmlFor="media-annotation"
    >
      <input
        key={props.annMediaType}
        disabled={props.state.saving}
        style={{ opacity: 0, display: 'none' }}
        type="file"
        id="media-annotation"
        accept={mediaAcceptProp}
        name="media-ann"
        required
        onChange={async (e) => {
          if (e.target.files && e.target.files.length) {
            await props.handleUploadMediaOnClick(e.target.files[0], props.annMediaType);
            setSelectedFileName(e.target.files[0].name);
          } else {
            setSelectedFileName('');
          }
        }}
      />
      {buttonTitle}
    </Tags.UploadMediaLabel>
  );
}

export default MediaRecorderModal;
