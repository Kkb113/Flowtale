import { IAnnotationConfig } from '@fable/common/dist/types';
import { INTERACTIVE_MODE } from '../../types';

export function hasLegacyVoiceover(annotations: IAnnotationConfig[] | undefined): boolean {
  return Boolean(annotations && annotations.some(annotation => annotation.voiceover !== null));
}

export function resolveLegacyInteractiveMode(
  persistedIsVideo: boolean | undefined,
  currentMode: INTERACTIVE_MODE,
  staging: boolean,
  voiceoverPresent: boolean,
): INTERACTIVE_MODE {
  if (persistedIsVideo !== undefined || currentMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO || staging) {
    return currentMode;
  }
  return voiceoverPresent ? INTERACTIVE_MODE.INTERACTIVE_VIDEO : INTERACTIVE_MODE.INTERACTIVE_TOUR;
}

export function shouldApplyLegacyVoiceoverZoom(annotationType: string): boolean {
  return annotationType === 'voiceover';
}

export function shouldShowVoiceoverControl(
  annotationType: string,
  mode: INTERACTIVE_MODE,
): boolean {
  return shouldApplyLegacyVoiceoverZoom(annotationType) && mode === INTERACTIVE_MODE.INTERACTIVE_VIDEO;
}
