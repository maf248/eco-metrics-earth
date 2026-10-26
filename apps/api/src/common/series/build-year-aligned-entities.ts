import {
  type CountryEntity,
  type MetricSeries,
  WORLD_ENTITY_CODE,
  iso2ForEntityCode,
} from '@eco-metrics/shared';

import { ProviderDataError } from '../errors/provider-error';

/** One measure of a dataset: its raw series and how a raw value becomes a served one. */
export interface MeasureInput {
  /** One series per entity. */
  series: MetricSeries[];
  /** Unit conversion and rounding, applied to every present value. */
  convert: (value: number) => number;
}

export interface BuildYearAlignedEntitiesInput<K extends string> {
  /** Names the dataset in error messages (e.g. `CO2 emissions`). */
  label: string;
  /** First year of every array. */
  startYear: number;
  /** Entity codes allowed in the result (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
  /** Measures by key; the first one that has an entity provides its display name. */
  measures: Record<K, MeasureInput>;
}

/** An entity with one year-aligned array per measure key. */
export type YearAlignedEntity<K extends string> = CountryEntity & Record<K, (number | null)[]>;

export interface YearAlignedEntities<K extends string> {
  /** Latest year with at least one value in any measure. */
  endYear: number;
  /** World first, then countries ordered by name. */
  entities: YearAlignedEntity<K>[];
}

/** Rounds to `decimals` places; never returns `-0`. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

/** The latest of several ISO 8601 timestamps, returned as given. */
export function latestTimestamp(first: string, ...rest: string[]): string {
  return rest.reduce(
    (latest, candidate) => (Date.parse(latest) >= Date.parse(candidate) ? latest : candidate),
    first,
  );
}

/** Keeps only the allowed entities, indexed by code. */
function indexAllowed(
  series: MetricSeries[],
  allowedCodes: ReadonlySet<string>,
): Map<string, MetricSeries> {
  const byCode = new Map<string, MetricSeries>();
  for (const entry of series) {
    if (allowedCodes.has(entry.entityCode)) {
      byCode.set(entry.entityCode, entry);
    }
  }
  return byCode;
}

/**
 * Aligns one series to `length` years from `startYear`: index `i` is the year
 * `startYear + i`, `null` where the series has no value or the year is out of
 * range. Shared by the entity builder and by payload blocks that are not entity
 * lists.
 */
export function alignSeriesToYears(
  series: MetricSeries | undefined,
  startYear: number,
  length: number,
  convert: (value: number) => number,
): (number | null)[] {
  const values: (number | null)[] = new Array<number | null>(length).fill(null);
  for (const { year, value } of series?.points ?? []) {
    const index = year - startYear;
    if (value !== null && index >= 0 && index < length) {
      values[index] = convert(value);
    }
  }
  return values;
}

/**
 * Pure assembly of year-aligned entities from per-measure provider series:
 * filters to the allowlist, merges the measures by entity code, aligns each
 * into a year-indexed array and converts the values. Knows no category: units,
 * rounding and measure names belong to the caller. Throws
 * {@link ProviderDataError} when the provider answered with nothing usable.
 */
export function buildYearAlignedEntities<K extends string>(
  input: BuildYearAlignedEntitiesInput<K>,
): YearAlignedEntities<K> {
  const { label, startYear, allowedCodes, measures } = input;
  const keys = Object.keys(measures) as K[];
  const indexed = new Map<K, Map<string, MetricSeries>>(
    keys.map((key) => [key, indexAllowed(measures[key].series, allowedCodes)]),
  );

  let endYear: number | undefined;
  for (const byCode of indexed.values()) {
    for (const series of byCode.values()) {
      for (const { year, value } of series.points) {
        if (value !== null && year >= startYear) {
          endYear = endYear === undefined ? year : Math.max(endYear, year);
        }
      }
    }
  }
  if (endYear === undefined) {
    throw new ProviderDataError(`${label} response has no value in any year`);
  }
  const length = endYear - startYear + 1;

  const codes = new Set<string>();
  for (const byCode of indexed.values()) {
    for (const code of byCode.keys()) {
      codes.add(code);
    }
  }

  const entities: YearAlignedEntity<K>[] = [];
  for (const code of codes) {
    const arrays = {} as Record<K, (number | null)[]>;
    let name: string | undefined;
    for (const key of keys) {
      const series = indexed.get(key)?.get(code);
      name ??= series?.entityName;
      arrays[key] = alignSeriesToYears(series, startYear, length, measures[key].convert);
    }

    if (keys.every((key) => arrays[key].every((value) => value === null))) {
      continue;
    }

    entities.push({ code, iso2: iso2ForEntityCode(code), name: name ?? code, ...arrays });
  }

  if (!entities.some(({ code }) => code === WORLD_ENTITY_CODE)) {
    throw new ProviderDataError(`${label} response has no World entity`);
  }

  entities.sort((a, b) => {
    if (a.code === WORLD_ENTITY_CODE || b.code === WORLD_ENTITY_CODE) {
      return a.code === WORLD_ENTITY_CODE ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'en') || a.code.localeCompare(b.code, 'en');
  });

  return { endYear, entities };
}
