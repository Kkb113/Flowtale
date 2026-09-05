import React, { ReactElement, SetStateAction, useEffect, useRef, Dispatch, useState } from 'react';
import { Alert, Tabs } from 'antd';
import { IAnnotationConfig, VideoAnnotationPositions } from '@fable/common/dist/types';
import { MediaType } from '@fable/common/dist/api-contract';
import Button from '../button';
import { transcodeVideo, transcodeAudio, uploadImgFileObjectToAws } from '../../upload-media-to-aws';
import {
  updateAnnotationBoxSize,
  updateAnnotationPositioning,
  updateAnnotationVideo,
} from '../annotation/annotation-config-utils';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
// import { uploadFileToAws } from './utils/upload-img-to-aws';
import AudioVisualizer from '../audio-visualizer';
import Upgrade from '../upgrade';
import { handleAddAnnotationAudio } from '../../utils';
import { finishRecording, recordingMimeType } from './recorded-media';

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
        width: { ideal: 200 },
        height: { ideal: 300 },
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
  const recordedBlob = useRef<Blob>();
  const previewUrl = useRef('');
  const lifetime = useRef(new AbortController());
  const saving = useRef(false);
  const uploaded = useRef<{ blob: Blob; baseUrl: string; cdnUrl: string }>();
  const retryFile = useRef<{ file: File; kind: AnnMediaType }>();
  const [error, setError] = useState<string | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<AnnMediaType>('video');
  const [state, dispatch] = React.useReducer(mediaReducer, initialState);

  useEffect(() => {
    lifetime.current = new AbortController();
    const signal = lifetime.current.signal;
    dispatch({ type: 'RESET_STATE' });
    setError(null);
    if (!props.annotationFeatureAvailable.includes(activeTabKey)) return () => cleanup();
    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia(getUserMediaContraints(activeTabKey))
      : Promise.reject(new Error('Recording is unavailable in this browser. Upload an existing recording.'));
    request
      .then(stream => {
        if (signal.aborted) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        if (recorderRef.current) recorderRef.current.srcObject = stream;
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
      }).catch(() => {
        if (!signal.aborted) {
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
          setError('Camera or microphone access is unavailable. Check browser permissions or upload an existing recording.');
        }
      });
    return () => { cleanup(); };
  }, [activeTabKey]);

  const cleanup = (): void => {
    lifetime.current.abort();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();

    recordedPartsRef.current = [];

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    mediaRecorderRef.current = undefined;
    streamRef.current = undefined;
    recordedBlob.current = undefined;
    uploaded.current = undefined;
    retryFile.current = undefined;
    saving.current = false;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = '';
  };

  const startRecording = (mediaType: AnnMediaType): void => {
    if (saving.current || !streamRef.current || mediaRecorderRef.current?.state === 'recording') return;
    setError(null);
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: recordingMimeType(mediaType) });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Recording could not start.');
      return;
    }
    mediaRecorderRef.current = mediaRecorder;
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
      dispatch({
        type: 'SET_MEDIA_RECORDER',
        payload: {
          mediaRecorder,
        }
      });
      recordedPartsRef.current = [];
      mediaRecorder.ondataavailable = function (e) {
        if (mediaRecorderRef.current === mediaRecorder && e.data.size) recordedPartsRef.current.push(e.data);
      };
      mediaRecorder.onerror = () => {
        if (mediaRecorderRef.current !== mediaRecorder || lifetime.current.signal.aborted) return;
        setError('Recording was interrupted. Please record again or upload a file.');
        dispatch({ type: 'SET_IS_RECORDING', payload: { isRecording: false } });
      };
      try { mediaRecorder.start(1000); } catch {
        setError('Recording could not start. Please try again or upload a file.');
        dispatch({ type: 'SET_IS_RECORDING', payload: { isRecording: false } });
      }
    }
  };

  const stopRecording = async (mediaType: AnnMediaType): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording' || saving.current) return;
    saving.current = true;
    const signal = lifetime.current.signal;
    dispatch({ type: 'START_SAVING' });
    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: false
      }
    });

    try {
      const blob = await finishRecording(recorder, recordedPartsRef.current, signal);
      if (signal.aborted) return;
      recordedBlob.current = blob;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob);
      dispatch({ type: 'SET_RECORDED_MEDIA_URL', payload: { url: previewUrl.current } });
      dispatch({ type: 'SET_DONE_RECORDING', payload: { doneRecording: true } });
    } catch (failure) {
      if (!signal.aborted) setError(failure instanceof Error ? failure.message : 'Recording could not be finalized.');
    } finally {
      if (!signal.aborted) { saving.current = false; dispatch({ type: 'FINISH_SAVING' }); }
    }
  };

  const restartRecording = (): void => {
    if (saving.current) return;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = '';
    recordedBlob.current = undefined;
    uploaded.current = undefined;
    setError(null);
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
    const [err, stream1, stream2] = await transcodeVideo(url, cdnUrl, props.tour.rid, lifetime.current.signal);
    if (lifetime.current.signal.aborted) return;
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
    const [err, stream1, stream2] = await transcodeAudio(url, cdnUrl, props.tour.rid, lifetime.current.signal);
    if (lifetime.current.signal.aborted) return;

    if (err || stream1.failureReason || stream2.failureReason) {
      throw new Error('Transcoding failed');
    }

    let hlsAudio = '';
    let webmAudio = '';

    [stream1, stream2].forEach(stream => {
      if (stream.mediaType === MediaType.AUDIO_HLS) {
        hlsAudio = stream.processedCdnPath;
      }
      if (stream.mediaType === MediaType.AUDIO_WEBM) {
        webmAudio = stream.processedCdnPath;
      }
    });

    props.setConfig(c => handleAddAnnotationAudio(c, hlsAudio, webmAudio, url, type));

    dispatch({
      type: 'FINISH_SAVING'
    });

    closeRecorder();
  };

  const saveRecording = async (): Promise<void> => {
    if (recordedBlob.current) await saveMedia(recordedBlob.current, activeTabKey);
  };

  const handleUploadMediaOnClick = async (mediaFile: File, mediaType: AnnMediaType): Promise<void> => {
    retryFile.current = { file: mediaFile, kind: mediaType };
    await saveMedia(mediaFile, mediaType);
  };

  const saveMedia = async (blob: Blob, kind: AnnMediaType): Promise<void> => {
    if (saving.current || lifetime.current.signal.aborted) return;
    const signal = lifetime.current.signal;
    saving.current = true;
    setError(null);
    dispatch({ type: 'START_SAVING' });
    try {
      if (!blob.size || blob.size > 200 * 1024 * 1024) throw new Error('Choose a nonempty recording under 200 MB.');
      let result = uploaded.current?.blob === blob ? uploaded.current : undefined;
      if (!result) {
        const upload = await uploadImgFileObjectToAws(new File([blob], 'recording', { type: blob.type }), signal);
        if (!upload) throw new Error('The recording could not be uploaded.');
        if (signal.aborted) return;
        result = { blob, ...upload };
        uploaded.current = result;
      }
      const url = result.baseUrl.split('?')[0];
      if (kind === 'audio') {
        await transcodeAudioHandler(
          url,
          result.cdnUrl,
          blob.type.includes('webm') ? 'audio/webm' : 'audio/mpeg'
        );
      } else await transcodeVideoHandler(url, result.cdnUrl);
    } catch (failure) {
      if (!signal.aborted) setError(failure instanceof Error ? failure.message : 'The recording could not be saved.');
    } finally {
      if (!signal.aborted) { saving.current = false; dispatch({ type: 'FINISH_SAVING' }); }
    }
  };

  useEffect(() => {
    if (!state.doneRecording) {
      if (recorderRef.current) recorderRef.current.srcObject = streamRef.current || null;
    }
  }, [state.doneRecording]);

  const closeRecorder = (): void => {
    cleanup();
    props.closeRecorder();
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
      {error && <Alert
        type="error"
        showIcon
        message="Media could not be saved"
        description={error}
        action={retryFile.current && !state.saving ? (
          <Button onClick={() => {
            const retry = retryFile.current;
            if (retry) saveMedia(retry.file, retry.kind);
          }}
          >
            Retry
          </Button>
        ) : undefined}
      />}
      <Tabs
        onTabClick={(activeKey) => { if (!saving.current && !state.isRecording) setActiveTabKey(activeKey as AnnMediaType); }}
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
            const file = e.target.files[0];
            e.target.value = '';
            setSelectedFileName(file.name);
            await props.handleUploadMediaOnClick(file, props.annMediaType);
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
