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
