import 'server-only';

import { fetchPayloadFromBff } from '@/lib/bffFetch';
import {
  hasStrings,
  isDataSourceOrigin,
  isNumberOrNullArray,
  isYearAlignedCountryData,
} from '@/lib/payloadGuards';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';
import type { ApiResponseMeta, EnergySourcesData } from '@eco-metrics/shared';

export interface EnergySourcesPayload {
  data: EnergySourcesData;
  meta: ApiResponseMeta;
}

/** True for a `generation` object with one aligned array per source. */
function isGeneration(value: unknown, length: number): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return ENERGY_SOURCE_IDS.every((id) =>
    isNumberOrNullArray((value as Record<string, unknown>)[id], length),
  );
}

/**
 * Accepts only a payload the page can render without guarding every access.
 * Shares are not on the wire (the page derives them), so none is required.
 */
function isEnergySourcesData(data: unknown): data is EnergySourcesData {
  if (!isYearAlignedCountryData(data, [])) {
    return false;
  }
  const { startYear, endYear, entities } = data;
  const { unit, dataset, origin } = data as unknown as Record<string, unknown>;
  const length = endYear - startYear + 1;

  return (
    typeof unit === 'string' &&
    hasStrings(dataset, ['name', 'version']) &&
    isDataSourceOrigin(origin) &&
    entities.every((entity) =>
      isGeneration((entity as unknown as Record<string, unknown>).generation, length),
    )
  );
}

/** Fetches the energy sources dataset and its attribution; throws when every attempt fails. */
export async function getEnergySources(): Promise<EnergySourcesPayload> {
  return fetchPayloadFromBff({
    path: '/energy-sources',
    label: 'Energy sources data',
    isData: isEnergySourcesData,
  });
}
