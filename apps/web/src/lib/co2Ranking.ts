import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { Co2EmissionsData, Co2EmissionsEntity } from '@eco-metrics/shared';

/** The measure a ranking is sorted by. */
export type RankingKey = 'perCapita' | 'total';

/** Which end of the ranking comes first. */
export type RankingOrder = 'descending' | 'ascending';

export interface RankingSort {
  key: RankingKey;
  order: RankingOrder;
}

/** The map's own order: highest emissions per capita first. */
export const DEFAULT_RANKING_SORT: RankingSort = { key: 'perCapita', order: 'descending' };

export interface Co2RankingRow {
  /**
   * Position by the sort measure, highest first; equal values share a rank. `null` when the
   * country has no value for that measure (only possible for the total).
   */
  rank: number | null;
  entity: Co2EmissionsEntity;
  perCapita: number;
  /** `null` when the dataset has no total for that year. */
  total: number | null;
}

const byName = (a: Co2RankingRow, b: Co2RankingRow): number =>
  a.entity.name.localeCompare(b.entity.name, 'en');

/**
 * Countries with a CO2-per-capita value in `year` (the countries the map colors; World left
 * out), sorted by `sort`. Ranks are competition ranks of the descending order (1, 2, 2, 4), so a
 * country keeps its rank whichever end is shown first. Equal values are listed by name, and a
 * country without a total goes last, unranked, when sorting by total.
 */
export function rankCo2Countries(
  data: Pick<Co2EmissionsData, 'startYear' | 'entities'>,
  year: number,
  { key, order }: RankingSort = DEFAULT_RANKING_SORT,
): Co2RankingRow[] {
  const index = year - data.startYear;
  const ranked: Co2RankingRow[] = [];
  const unranked: Co2RankingRow[] = [];
  for (const entity of data.entities) {
    const perCapita = entity.perCapita[index] ?? null;
    if (entity.code === WORLD_ENTITY_CODE || perCapita === null) {
      continue;
    }
    const row = { rank: null, entity, perCapita, total: entity.total[index] ?? null };
    (row[key] === null ? unranked : ranked).push(row);
  }

  const value = (row: Co2RankingRow): number => row[key] ?? 0;
  ranked.sort((a, b) => value(b) - value(a) || byName(a, b));
  ranked.forEach((row, position) => {
    const previous = ranked[position - 1];
    row.rank = previous && value(previous) === value(row) ? previous.rank : position + 1;
  });

  if (order === 'ascending') {
    ranked.sort((a, b) => value(a) - value(b) || byName(a, b));
  }
  return [...ranked, ...unranked.sort(byName)];
}
