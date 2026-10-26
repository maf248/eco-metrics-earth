/**
 * One entity (a country or the world) of a year-aligned dataset. Measure
 * arrays are added by each category: index `i` of every array is the year
 * `startYear + i` of the payload that carries the entity, and a missing
 * observation is `null`, so the arrays never shift.
 */
export interface CountryEntity {
  /**
   * ISO 3166-1 alpha-3 (e.g. `ARG`), or the OWID codes `OWID_WRL` (World)
   * and `OWID_KOS` (Kosovo).
   */
  code: string;
  /**
   * ISO 3166-1 alpha-2 used to pick a flag (`AR`; `XK` for Kosovo).
   * `null` for World, which has no flag.
   */
  iso2: string | null;
  name: string;
}

/** Dataset a payload comes from, taken from the provider's indicator metadata. */
export interface DatasetIdentity {
  name: string;
  version: string;
}
