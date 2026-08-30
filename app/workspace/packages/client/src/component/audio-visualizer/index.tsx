import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { calculateBarData, draw } from './utils';
import * as Tags from './styled';

export interface Props extends React.HTMLAttributes<HTMLCanvasElement> {
  /**
   * Media recorder whose stream needs to be visualized
   */
  mediaRecorder?: MediaRecorder;
  /**
   * Audio element that needs to be visualized
   */
  audioElement?: HTMLAudioElement;
  /**
   * Width of the visualization. Default: "100%"
   */
  width?: number | string;
  /**
   * Height of the visualization. Default: "100%"
   */
  height?: number | string;
  /**
   * Width of each individual bar in the visualization. Default: `2`
   */
  barWidth?: number;
  /**
   * Gap between each bar in the visualization. Default: `1`
   */
  gap?: number;
  /**
   * Background color for the visualization. Default: `transparent`
   */
  backgroundColor?: string;
  /**
   * Color of the bars drawn in the visualization. Default: `"rgb(160, 198, 255)"`
   */
  barColor?: string;
  /**
   * An unsigned integer, representing the window size of the FFT. Default: `1024`
   */
  fftSize?:
    | 32
    | 64
    | 128
    | 256
    | 512
    | 1024
    | 2048
    | 4096
    | 8192
    | 16384
    | 32768;
  /**
   * A double, representing the maximum decibel value for scaling the FFT analysis data. Default: `-10`
   */
  maxDecibels?: number;
  /**
   * A double, representing the minimum decibel value for scaling the FFT analysis data. Default: `-90`
   */
  minDecibels?: number;
  /**
   * A double within the range 0 to 1 (0 meaning no time averaging). Default: `0.4`
   */
  smoothingTimeConstant?: number;
}

function AudioVisualizer({
  mediaRecorder,
  audioElement,
  width = '100%',
  height = '100%',
  barWidth = 2,
  gap = 1,
  backgroundColor = 'transparent',
  barColor = '#16023E',
  fftSize = 1024,
  maxDecibels = -10,
  minDecibels = -90,
  smoothingTimeConstant = 0.4,
  ...rest
}: Props): ReactElement {
  const [context] = useState(() => new AudioContext());
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSrcConnectedRef = useRef(false);

  const createAnalyser = (ctx: AudioContext): AnalyserNode => {
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = fftSize;
    analyserNode.minDecibels = minDecibels;
    analyserNode.maxDecibels = maxDecibels;
    analyserNode.smoothingTimeConstant = smoothingTimeConstant;
    return analyserNode;
  };

  useEffect(() => {
    if (mediaRecorder?.stream && !isSrcConnectedRef.current) {
      const analyserNode = createAnalyser(context);
      setAnalyser(analyserNode);
      const source = context.createMediaStreamSource(mediaRecorder.stream);
      source.connect(analyserNode);
      isSrcConnectedRef.current = true;
    } else if (audioElement && !isSrcConnectedRef.current) {
      const analyserNode = createAnalyser(context);
      setAnalyser(analyserNode);
      const source = context.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(context.destination);
      isSrcConnectedRef.current = true;
    }
  }, [mediaRecorder?.stream, audioElement, context, fftSize, maxDecibels, minDecibels, smoothingTimeConstant]);

  useEffect(() => {
    if (analyser) {
      if (mediaRecorder) {
        report();
      } else if (audioElement) {
        audioElement.addEventListener('play', report);
        audioElement.addEventListener('pause', report);
        audioElement.addEventListener('ended', report);
        if (!audioElement.paused && !audioElement.ended) report();
        return () => {
          audioElement.removeEventListener('play', report);
          audioElement.removeEventListener('pause', report);
          audioElement.removeEventListener('ended', report);
        };
      }
    }
    return () => {};
  }, [analyser, mediaRecorder, audioElement]);

  const report = useCallback(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const drawVisualizer = (): void => {
      if (!canvasRef.current) return;

      analyser.getByteFrequencyData(data);
      processFrequencyData(data);
      if (mediaRecorder?.state === 'recording') {
        requestAnimationFrame(drawVisualizer);
      } else if (audioElement && !audioElement.paused && !audioElement.ended) {
        requestAnimationFrame(drawVisualizer);
      } else if (mediaRecorder?.state === 'inactive' && context.state !== 'closed') {
        context.close();
      }
    };

    drawVisualizer();
  }, [analyser, audioElement, mediaRecorder?.state, context]);

  const processFrequencyData = (data: Uint8Array): void => {
    if (!canvasRef.current) return;

    const dataPoints = calculateBarData(
      data,
      canvasRef.current.getBoundingClientRect().width,
      barWidth,
      gap
    );
    draw(
      dataPoints,
      canvasRef.current,
      barWidth,
      gap,
      backgroundColor,
      barColor
    );
  };

  return (
    <Tags.Canvas
      ref={canvasRef}
      width={width}
      height={height}
      {...rest}
    />
  );
}

export default AudioVisualizer;
