import type { DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/** Whether a daily sea surface temperature value may still change slightly. */
export type OceanSstStatus = 'preliminary' | 'final';

/** One day of the daily sea surface temperature series. */
export interface OceanSstDailyPoint {
  /** ISO 8601 calendar date (`YYYY-MM-DD`, UTC). */
  date: string;
  /** Daily mean sea surface temperature in degrees Celsius, at the source's 3 decimals. */
  sst: number;
  /** 1991-2020 average of the same calendar day, degrees Celsius. */
  climatology: number;
  /** `sst` minus `climatology`, degrees Celsius. Negative values are normal. */
  anomaly: number;
  status: OceanSstStatus;
}

/**
 * Payload of `GET /api/v1/ocean-health/sea-surface-temperature`: the daily
 * sea surface temperature (ocean only, 60°S-60°N), reduced to a
 * calendar-day-aligned shape.
 */
export interface OceanSstDailyData {
  /** Display unit (degrees Celsius). */
  unit: string;
  /** Latitude band the mean covers (`60°S–60°N`, ocean only). */
  coverage: string;
  /** Reference period of `climatology` and of every anomaly (1991-2020). */
  baseline: { startYear: number; endYear: number };
  /** First year of the series. */
  startYear: number;
  /** Year of the latest row (never taken from the clock). */
  endYear: number;
  /**
   * One entry per year, ascending. `values` always has 366 slots: the index is
   * the day of the year in a leap year, so 1 March is the same slot in every
   * year and the 29 February slot is `null` in common years. `null` also marks
   * days with no observation (days after the latest row of the last year).
   */
  years: { year: number; values: (number | null)[] }[];
  /** 1991-2020 daily climatology, same 366-slot indexing as `years[].values`. */
  climatology: (number | null)[];
  latest: OceanSstDailyPoint;
  /** Day with the highest absolute `sst` of the series; a tie names the most recent date. */
  record: OceanSstDailyPoint;
  /** The last 90 calendar days of data, ascending, the last one being `latest`. */
  recent: OceanSstDailyPoint[];
  /** Copernicus Climate Change Service / ECMWF, which produced the series. */
  origin: DataSourceOrigin;
}

/**
 * Annual sea surface temperature anomaly of one region, year-aligned: index
 * `i` of every array is the year `OceanSstAnomalyData.startYear + i`. Values
 * are degrees Celsius relative to the 1861-1890 average, rounded to 2
 * decimals; `null` means no observation.
 */
export interface OceanSstAnomalyRegion {
  /** OWID entity code (`OWID_WRL`, `OWID_NH`, `OWID_SH`). */
  code: string;
  name: string;
  mean: (number | null)[];
  /** Lower bound of the 95% uncertainty interval of `mean`. */
  lower: (number | null)[];
  /** Upper bound of the 95% uncertainty interval of `mean`. */
  upper: (number | null)[];
}

/** Payload of `GET /api/v1/ocean-health/sea-surface-anomaly`. */
export interface OceanSstAnomalyData {
  /** First year of every region array. */
  startYear: number;
  /** Latest year served (the current, partial year is never served). */
  endYear: number;
  /** Display unit (degrees Celsius). */
  unit: string;
  /** Reference period of the anomalies (1861-1890). */
  baseline: { startYear: number; endYear: number };
  /** OWID dataset the values come from, taken from the indicator metadata. */
  dataset: DatasetIdentity;
  /** Met Office Hadley Centre (HadSST), which produced the series. */
  origin: DataSourceOrigin;
  /** World, Northern Hemisphere, Southern Hemisphere, in that order. */
  regions: OceanSstAnomalyRegion[];
}

/** One institution's estimate of ocean heat content, year-aligned. */
export interface OceanHeatSource {
  /** Stable id taken from the column short name (`iap`, `noaa`, `mri`, `csiro`). */
  id: string;
  name: string;
  /**
   * Heat content in the payload's unit, year-aligned to
   * `OceanHeatContentData.startYear`. Each source uses its own reference
   * period; `null` means the source has no value (never zero).
   */
  values: (number | null)[];
}

/** Ocean heat content down to one depth, with every source that measures it. */
export interface OceanHeatDepth {
  id: '700m' | '2000m';
  label: string;
  dataset: DatasetIdentity;
  sources: OceanHeatSource[];
}

/** Payload of `GET /api/v1/ocean-health/ocean-heat-content` (World only). */
export interface OceanHeatContentData {
  /** First year of every source array (shared by both depths). */
  startYear: number;
  /** Latest year with a value in any source. */
  endYear: number;
  /** Display unit (`10²² J`, ten thousand billion billion joules). */
  unit: string;
  depths: OceanHeatDepth[];
  /** Producers of the series (NOAA NCEI, US EPA), with the credit their licenses ask for. */
  origins: DataSourceOrigin[];
}

/** Global mean sea level observations of one satellite altimetry mission. */
export interface OceanSeaLevelMission {
  /** Slug of the mission name. */
  id: string;
  name: string;
  /** ISO 8601 UTC calendar dates (`YYYY-MM-DD`), ascending, derived from the source's decimal years. */
  dates: string[];
  /** Millimetres, aligned to `dates`; the mission has no `null` observations. */
  values: number[];
}

/** Payload of `GET /api/v1/ocean-health/sea-level`. */
export interface OceanSeaLevelData {
  /** Display unit (millimetres, relative to the file's own reference). */
  unit: string;
  /** First observation date (`YYYY-MM-DD`, derived from the data). */
  startDate: string;
  /** Latest observation date (`YYYY-MM-DD`, derived from the data). */
  endDate: string;
  /** Long-term trend published in the file header, e.g. 3.11 mm/year. */
  trend: { value: number; unit: string; note: string };
  /** Only missions with at least one value, in file order. */
  missions: OceanSeaLevelMission[];
  /**
   * Yearly mean of every mission, for the data table: index `i` of every
   * `values` array is the year `startYear + i`. Each value is the mean of the
   * mission's observations in that calendar year (a year it only partly
   * covered averages what it has), in millimetres, rounded to 2 decimals;
   * `null` means the mission made no observation that year. Same missions,
   * same order as `missions`.
   */
  annual: {
    startYear: number;
    endYear: number;
    missions: { id: string; name: string; values: (number | null)[] }[];
  };
  /** NOAA Laboratory for Satellite Altimetry, with the acknowledgment it asks for. */
  origin: DataSourceOrigin;
}

/** Payload of `GET /api/v1/ocean-health/ocean-ph`. */
export interface OceanPhData {
  /** Display unit (`pH`). */
  unit: string;
  /** Measurement station (`Hawaii`). */
  station: string;
  /** ISO 8601 dates, ascending; `monthly` and `yearlyAverage` are aligned to them. */
  dates: string[];
  /** Monthly pH; `null` means no observation. */
  monthly: (number | null)[];
  /** Rolling yearly average of pH; `null` where it is not defined. */
  yearlyAverage: (number | null)[];
  /** OWID dataset the values come from, taken from the indicator metadata. */
  dataset: DatasetIdentity;
  /** Hawaii Ocean Time-series (SOEST, University of Hawaii), which produced the series. */
  origin: DataSourceOrigin;
}
