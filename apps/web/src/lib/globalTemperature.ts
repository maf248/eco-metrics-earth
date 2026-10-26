import 'server-only';

import { fetchPayloadFromBff } from '@/lib/bffFetch';
import {
  hasStrings,
  isDataSourceOrigin,
  isNumberOrNullArray,
  isYearAlignedCountryData,
} from '@/lib/payloadGuards';
import type { ApiResponseMeta, GlobalTemperatureData } from '@eco-metrics/shared';

export interface GlobalTemperaturePayload {
  data: GlobalTemperatureData;
  meta: ApiResponseMeta;
}

/** Both upstream licenses ask for their notice wherever the data is shown, so it is required. */
function isCreditedOrigin(value: unknown): boolean {
  return isDataSourceOrigin(value) && typeof value.notice === 'string';
}

function isBaseline(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { startYear, endYear } = value as Record<string, unknown>;
  return typeof startYear === 'number' && typeof endYear === 'number' && startYear <= endYear;
}

/** The World series since 1850: aligned mean and bounds, baseline, dataset and origin. */
function isGlobalSeries(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { startYear, endYear, baseline, mean, lower, upper, dataset, origin } = value as Record<
    string,
    unknown
  >;
  if (typeof startYear !== 'number' || typeof endYear !== 'number' || endYear < startYear) {
    return false;
  }
  const length = endYear - startYear + 1;
  return (
    isBaseline(baseline) &&
    isNumberOrNullArray(mean, length) &&
    isNumberOrNullArray(lower, length) &&
    isNumberOrNullArray(upper, length) &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin)
  );
}

/** Accepts only a payload the page can render without guarding every access. */
function isGlobalTemperatureData(data: unknown): data is GlobalTemperatureData {
  if (!isYearAlignedCountryData(data, ['anomaly'])) {
    return false;
  }
  const { unit, baseline, dataset, origin, global } = data as unknown as Record<string, unknown>;
  return (
    typeof unit === 'string' &&
    isBaseline(baseline) &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin) &&
    isGlobalSeries(global)
  );
}

/** Fetches the global temperature dataset and its attribution; throws when every attempt fails. */
export async function getGlobalTemperature(): Promise<GlobalTemperaturePayload> {
  return fetchPayloadFromBff({
    path: '/global-temperature',
    label: 'Global temperature data',
    isData: isGlobalTemperatureData,
  });
}
