import { SchemaVersion } from './api-contract';
import legacyTour from './__fixtures__/legacy-tour-v2.json';
import { normalizeTourDataDocument, UnsupportedTourSchemaError } from './tour-data-normalizer';
import { CreateJourneyPositioning, PropertyType, TourDataWoScheme } from './types';

const defaults = {
  opts: {
    lf_pkf: 'email',
    main: '',
    primaryColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
    annotationBodyBackgroundColor: { type: PropertyType.LITERAL, from: '', _val: '#fff' },
    annotationBodyBorderColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
    annotationFontFamily: { type: PropertyType.LITERAL, from: '', _val: null },
    annotationFontColor: { type: PropertyType.LITERAL, from: '', _val: '#111' },
    borderRadius: { type: PropertyType.LITERAL, from: '', _val: 4 },
    showFableWatermark: { type: PropertyType.LITERAL, from: '', _val: true },
    annotationPadding: { type: PropertyType.LITERAL, from: '', _val: '14 14' },
    showStepNum: { type: PropertyType.LITERAL, from: '', _val: true },
    reduceMotionForMobile: false,
    monoIncKey: 0,
    createdAt: 1,
    updatedAt: 1,
  },
  journey: {
    positioning: CreateJourneyPositioning.Left_Bottom,
    title: '',
    flows: [],
    primaryColor: { type: PropertyType.LITERAL, from: '', _val: '#7567ff' },
    hideModuleOnLoad: false,
    hideModuleOnMobile: false,
  },
};

describe('normalizeTourDataDocument', () => {
  it('loads the legacy numeric-v2 fixture without changing its meaning', () => {
    const normalized = normalizeTourDataDocument(legacyTour, defaults);
    expect(normalized.v).toBe(2);
    expect(normalized.lastUpdatedAtUtc).toBe(1680000000);
    expect(normalized.entities).toEqual({});
    expect(normalized.opts).toEqual(defaults.opts);
    expect(normalized.journey).toEqual(defaults.journey);
  });

  it('preserves complete legacy documents while returning independent containers', () => {
    const source = {
      ...legacyTour,
      v: SchemaVersion.V1,
      opts: defaults.opts,
      journey: defaults.journey,
      diagnostics: {},
    } as unknown as TourDataWoScheme;
    const normalized = normalizeTourDataDocument(source, defaults);
    expect(normalized.opts).toEqual(source.opts);
    expect(normalized.opts).not.toBe(source.opts);
    expect(normalized.journey).not.toBe(source.journey);
  });

  it('rejects future schemas instead of guessing how to interpret them', () => {
    expect(() => normalizeTourDataDocument({ v: '2099-01-01' }, defaults))
      .toThrow(UnsupportedTourSchemaError);
  });
});
