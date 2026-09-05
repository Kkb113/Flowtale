import { TMsgAttrs } from '../../types';
import { VideoProcessingSub } from '../../api-contract';
import IrrecoverableErr from '../../irrecoverable_err';
import { transcode } from './ffmpeg';

export default async function transcodeVideo(props: TMsgAttrs, signal?: AbortSignal) {
  if (props.sub === VideoProcessingSub.CONVERT_TO_HLS) return transcode(props, 'video-hls', signal);
  if (props.sub === VideoProcessingSub.CONVERT_TO_MP4) return transcode(props, 'video-mp4', signal);
  throw new IrrecoverableErr('Unsupported video output');
}
