import 'server-only';

import { fetchPayloadFromBff } from '@/lib/bffFetch';
import { WASTE_COMPOSITION_GROUPS, WASTE_TREATMENT_GROUPS } from '@/lib/wasteMeasures';
import type { ApiResponseMeta, WasteRecyclingData } from '@eco-metrics/shared';

interface WasteRecyclingPayload {
  data: WasteRecyclingData;
  meta: ApiResponseMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasNumbers = (value: unknown, keys: readonly string[]): boolean =>
  isRecord(value) && keys.every((key) => isNumber(value[key]));

const GENERATION_KEYS = [
  'kgPerPersonPerDay2022',
  'tonnes2022',
  'tonnes2030',
  'tonnes2040',
  'tonnes2050',
] as const;

/** A treatment or composition block: a year and one number-or-null share per group. */
function isGrouped(value: unknown, groups: readonly string[]): boolean {
  if (!isRecord(value) || !isNumber(value.year) || !isRecord(value.shares)) {
    return false;
  }
  const { shares } = value;
  // Exactly one entry per group: an unknown key is a payload the page does not know.
  const wellFormed =
    Object.keys(shares).length === groups.length &&
    groups.every((group) => shares[group] === null || isNumber(shares[group]));
  // A block with nothing reported is not a block: the country has none.
  return wellFormed && groups.some((group) => shares[group] !== null);
}

function isCountry(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const { generation, treatment, composition } = value;
  return (
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    (value.iso2 === null || typeof value.iso2 === 'string') &&
    (value.population === null || isNumber(value.population)) &&
    hasNumbers(generation, GENERATION_KEYS) &&
    isRecord(generation) &&
    (generation.reportedYear === null || isNumber(generation.reportedYear)) &&
    (treatment === undefined || isGrouped(treatment, WASTE_TREATMENT_GROUPS)) &&
    (composition === undefined || isGrouped(composition, WASTE_COMPOSITION_GROUPS))
  );
}

/** Accepts only a payload the page can render without guarding every access. */
export function isWasteRecyclingData(data: unknown): data is WasteRecyclingData {
  if (!isRecord(data) || !isRecord(data.world) || !Array.isArray(data.countries)) {
    return false;
  }
  const { dataset } = data;
  return (
    isRecord(dataset) &&
    typeof dataset.title === 'string' &&
    typeof dataset.citation === 'string' &&
    hasNumbers(data.world.generation, GENERATION_KEYS) &&
    hasNumbers(data.world.recycling, ['sharePercent', 'countries', 'populationSharePercent']) &&
    data.countries.length > 0 &&
    data.countries.every(isCountry)
  );
}

/** Fetches the waste dataset and its attribution; throws when every attempt fails. */
export function getWasteRecycling(): Promise<WasteRecyclingPayload> {
  return fetchPayloadFromBff({
    path: '/waste-recycling',
    label: 'Waste and recycling data',
    isData: isWasteRecyclingData,
  });
}
