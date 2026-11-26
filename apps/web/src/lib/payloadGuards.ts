import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { CountryEntity, DataSourceOrigin } from '@eco-metrics/shared';

/** Shape shared by every year-aligned country payload. Measure arrays are checked, not typed. */
export interface YearAlignedCountryData {
  startYear: number;
  endYear: number;
  entities: CountryEntity[];
}

/** True for an array of exactly `length` numbers or `null`s. */
export function isNumberOrNullArray(value: unknown, length: number): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => item === null || typeof item === 'number')
  );
}

/** True for an object whose given keys are all strings. */
export function hasStrings(value: unknown, keys: string[]): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    keys.every((key) => typeof (value as Record<string, unknown>)[key] === 'string')
  );
}

/**
 * Accepts only a payload the page can render without guarding every access: a
 * numeric, non-inverted year range and a non-empty entity list that includes
 * World, where every entity has string `code` and `name`, an `iso2` that is a
 * string or `null`, and one number-or-null array of the year range's length for
 * each of the given measure keys. Category payloads add their own fields on top.
 */
export function isYearAlignedCountryData(
  data: unknown,
  measureKeys: readonly string[],
): data is YearAlignedCountryData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { startYear, endYear, entities } = data as Record<string, unknown>;
  if (
    typeof startYear !== 'number' ||
    typeof endYear !== 'number' ||
    endYear < startYear ||
    !Array.isArray(entities) ||
    entities.length === 0
  ) {
    return false;
  }

  const length = endYear - startYear + 1;
  const wellFormed = entities.every((entity: unknown) => {
    if (typeof entity !== 'object' || entity === null || !hasStrings(entity, ['code', 'name'])) {
      return false;
    }
    const { iso2 } = entity as Record<string, unknown>;
    return (
      (typeof iso2 === 'string' || iso2 === null) &&
      measureKeys.every((key) =>
        isNumberOrNullArray((entity as Record<string, unknown>)[key], length),
      )
    );
  });

  return (
    wellFormed && entities.some((entity: { code: string }) => entity.code === WORLD_ENTITY_CODE)
  );
}

const OPTIONAL_ORIGIN_TEXTS = ['notice', 'citation', 'disclaimer'] as const;

/** True for a `DataSourceOrigin`: producer, title, url, a license with name and url, optional texts. */
export function isDataSourceOrigin(value: unknown): value is DataSourceOrigin {
  if (!hasStrings(value, ['producer', 'title', 'url'])) {
    return false;
  }
  const { license, ...rest } = value as Record<string, unknown>;
  return (
    hasStrings(license, ['name', 'url']) &&
    OPTIONAL_ORIGIN_TEXTS.every((key) => rest[key] === undefined || typeof rest[key] === 'string')
  );
}

/**
 * A `DataSourceOrigin` whose license asks for a notice wherever the data is shown, so the notice
 * is required (the API serves it, the page prints it).
 */
export function isCreditedOrigin(value: unknown): value is DataSourceOrigin {
  return isDataSourceOrigin(value) && typeof value.notice === 'string';
}

/** True for a reference period with numeric, non-inverted years. */
export function isBaseline(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { startYear, endYear } = value as Record<string, unknown>;
  return typeof startYear === 'number' && typeof endYear === 'number' && startYear <= endYear;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for an ISO 8601 calendar date (`YYYY-MM-DD`) that exists. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false;
  }
  const time = new Date(`${value}T00:00:00Z`).getTime();
  // `2025-02-31` parses to 3 March: only a date that survives the round trip exists.
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

/** True for an array whose items are all ISO calendar dates. */
export function isIsoDateArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isIsoDate);
}
