import { ENERGY_SOURCE_IDS, RENEWABLE_SOURCE_IDS } from '@eco-metrics/shared';
import type { EnergySourceId, EnergySourcesEntity } from '@eco-metrics/shared';

/** Display label of each source, in the order of `ENERGY_SOURCE_IDS`. */
export const ENERGY_SOURCE_LABELS: Record<EnergySourceId, string> = {
  coal: 'Coal',
  gas: 'Gas',
  oil: 'Oil',
  nuclear: 'Nuclear',
  hydro: 'Hydro',
  wind: 'Wind',
  solar: 'Solar',
  bioenergyOther: 'Bioenergy & other renewables',
};

/** One value per source (a generation or a share); `null` where the source has none. */
export type SourceValues = Record<EnergySourceId, number | null>;

/** One year-aligned array per source (generation or share). */
export type SourceSeries = Record<EnergySourceId, (number | null)[]>;

/** Which energy sources measure a chart or table shows (a display choice, not on the wire). */
export type EnergyMetric = 'share' | 'generation';

/** The generation of every source in the year at `index` of the aligned arrays. */
export function generationAt(generation: SourceSeries, index: number): SourceValues {
  return Object.fromEntries(
    ENERGY_SOURCE_IDS.map((id) => [id, generation[id][index] ?? null]),
  ) as SourceValues;
}

/**
 * The share of each source in one year: `generation / sum(present generation) × 100`.
 * A `null` generation stays a `null` share and does not enter the sum; a year
 * whose present generation is all `null` or sums to 0 has no shares at all.
 * Computed from the served (already rounded) values and rounded only for display,
 * so the present shares of a year add up to 100.
 */
export function sharesOf(generation: SourceValues): SourceValues {
  const present = ENERGY_SOURCE_IDS.map((id) => generation[id]).filter(
    (value): value is number => value !== null,
  );
  const total = present.reduce((sum, value) => sum + value, 0);

  return Object.fromEntries(
    ENERGY_SOURCE_IDS.map((id) => {
      const value = generation[id];
      return [id, value === null || total <= 0 ? null : (value / total) * 100];
    }),
  ) as SourceValues;
}

/** The share of each source in every year of the entity's aligned arrays. */
export function shareSeries(entity: Pick<EnergySourcesEntity, 'generation'>): SourceSeries {
  const length = entity.generation[ENERGY_SOURCE_IDS[0]].length;
  const years = Array.from({ length }, (_, index) =>
    sharesOf(generationAt(entity.generation, index)),
  );

  return Object.fromEntries(
    ENERGY_SOURCE_IDS.map((id) => [id, years.map((year) => year[id])]),
  ) as SourceSeries;
}

/**
 * The latest year of an entity: the latest with a positive generation sum. It can
 * be earlier than the payload's `endYear` for an entity that stopped reporting.
 */
export function latestYear(
  entity: Pick<EnergySourcesEntity, 'generation'>,
  startYear: number,
): number | undefined {
  const length = entity.generation[ENERGY_SOURCE_IDS[0]].length;
  for (let index = length - 1; index >= 0; index--) {
    const total = ENERGY_SOURCE_IDS.reduce(
      (sum, id) => sum + (entity.generation[id][index] ?? 0),
      0,
    );
    if (total > 0) {
      return startYear + index;
    }
  }
  return undefined;
}

/**
 * The renewables share of one year: the sum of the renewable sources' shares,
 * `null` when none of them has a share (never a fabricated zero).
 */
export function renewablesShare(shares: SourceValues): number | null {
  const present = RENEWABLE_SOURCE_IDS.map((id) => shares[id]).filter(
    (share): share is number => share !== null,
  );
  return present.length === 0 ? null : present.reduce((sum, share) => sum + share, 0);
}

/** The source with the greatest present share; a tie goes to the earlier source in the fixed order. */
export function largestSource(
  shares: SourceValues,
): { id: EnergySourceId; share: number } | undefined {
  let largest: { id: EnergySourceId; share: number } | undefined;
  for (const id of ENERGY_SOURCE_IDS) {
    const share = shares[id];
    if (share !== null && (largest === undefined || share > largest.share)) {
      largest = { id, share };
    }
  }
  return largest;
}
