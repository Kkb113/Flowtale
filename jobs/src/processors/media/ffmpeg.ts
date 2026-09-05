import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { TMsgAttrs } from '../../types';
import IrrecoverableErr from '../../irrecoverable_err';

const MAX_INPUT_BYTES = 200 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 500 * 1024 * 1024;
const MAX_DURATION_SECONDS = 15 * 60;
const FORMATS = 'mov,matroska,webm,mp3,wav,ogg,flac,aac';
export type MediaOutput = 'video-mp4' | 'video-hls' | 'audio-webm' | 'audio-hls';

export function mediaObject(url: string, bucket: string, endpoint?: string, publicEndpoint?: string): string {
  const parsed = new URL(url);
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new IrrecoverableErr('Invalid media URL');
  let key: string;
  if ([endpoint, publicEndpoint].some(value => value && parsed.origin === new URL(value).origin)
      && parsed.pathname.startsWith(`/${bucket}/`)) {
    key = decodeURIComponent(parsed.pathname.slice(bucket.length + 2));
  } else if (parsed.protocol === 'https:'
    && new RegExp(`^${bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.s3(?:[.-][a-z0-9-]+)?\\.amazonaws\\.com$`)
      .test(parsed.hostname)) {
    key = decodeURIComponent(parsed.pathname.slice(1));
  } else {
    throw new IrrecoverableErr('Media must belong to the configured asset bucket');
  }
  if (!key || key.split('/').some(part => part === '..' || part === '.')
    || Array.from(key).some(char => char.charCodeAt(0) < 32 || char === '\\')) {
    throw new IrrecoverableErr('Invalid media object key');
  }
  return key;
}

export function runMediaProcess(binary: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
    });
    let stdout = '';
    let failure: Error | undefined;
    const stop = (error: Error) => { failure = error; child.kill('SIGKILL'); };
    const abort = () => stop(new Error('Media processing canceled'));
    const timer = setTimeout(() => stop(new Error('Media processing exceeded its time limit')), 12 * 60 * 1000);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      if (stdout.length > 1024 * 1024) stop(new Error('Media metadata exceeds limit'));
    });
    // Drain diagnostics, but never retain source paths, file contents or credentials in logs/errors.
    child.stderr.resume();
    child.on('error', () => { failure = new Error('Media executable could not start'); });
    child.on('close', code => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (failure || code !== 0) reject(failure || new IrrecoverableErr('Unsupported or corrupt media'));
      else resolve(stdout);
    });
  });
}

