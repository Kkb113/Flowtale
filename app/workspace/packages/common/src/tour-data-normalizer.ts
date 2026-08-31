import { SchemaVersion } from './api-contract';
import { ITourDiganostics, JourneyData, TourData, TourDataWoScheme } from './types';

export type LegacyTourSchemaVersion = 1 | 2;
export type SupportedTourSchemaVersion = SchemaVersion | LegacyTourSchemaVersion;

export interface TourDataNormalizationDefaults {
  opts: TourDataWoScheme['opts'];
  journey: JourneyData;
  diagnostics?: ITourDiganostics;
}

export class UnsupportedTourSchemaError extends Error {
  constructor(version: unknown) {
    super(`Unsupported tour schema version: ${String(version)}`);
    this.name = 'UnsupportedTourSchemaError';
    Object.setPrototypeOf(this, UnsupportedTourSchemaError.prototype);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSupportedTourSchemaVersion(version: unknown): version is SupportedTourSchemaVersion {
  return version === 1
    || version === 2
    || version === SchemaVersion.V1
    || version === SchemaVersion.V2;
}

export function normalizeTourDataDocument(
  value: unknown,
  defaults: TourDataNormalizationDefaults,
): TourData {
  if (!isRecord(value)) throw new TypeError('Tour data must be an object');
  const version = value.v === undefined ? SchemaVersion.V1 : value.v;
  if (!isSupportedTourSchemaVersion(version)) throw new UnsupportedTourSchemaError(version);

  const entities = isRecord(value.entities) ? value.entities : {};
  const diagnostics = isRecord(value.diagnostics) ? value.diagnostics : (defaults.diagnostics || {});
  const opts = isRecord(value.opts) ? value.opts : defaults.opts;
  const journey = isRecord(value.journey) ? value.journey : defaults.journey;
  const lastUpdatedAtUtc = typeof value.lastUpdatedAtUtc === 'number' ? value.lastUpdatedAtUtc : -1;

  return {
    v: version,
    lastUpdatedAtUtc,
    opts: { ...opts } as TourDataWoScheme['opts'],
    entities: { ...entities } as TourDataWoScheme['entities'],
    diagnostics: { ...diagnostics } as ITourDiganostics,
    journey: {
      ...(journey as unknown as JourneyData),
      flows: Array.isArray((journey as unknown as JourneyData).flows)
        ? [...(journey as unknown as JourneyData).flows]
        : [...defaults.journey.flows],
    },
  };
}
