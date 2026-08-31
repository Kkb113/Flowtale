import { SAMPLE_ANN_CONFIG_TEXT } from '@fable/common/dist/utils';
import { SAMPLE_AI_ANN_CONFIG_TEXT } from '../../constants';

export type DemoCreationMode = 'ai' | 'manual';

export function getCreationModeDefaults(mode: DemoCreationMode): {
  fallbackAnnotationText: string;
  showOverlay: boolean;
} {
  return mode === 'ai'
    ? { fallbackAnnotationText: SAMPLE_AI_ANN_CONFIG_TEXT, showOverlay: true }
    : { fallbackAnnotationText: SAMPLE_ANN_CONFIG_TEXT, showOverlay: false };
}
