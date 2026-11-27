import 'server-only';

import { fetchProviderPayloadFromBff, type ProviderPayloadResult } from '@/lib/bffFetch';
import { hasStrings, isCreditedOrigin, isYearAlignedCountryData } from '@/lib/payloadGuards';
import { TREE_COVER_LOSS_DRIVER_IDS } from '@eco-metrics/shared';
import type { ApiResponseMeta, ForestAreaData, TreeCoverLossData } from '@eco-metrics/shared';

export interface DeforestationPayload<T> {
  data: T;
  meta: ApiResponseMeta;
}

/** The forest area payload (FAO through Our World in Data): areas, shares and the FAO origin. */
function isForestAreaData(data: unknown): data is ForestAreaData {
  if (!isYearAlignedCountryData(data, ['area', 'share'])) {
    return false;
  }
  const { units, dataset, origin } = data as unknown as Record<string, unknown>;
  return (
    hasStrings(units, ['area', 'share']) &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin)
  );
}

/** The drivers list must be the seven known drivers, in stacking order, each with its name. */
function hasDriversInOrder(drivers: unknown): boolean {
  return (
    Array.isArray(drivers) &&
    drivers.length === TREE_COVER_LOSS_DRIVER_IDS.length &&
    drivers.every(
      (driver: unknown, index) =>
        hasStrings(driver, ['id', 'name']) &&
        (driver as { id: string }).id === TREE_COVER_LOSS_DRIVER_IDS[index],
    )
  );
}

/** The tree cover loss payload (Global Forest Watch through Our World in Data), seven drivers. */
function isTreeCoverLossData(data: unknown): data is TreeCoverLossData {
  if (!isYearAlignedCountryData(data, TREE_COVER_LOSS_DRIVER_IDS)) {
    return false;
  }
  const { unit, dataset, origin, drivers } = data as unknown as Record<string, unknown>;
  return (
    typeof unit === 'string' &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin) &&
    hasDriversInOrder(drivers)
  );
}

/**
 * Fetches the forest area dataset and its attribution. Resolves `provider-unavailable` when the
 * BFF reports that its provider is down and it holds no snapshot; throws on any other failure.
 */
export async function getForestArea(): Promise<
  ProviderPayloadResult<DeforestationPayload<ForestAreaData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/deforestation/forest-area',
    label: 'Forest area data',
    isData: isForestAreaData,
  });
}

/** Fetches tree cover loss by dominant driver, with the same failure contract as the forest area. */
export async function getTreeCoverLoss(): Promise<
  ProviderPayloadResult<DeforestationPayload<TreeCoverLossData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/deforestation/tree-cover-loss',
    label: 'Tree cover loss data',
    isData: isTreeCoverLossData,
  });
}
