import 'server-only';

import { fetchProviderPayloadFromBff, type ProviderPayloadResult } from '@/lib/bffFetch';
import {
  hasStrings,
  isBaseline,
  isCreditedOrigin,
  isIsoDate,
  isIsoDateArray,
  isNumberOrNullArray,
} from '@/lib/payloadGuards';
import type {
  ApiResponseMeta,
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

export interface OceanPayload<T> {
  data: T;
  meta: ApiResponseMeta;
}

/** The daily series has one slot per calendar day of a leap year. */
const DAILY_SLOTS = 366;

type Fields = Record<string, unknown>;

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/** True for a numeric, non-inverted year range; the aligned arrays are as long as it is. */
function yearLength(value: Fields): number | undefined {
  const { startYear, endYear } = value;
  if (typeof startYear !== 'number' || typeof endYear !== 'number' || endYear < startYear) {
    return undefined;
  }
  return endYear - startYear + 1;
}

function isDailyPoint(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const { date, sst, climatology, anomaly, status } = value;
  return (
    isIsoDate(date) &&
    typeof sst === 'number' &&
    typeof climatology === 'number' &&
    typeof anomaly === 'number' &&
    (status === 'preliminary' || status === 'final')
  );
}

/** The daily series: 366-slot years and climatology, the latest and record days, 90-day table. */
function isOceanSstDailyData(data: unknown): data is OceanSstDailyData {
  if (!isRecord(data) || yearLength(data) === undefined) {
    return false;
  }
  const { unit, coverage, baseline, years, climatology, latest, record, recent, origin } = data;
  return (
    typeof unit === 'string' &&
    typeof coverage === 'string' &&
    isBaseline(baseline) &&
    isNonEmptyArray(years) &&
    years.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.year === 'number' &&
        isNumberOrNullArray(entry.values, DAILY_SLOTS),
    ) &&
    isNumberOrNullArray(climatology, DAILY_SLOTS) &&
    isDailyPoint(latest) &&
    isDailyPoint(record) &&
    isNonEmptyArray(recent) &&
    recent.every(isDailyPoint) &&
    isCreditedOrigin(origin)
  );
}

/** The annual anomaly: a non-empty list of regions, each aligned to the year range. */
function isOceanSstAnomalyData(data: unknown): data is OceanSstAnomalyData {
  if (!isRecord(data)) {
    return false;
  }
  const length = yearLength(data);
  const { unit, baseline, dataset, origin, regions } = data;
  return (
    length !== undefined &&
    typeof unit === 'string' &&
    isBaseline(baseline) &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin) &&
    isNonEmptyArray(regions) &&
    regions.every(
      (region) =>
        isRecord(region) &&
        hasStrings(region, ['code', 'name']) &&
        isNumberOrNullArray(region.mean, length) &&
        isNumberOrNullArray(region.lower, length) &&
        isNumberOrNullArray(region.upper, length),
    )
  );
}

/** Heat content: every depth has at least one source, each aligned to the shared year range. */
function isOceanHeatContentData(data: unknown): data is OceanHeatContentData {
  if (!isRecord(data)) {
    return false;
  }
  const length = yearLength(data);
  const { unit, depths, origins } = data;
  return (
    length !== undefined &&
    typeof unit === 'string' &&
    isNonEmptyArray(depths) &&
    depths.every(
      (depth) =>
        isRecord(depth) &&
        hasStrings(depth, ['id', 'label']) &&
        hasStrings(depth.dataset, ['name', 'version']) &&
        isNonEmptyArray(depth.sources) &&
        depth.sources.every(
          (source) =>
            isRecord(source) &&
            hasStrings(source, ['id', 'name']) &&
            isNumberOrNullArray(source.values, length),
        ),
    ) &&
    isNonEmptyArray(origins) &&
    origins.every(isCreditedOrigin)
  );
}

