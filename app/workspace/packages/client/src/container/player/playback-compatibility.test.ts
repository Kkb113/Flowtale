import { INTERACTIVE_MODE } from '../../types';
import {
  resolveLegacyInteractiveMode,
  shouldApplyLegacyVoiceoverZoom,
  shouldShowVoiceoverControl,
} from './playback-compatibility';

describe('legacy playback compatibility', () => {
  it('promotes an old untyped demo with voiceover to interactive video', () => {
    expect(resolveLegacyInteractiveMode(
      undefined,
      INTERACTIVE_MODE.INTERACTIVE_TOUR,
      false,
      true,
    )).toBe(INTERACTIVE_MODE.INTERACTIVE_VIDEO);
  });

  it('does not override explicit, staging, or already-selected modes', () => {
    expect(resolveLegacyInteractiveMode(false, INTERACTIVE_MODE.INTERACTIVE_TOUR, false, true))
      .toBe(INTERACTIVE_MODE.INTERACTIVE_TOUR);
    expect(resolveLegacyInteractiveMode(undefined, INTERACTIVE_MODE.INTERACTIVE_TOUR, true, true))
      .toBe(INTERACTIVE_MODE.INTERACTIVE_TOUR);
    expect(resolveLegacyInteractiveMode(undefined, INTERACTIVE_MODE.INTERACTIVE_VIDEO, false, false))
      .toBe(INTERACTIVE_MODE.INTERACTIVE_VIDEO);
  });

  it('keeps legacy zoom and controls scoped to voiceover navigation', () => {
    expect(shouldApplyLegacyVoiceoverZoom('voiceover')).toBe(true);
    expect(shouldApplyLegacyVoiceoverZoom('default')).toBe(false);
    expect(shouldShowVoiceoverControl('voiceover', INTERACTIVE_MODE.INTERACTIVE_VIDEO)).toBe(true);
    expect(shouldShowVoiceoverControl('voiceover', INTERACTIVE_MODE.INTERACTIVE_TOUR)).toBe(false);
  });
});
