import 'server-only';

import { fetchPayloadFromBff } from '@/lib/bffFetch';
import { hasStrings, isDataSourceOrigin, isYearAlignedCountryData } from '@/lib/payloadGuards';
import type { ApiResponseMeta, Co2EmissionsData } from '@eco-metrics/shared';

export interface Co2EmissionsPayload {
  data: Co2EmissionsData;
  meta: ApiResponseMeta;
}

/** Accepts only a payload the page can render without guarding every access. */
function isCo2EmissionsData(data: unknown): data is Co2EmissionsData {
  if (!isYearAlignedCountryData(data, ['total', 'perCapita'])) {
    return false;
  }
  const { units, dataset, origin } = data as unknown as Record<string, unknown>;
  return (
    hasStrings(units, ['total', 'perCapita']) &&
    hasStrings(dataset, ['name', 'version']) &&
    isDataSourceOrigin(origin)
  );
}

/** Fetches the CO2 emissions dataset and its attribution; throws when every attempt fails. */
export async function getCo2Emissions(): Promise<Co2EmissionsPayload> {
  return fetchPayloadFromBff({
    path: '/co2-emissions',
    label: 'CO2 emissions data',
    isData: isCo2EmissionsData,
  });
}
