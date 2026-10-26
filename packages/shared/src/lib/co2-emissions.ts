import type { CountryEntity, DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/** Which CO2 emissions measure a chart or table shows. */
export type Co2EmissionsMetric = 'total' | 'perCapita';

/**
 * Annual CO2 emissions of one entity (a country or the world), year-aligned:
 * index `i` of every array is the year `Co2EmissionsData.startYear + i`.
 * Missing observations are `null`, so the arrays never shift.
 */
export interface Co2EmissionsEntity extends CountryEntity {
  /** Million tonnes of CO2, rounded to 3 decimals. */
  total: (number | null)[];
  /** Tonnes of CO2 per person, rounded to 2 decimals. */
  perCapita: (number | null)[];
}

/** Payload of `GET /api/v1/co2-emissions`: every country plus World in one response. */
export interface Co2EmissionsData {
  /** First year of every entity array (1950). */
  startYear: number;
  /** Latest year with at least one value. */
  endYear: number;
  /** Display strings for the two measures (e.g. `Mt CO2`, `t CO2 per person`). */
  units: { total: string; perCapita: string };
  /** Dataset the values come from, taken from the provider's indicator metadata. */
  dataset: DatasetIdentity;
  /** The Global Carbon Project, which produced the data OWID republishes. */
  origin: DataSourceOrigin;
  /** World first, then countries ordered by name. */
  entities: Co2EmissionsEntity[];
}
