import { TMsgAttrs } from '../../types';
import { AudioProcessingSub } from '../../api-contract';
import IrrecoverableErr from '../../irrecoverable_err';
import { transcode } from './ffmpeg';

export default async function transcodeAudio(props: TMsgAttrs, signal?: AbortSignal) {
  if (props.sub === AudioProcessingSub.CONVERT_TO_HLS) return transcode(props, 'audio-hls', signal);
  if (props.sub === AudioProcessingSub.CONVERT_TO_WEBM) return transcode(props, 'audio-webm', signal);
  throw new IrrecoverableErr('Unsupported audio output');
}