export async function encodeMedia(input: string, directory: string, output: MediaOutput, signal?: AbortSignal) {
  const metadata = JSON.parse(await runMediaProcess(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file,pipe', '-format_whitelist', FORMATS,
    '-show_format', '-show_streams', '-of', 'json', input,
  ], signal)) as { format: { duration?: string }; streams: { codec_type: string; width?: number; height?: number }[] };
  const inputDuration = metadata.format.duration === undefined ? undefined : Number(metadata.format.duration);
  if (inputDuration !== undefined && (!Number.isFinite(inputDuration) || inputDuration <= 0
      || inputDuration > MAX_DURATION_SECONDS)) {
    throw new IrrecoverableErr('Media must be at most 15 minutes');
  }
  const video = output.startsWith('video');
  const stream = metadata.streams.find(item => item.codec_type === (video ? 'video' : 'audio'));
  if (!stream || (stream.width || 0) > 4096 || (stream.height || 0) > 4096) {
    throw new IrrecoverableErr('Media stream is missing or exceeds the supported resolution');
  }
  const hls = output.endsWith('hls');
  const filename = hls ? 'master.m3u8' : output === 'video-mp4' ? 'media.mp4' : 'media.webm';
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-protocol_whitelist', 'file,pipe', '-format_whitelist', FORMATS, '-threads', '2', '-i', input,
    '-map_metadata', '-1', '-map_chapters', '-1', '-t', String(MAX_DURATION_SECONDS + 1), '-threads', '2'];
  if (video) args.push('-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast',
    '-crf', '23', '-pix_fmt', 'yuv420p', '-vf',
    'scale=w=\'min(1920,iw)\':h=\'min(1080,ih)\':force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:a', 'aac', '-b:a', '128k');
  else args.push('-map', '0:a:0', '-vn', '-c:a', hls ? 'aac' : 'libopus', '-b:a', '128k');
  if (hls) args.push('-force_key_frames', 'expr:gte(t,n_forced*4)', '-f', 'hls', '-hls_time', '4',
    '-hls_playlist_type', 'vod', '-hls_segment_filename', join(directory, 'segment-%05d.ts'));
  else if (video) args.push('-movflags', '+faststart');
  args.push(join(directory, filename));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  let checking = Promise.resolve();
  let checkingActive = false;
  let exceeded = false;
  const monitor = setInterval(() => {
    if (checkingActive) return;
    checkingActive = true;
    checking = (async () => {
      let bytes = 0;
      for (const file of await readdir(directory)) {
        if (file !== basename(input)) bytes += (await stat(join(directory, file))).size;
      }
      if (bytes >= MAX_OUTPUT_BYTES) { exceeded = true; controller.abort(); }
    })().catch(() => controller.abort()).finally(() => { checkingActive = false; });
  }, 100);
  try {
    await runMediaProcess(process.env.FFMPEG_PATH || 'ffmpeg', args, controller.signal);
  } finally {
    clearInterval(monitor);
    await checking;
    signal?.removeEventListener('abort', abort);
  }
  if (exceeded) throw new IrrecoverableErr('Media output exceeds size limit');
  const files = (await readdir(directory)).filter(file => file !== basename(input));
  let total = 0;
  for (const file of files) total += (await stat(join(directory, file))).size;
  if (total === 0 || total >= MAX_OUTPUT_BYTES) throw new IrrecoverableErr('Media output exceeds size limit');
  // Browser MediaRecorder WebM often lacks duration headers. Measure the complete encoded output instead.
  const completed = JSON.parse(await runMediaProcess(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file,pipe,crypto', '-show_format', '-of', 'json', join(directory, filename),
  ], signal));
  const duration = Number(completed.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_SECONDS + 0.1
      || inputDuration !== undefined && duration < inputDuration - 0.25) {
    throw new IrrecoverableErr('Media output is incomplete or exceeds 15 minutes');
  }
  return { files, filename, duration };
}

export async function transcode(props: TMsgAttrs, output: MediaOutput, signal?: AbortSignal) {
  const bucket = process.env.AWS_ASSET_FILE_S3_BUCKET;
  if (!bucket) throw new Error('Asset bucket is not configured');
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL;
  const source = mediaObject(props.sourceFilePath || '', bucket, endpoint, process.env.AWS_PUBLIC_ENDPOINT);
  const destination = mediaObject(props.processedFilePath || '', bucket, endpoint, process.env.AWS_PUBLIC_ENDPOINT);
  const suffix = output.endsWith('hls') ? '_hls/master' : output === 'video-mp4' ? '.mp4' : '.webm';
  if (destination !== source + suffix) throw new IrrecoverableErr('Invalid media output location');
  const s3 = new S3Client({ region: process.env.AWS_ASSET_FILE_S3_BUCKET_REGION, endpoint, forcePathStyle: !!endpoint });
  const directory = await mkdtemp(join(tmpdir(), 'fable-media-'));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const deadline = setTimeout(() => controller.abort(), 14 * 60 * 1000);
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: source }), { abortSignal: controller.signal });
    if (!object.Body || (object.ContentLength || 0) > MAX_INPUT_BYTES) throw new IrrecoverableErr('Media exceeds input limit');
    let received = 0;
    const limit = new Transform({ transform(chunk, encoding, callback) {
      received += chunk.length;
      callback(received > MAX_INPUT_BYTES ? new IrrecoverableErr('Media exceeds input limit') : null, chunk);
    } });
    const input = join(directory, 'input');
    await pipeline(object.Body as Readable, limit, createWriteStream(input), { signal: controller.signal });
    const result = await encodeMedia(input, directory, output, controller.signal);
    // The manifest is the final upload: no success/playlist before all segments exist.
    result.files.sort((a, b) => Number(a === result.filename) - Number(b === result.filename));
    for (const file of result.files) {
      const key = output.endsWith('hls') ? `${destination.slice(0, -'master'.length)}${file}` : destination;
      const type = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl'
        : file.endsWith('.ts') ? 'video/mp2t' : output === 'video-mp4' ? 'video/mp4' : 'audio/webm';
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: createReadStream(join(directory, file)),
        ContentLength: (await stat(join(directory, file))).size, ContentType: type,
      }), { abortSignal: controller.signal });
    }
    return { ...props, duration: `${result.duration}s`, meta: 'ffmpeg' };
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', abort);
    controller.abort();
    s3.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
