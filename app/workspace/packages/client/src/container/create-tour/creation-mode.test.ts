import { SAMPLE_ANN_CONFIG_TEXT } from '@fable/common/dist/utils';
import { SAMPLE_AI_ANN_CONFIG_TEXT } from '../../constants';
import { getCreationModeDefaults } from './creation-mode';

describe('creation mode defaults', () => {
  it('preserves manual fallback content without an overlay', () => {
    expect(getCreationModeDefaults('manual')).toEqual({
      fallbackAnnotationText: SAMPLE_ANN_CONFIG_TEXT,
      showOverlay: false,
    });
  });

  it('preserves AI fallback content with an overlay', () => {
    expect(getCreationModeDefaults('ai')).toEqual({
      fallbackAnnotationText: SAMPLE_AI_ANN_CONFIG_TEXT,
      showOverlay: true,
    });
  });
});
