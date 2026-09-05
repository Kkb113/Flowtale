import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeMedia, mediaObject, MediaOutput, runMediaProcess } from './ffmpeg';

describe('media object boundary', () => {
  it('accepts configured bucket URLs and local path-style storage', () => {
    expect(mediaObject('https://assets.s3.ap-south-1.amazonaws.com/usr/org/1/media', 'assets'))
      .toBe('usr/org/1/media');
    expect(mediaObject('http://localhost:4566/assets/usr/org/1/media', 'assets', 'http://localhost:4566'))
      .toBe('usr/org/1/media');
    expect(mediaObject('http://localhost:14566/assets/usr/org/1/media', 'assets',
      'http://localstack:4566', 'http://localhost:14566')).toBe('usr/org/1/media');
  });
  it.each(['https://evil.test/usr/media', 'https://other.s3.amazonaws.com/media',
    'file:///etc/passwd', 'https://assets.s3.amazonaws.com/media?credentials=secret',
    'https://assets.s3.amazonaws.com/%00'])('rejects an untrusted source: %s', url => {
    expect(() => mediaObject(url, 'assets')).toThrow();
  });
});

describe('real FFmpeg media processing', () => {
  let directory: string;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'fable-media-test-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it.each<MediaOutput>(['video-mp4', 'video-hls', 'audio-webm', 'audio-hls'])(
    'creates playable %s from an uploaded recording', async output => {
      const input = join(directory, 'input');
      await runMediaProcess(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-f', 'lavfi', '-i',
        'color=c=blue:s=160x120:r=10', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '1',
        '-c:v', 'libx264', '-c:a', 'aac', '-f', 'mp4', input]);
      const result = await encodeMedia(input, directory, output);
      expect(result.duration).toBeGreaterThan(0);
      const outputPath = join(directory, result.filename);
      const probe = JSON.parse(await runMediaProcess(process.env.FFPROBE_PATH || 'ffprobe',
        ['-v', 'error', '-show_streams', '-of', 'json', outputPath]));
      expect(probe.streams.some((stream: {codec_type: string}) => stream.codec_type ===
        (output.startsWith('video') ? 'video' : 'audio'))).toBe(true);
      if (output.endsWith('hls')) {
        const manifest = await readFile(outputPath, 'utf8');
        expect(manifest).toContain('#EXT-X-ENDLIST');
        expect(result.files).toContain('segment-00000.ts');
      }
    }, 60000,
  );

  it('rejects corrupt input without claiming a completed output', async () => {
    const input = join(directory, 'input');
    await writeFile(input, 'not a media file');
    await expect(encodeMedia(input, directory, 'video-mp4')).rejects.toThrow('Unsupported or corrupt media');
  });

  it('accepts a browser-style live WebM recording without duration metadata', async () => {
    const input = join(directory, 'input');
    await runMediaProcess(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-f', 'lavfi', '-i',
      'sine=frequency=440', '-t', '1', '-c:a', 'libopus', '-live', '1', '-f', 'webm', input]);
    const result = await encodeMedia(input, directory, 'audio-webm');
    expect(result.duration).toBeGreaterThan(0.9);
    expect(result.duration).toBeLessThan(1.2);
  });

  it('settles when the executable is missing', async () => {
    await expect(runMediaProcess(join(directory, 'missing-executable'), [])).rejects.toThrow('could not start');
  });
});
