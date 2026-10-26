import type { CountryEntity, DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/**
 * Annual temperature anomaly of one entity (a country or the world),
 * year-aligned: index `i` of `anomaly` is the year
 * `GlobalTemperatureData.startYear + i`. Missing observations are `null`.
 *
 * Country values cover land inside the borders only; the World value covers
 * land and ocean, so a country and the world are not directly comparable.
 */
export interface GlobalTemperatureEntity extends CountryEntity {
  /**
   * Degrees Celsius relative to the average of `GlobalTemperatureData.baseline`
   * for the same place, rounded to 2 decimals. Negative values are normal.
   */
  anomaly: (number | null)[];
}

/**
 * The World's temperature since 1850 relative to the pre-industrial baseline,
 * year-aligned: index `i` of every array is the year `startYear + i`. Values are
 * degrees Celsius, rounded to 2 decimals; missing observations are `null`.
 */
export interface GlobalTemperatureGlobal {
  /** First year of every array (1850). */
  startYear: number;
  /** Latest year with a value. */
  endYear: number;
  /** Pre-industrial reference period (1861-1890). */
  baseline: { startYear: number; endYear: number };
  mean: (number | null)[];
  /** Lower 95% confidence bound of `mean`. */
  lower: (number | null)[];
  /** Upper 95% confidence bound of `mean`. */
  upper: (number | null)[];
  /** OWID dataset the series comes from. */
  dataset: DatasetIdentity;
  /** The Met Office Hadley Centre (HadCRUT5), which produced the series. */
  origin: DataSourceOrigin;
}

/** Payload of `GET /api/v1/global-temperature`: every country plus World in one response. */
export interface GlobalTemperatureData {
  /** First year of every entity array (1940). */
  startYear: number;
  /** Latest year with at least one value. */
  endYear: number;
  /** Display unit of the anomaly (degrees Celsius). */
  unit: string;
  /** Reference period the anomalies are relative to (1991-2020). */
  baseline: { startYear: number; endYear: number };
  /** OWID dataset the values come from, taken from the indicator metadata. */
  dataset: DatasetIdentity;
  /** Copernicus C3S (ERA5), which produced the per-country series. */
  origin: DataSourceOrigin;
  /** World first, then countries ordered by name. */
  entities: GlobalTemperatureEntity[];
  /** World-only series since 1850 against the pre-industrial baseline. */
  global: GlobalTemperatureGlobal;
}
