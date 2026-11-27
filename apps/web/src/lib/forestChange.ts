import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { ForestAreaData, ForestAreaEntity } from '@eco-metrics/shared';

/**
 * A country is ranked by percentage change only when its forest area in the first year was at
 * least this many hectares: a tiny forest would otherwise head the percentage ranking.
 */
export const RANKING_MIN_FIRST_AREA_HA = 1_000_000;

type YearRange = Pick<ForestAreaData, 'startYear' | 'endYear'>;

/** Net change in forest area between the first and the last year of the payload. */
export interface ForestChange {
  /** `last - first`, in hectares. */
  hectares: number;
  /** `(last - first) / first * 100`; `null` when the first value is 0 (undefined, never `NaN`). */
  percent: number | null;
}

/**
 * The net change of one entity, derived once from its area array so the key figures, the map and
 * the ranking can never disagree. `undefined` when the first or the last year has no value.
 */
export function forestChange(
  entity: Pick<ForestAreaEntity, 'area'>,
  { startYear, endYear }: YearRange,
): ForestChange | undefined {
  const first = entity.area[0];
  const last = entity.area[endYear - startYear];
  if (first === null || first === undefined || last === null || last === undefined) {
    return undefined;
  }
  return {
    hectares: last - first,
    percent: first > 0 ? ((last - first) / first) * 100 : null,
  };
}

/** A percentage rounded to one decimal: the value tables print, so a class never contradicts it. */
export function roundPercent(percent: number): number {
  return Math.round(percent * 10) / 10;
}

/** Lower bounds (percent) between the seven classes of the map, loss end to gain end. */
export const FOREST_CHANGE_CLASS_BREAKS = [-50, -25, -5, 5, 25, 50] as const;

/** The measure a ranking is sorted by. */
export type ForestRankingKey = 'hectares' | 'percent';

/** `ascending` lists the largest loss first (the most negative value), `descending` the gains. */
export type ForestRankingOrder = 'ascending' | 'descending';

export interface ForestRankingSort {
  key: ForestRankingKey;
  order: ForestRankingOrder;
}

/** The ranking opens on net change in hectares, largest loss first. */
export const DEFAULT_FOREST_RANKING_SORT: ForestRankingSort = {
  key: 'hectares',
  order: 'ascending',
};

export interface ForestRankingRow {
  /**
   * Competition rank by the sort measure, largest loss first (1, 2, 2, 4); it does not change
   * with the order. `null` for a country the measure does not rank.
   */
  rank: number | null;
  entity: ForestAreaEntity;
  /** `null` when the first or the last year has no value. */
  hectares: number | null;
  /** `null` when the first year is missing or 0. */
  percent: number | null;
  /** Forest area in the first year, which decides whether the percentage ranks. */
  firstArea: number | null;
}

export interface ForestRanking {
  rows: ForestRankingRow[];
  /** Countries the percentage measure does not rank (below the threshold or without a value). */
  unrankedByPercent: number;
}

const byName = (a: ForestRankingRow, b: ForestRankingRow): number =>
  a.entity.name.localeCompare(b.entity.name, 'en');

/** Whether the country takes part in the ranking by this measure. */
function isRanked(row: ForestRankingRow, key: ForestRankingKey): boolean {
  if (key === 'hectares') {
    return row.hectares !== null;
  }
  return (
    row.percent !== null && row.firstArea !== null && row.firstArea >= RANKING_MIN_FIRST_AREA_HA
  );
}

/**
 * Every country of the payload (World excluded; the API already left out regions and income
 * groups) with its net change, sorted by `sort`. Ranked rows come first in the chosen order and
 * every other row follows in name order, whatever the order, without a rank. Ranks are
 * competition ranks of the loss-first order, so a country keeps its rank when the order flips.
 */
export function rankForestCountries(
  data: Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'>,
  { key, order }: ForestRankingSort = DEFAULT_FOREST_RANKING_SORT,
): ForestRanking {
  const all: ForestRankingRow[] = data.entities
    .filter(({ code }) => code !== WORLD_ENTITY_CODE)
    .map((entity) => {
      const change = forestChange(entity, data);
      return {
        rank: null,
        entity,
        hectares: change?.hectares ?? null,
        percent: change?.percent ?? null,
        firstArea: entity.area[0] ?? null,
      };
    });

  const value = (row: ForestRankingRow): number =>
    (key === 'hectares' ? row.hectares : row.percent) ?? 0;
  const ranked = all.filter((row) => isRanked(row, key));
  const unranked = all.filter((row) => !isRanked(row, key)).sort(byName);

  ranked.sort((a, b) => value(a) - value(b) || byName(a, b));
  ranked.forEach((row, position) => {
    const previous = ranked[position - 1];
    row.rank = previous && value(previous) === value(row) ? previous.rank : position + 1;
  });
  if (order === 'descending') {
    ranked.sort((a, b) => value(b) - value(a) || byName(a, b));
  }

  return {
    rows: [...ranked, ...unranked],
    unrankedByPercent: all.filter((row) => !isRanked(row, 'percent')).length,
  };
}