/** The yearly means: one year-aligned entry per mission. */
function isAnnualSeaLevel(value: unknown, missionCount: number): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const length = yearLength(value);
  const { missions } = value;
  return (
    length !== undefined &&
    Array.isArray(missions) &&
    missions.length === missionCount &&
    missions.every(
      (mission) =>
        isRecord(mission) &&
        hasStrings(mission, ['id', 'name']) &&
        isNumberOrNullArray(mission.values, length),
    )
  );
}

/** Sea level: at least one mission, each with date-aligned, non-null values, and their yearly means. */
function isOceanSeaLevelData(data: unknown): data is OceanSeaLevelData {
  if (!isRecord(data)) {
    return false;
  }
  const { unit, startDate, endDate, trend, missions, annual, origin } = data;
  return (
    typeof unit === 'string' &&
    isIsoDate(startDate) &&
    isIsoDate(endDate) &&
    isRecord(trend) &&
    typeof trend.value === 'number' &&
    hasStrings(trend, ['unit', 'note']) &&
    isNonEmptyArray(missions) &&
    missions.every(
      (mission) =>
        isRecord(mission) &&
        hasStrings(mission, ['id', 'name']) &&
        isIsoDateArray(mission.dates) &&
        mission.dates.length > 0 &&
        Array.isArray(mission.values) &&
        mission.values.length === mission.dates.length &&
        mission.values.every((value) => typeof value === 'number'),
    ) &&
    isAnnualSeaLevel(annual, missions.length) &&
    isCreditedOrigin(origin)
  );
}

/** pH: the monthly and rolling values are aligned to the dates. */
function isOceanPhData(data: unknown): data is OceanPhData {
  if (!isRecord(data)) {
    return false;
  }
  const { unit, station, dates, monthly, yearlyAverage, dataset, origin } = data;
  return (
    typeof unit === 'string' &&
    typeof station === 'string' &&
    isIsoDateArray(dates) &&
    dates.length > 0 &&
    isNumberOrNullArray(monthly, dates.length) &&
    isNumberOrNullArray(yearlyAverage, dates.length) &&
    hasStrings(dataset, ['name', 'version']) &&
    isCreditedOrigin(origin)
  );
}

/** Daily sea surface temperature (Copernicus Climate Pulse). */
export async function getOceanSst(): Promise<
  ProviderPayloadResult<OceanPayload<OceanSstDailyData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/ocean-health/sea-surface-temperature',
    label: 'Ocean daily sea surface temperature data',
    isData: isOceanSstDailyData,
  });
}

/** Annual sea surface temperature anomaly (HadSST through Our World in Data). */
export async function getOceanSstAnomaly(): Promise<
  ProviderPayloadResult<OceanPayload<OceanSstAnomalyData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/ocean-health/sea-surface-anomaly',
    label: 'Ocean sea surface temperature anomaly data',
    isData: isOceanSstAnomalyData,
  });
}

/** Ocean heat content at both depths (Our World in Data). */
export async function getOceanHeatContent(): Promise<
  ProviderPayloadResult<OceanPayload<OceanHeatContentData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/ocean-health/ocean-heat-content',
    label: 'Ocean heat content data',
    isData: isOceanHeatContentData,
  });
}

/** Global mean sea level per satellite mission (NOAA Laboratory for Satellite Altimetry). */
export async function getOceanSeaLevel(): Promise<
  ProviderPayloadResult<OceanPayload<OceanSeaLevelData>>
> {
  return fetchProviderPayloadFromBff({
    path: '/ocean-health/sea-level',
    label: 'Ocean sea level data',
    isData: isOceanSeaLevelData,
  });
}

/** Ocean pH at Hawaii (Our World in Data). */
export async function getOceanPh(): Promise<ProviderPayloadResult<OceanPayload<OceanPhData>>> {
  return fetchProviderPayloadFromBff({
    path: '/ocean-health/ocean-ph',
    label: 'Ocean pH data',
    isData: isOceanPhData,
  });
}
