import { Injectable } from '@nestjs/common';

import {
  GlobalTemperatureData,
  GlobalTemperatureGlobal,
  MetricSeries,
  WORLD_ENTITY_CODE,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import {
  alignSeriesToYears,
  buildYearAlignedEntities,
  latestTimestamp,
  roundTo,
} from '../../common/series/build-year-aligned-entities';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidGrapherSeriesOptions, OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  ERA5_ORIGIN,
  GLOBAL_SERIES_BASELINE,
  GLOBAL_SERIES_CHART,
  GLOBAL_SERIES_START_YEAR,
  GLOBAL_TEMPERATURE_BASELINE,
  GLOBAL_TEMPERATURE_CATEGORY,
  GLOBAL_TEMPERATURE_DECIMALS,
  GLOBAL_TEMPERATURE_START_YEAR,
  GLOBAL_TEMPERATURE_UNIT,
  HADCRUT5_ORIGIN,
  TEMPERATURE_ANOMALY_CHART,
} from './global-temperature.constants';

/** The World's series against the pre-industrial baseline, as three chart columns. */
export interface GlobalSeriesInput {
  mean: MetricSeries[];
  lower: MetricSeries[];
  upper: MetricSeries[];
  /** Metadata of the mean's indicator: dataset identity, timestamp and baseline text. */
  metadata: OwidIndicatorMetadata;
}

export interface BuildGlobalTemperatureInput {
  /** Annual anomaly in degrees Celsius, one series per entity. */
  anomaly: MetricSeries[];
  metadata: OwidIndicatorMetadata;
  global: GlobalSeriesInput;
  /** Entity codes allowed in the per-country response (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
  /** Last year that may be served: the previous calendar year (the current one is partial). */
  maxYear: number;
}

export interface GlobalTemperatureResult {
  data: GlobalTemperatureData;
  /** Latest `updatedAt` of all indicators used: the provider's own timestamp. */
  lastUpdated: string;
}

const LABEL = 'Global temperature';
const MIN_WORLD_YEARS = 2;

// Anchored so `11991-2020` or `1991-20201` never match.
const dashed = (baseline: { startYear: number; endYear: number }): RegExp =>
  new RegExp(`(?<!\\d)${baseline.startYear}[-–]${baseline.endYear}(?!\\d)`);

/**
 * The baseline is prose in the provider's description, not a field of the data.
 * A different reference period must become a failure, never a mislabelled chart.
 */
function assertBaselineMatches(
  description: string | null,
  baseline: { startYear: number; endYear: number },
  what: string,
): void {
  const { startYear, endYear } = baseline;
  if (description === null) {
    throw new ProviderDataError(
      `${what} indicator has no short description to verify the ${startYear}-${endYear} baseline`,
    );
  }
  if (!dashed(baseline).test(description)) {
    throw new ProviderDataError(
      `${what} indicator description does not mention the expected ${startYear}-${endYear} baseline`,
    );
  }
}

/** The credit year is the year the dataset version starts with, as OWID prints it. */
function datasetYear(metadata: OwidIndicatorMetadata): string {
  const year = /^(\d{4})/.exec(metadata.datasetVersion)?.[1];
  if (year === undefined) {
    throw new ProviderDataError(
      `${LABEL} dataset version "${metadata.datasetVersion}" does not start with a year`,
    );
  }
  return year;
}

function worldSeries(series: MetricSeries[]): MetricSeries | undefined {
  return series.find(({ entityCode }) => entityCode === WORLD_ENTITY_CODE);
}

/** Only the years up to `maxYear`. */
function capSeries(series: MetricSeries, maxYear: number): MetricSeries {
  return { ...series, points: series.points.filter(({ year }) => year <= maxYear) };
}

/** Same as {@link capSeries} for a series that may be absent. */
function upTo(series: MetricSeries | undefined, maxYear: number): MetricSeries | undefined {
  return series && capSeries(series, maxYear);
}

/**
 * Pure assembly of the World's series since 1850: verifies the pre-industrial
 * baseline, keeps World only (hemispheres are ignored), caps at `maxYear` and
 * aligns the mean and its 95% bounds on the same years.
 */
export function buildGlobalSeries(
  input: GlobalSeriesInput,
  maxYear: number,
): GlobalTemperatureGlobal {
  const { metadata } = input;
  assertBaselineMatches(
    metadata.descriptionShort,
    GLOBAL_SERIES_BASELINE,
    `${LABEL} global series`,
  );

  const mean = upTo(worldSeries(input.mean), maxYear);
  if (!mean) {
    throw new ProviderDataError(`${LABEL} global series response has no World entity`);
  }
  const lower = upTo(worldSeries(input.lower), maxYear);
  const upper = upTo(worldSeries(input.upper), maxYear);

  let endYear: number | undefined;
  for (const series of [mean, lower, upper]) {
    for (const { year, value } of series?.points ?? []) {
      if (value !== null && year >= GLOBAL_SERIES_START_YEAR) {
        endYear = endYear === undefined ? year : Math.max(endYear, year);
      }
    }
  }
  if (endYear === undefined) {
    throw new ProviderDataError(`${LABEL} global series response has no value in any year`);
  }

  const length = endYear - GLOBAL_SERIES_START_YEAR + 1;
  const round = (value: number): number => roundTo(value, GLOBAL_TEMPERATURE_DECIMALS);
  const align = (series: MetricSeries | undefined): (number | null)[] =>
    alignSeriesToYears(series, GLOBAL_SERIES_START_YEAR, length, round);
  const alignedMean = align(mean);

  if (alignedMean.filter((value) => value !== null).length < MIN_WORLD_YEARS) {
    throw new ProviderDataError(
      `${LABEL} global series response has fewer than ${MIN_WORLD_YEARS} years of values`,
    );
  }

  return {
    startYear: GLOBAL_SERIES_START_YEAR,
    endYear,
    baseline: { ...GLOBAL_SERIES_BASELINE },
    mean: alignedMean,
    lower: align(lower),
    upper: align(upper),
    dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
    origin: HADCRUT5_ORIGIN,
  };
}

/**
 * Pure assembly of the endpoint payload: verifies both baselines against the
 * provider's descriptions, aligns the per-country series by year on the generic
 * builder, builds the global series and rounds. Throws `ProviderDataError` when
 * the provider answered with nothing usable, including a World series too short
 * to be a chart (what a response that ignored the chart tab looks like).
 */
export function buildGlobalTemperatureData(
  input: BuildGlobalTemperatureInput,
): GlobalTemperatureResult {
  const { metadata } = input;
  assertBaselineMatches(metadata.descriptionShort, GLOBAL_TEMPERATURE_BASELINE, LABEL);
  const year = datasetYear(metadata);

  const { endYear, entities } = buildYearAlignedEntities({
    label: LABEL,
    startYear: GLOBAL_TEMPERATURE_START_YEAR,
    allowedCodes: input.allowedCodes,
    measures: {
      anomaly: {
        // The provider may include the partial current year: never serve it as an annual value.
        series: input.anomaly.map((series) => capSeries(series, input.maxYear)),
        convert: (value) => roundTo(value, GLOBAL_TEMPERATURE_DECIMALS),
      },
    },
  });

  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  const worldYears = world?.anomaly.filter((value) => value !== null).length ?? 0;
  if (worldYears < MIN_WORLD_YEARS) {
    throw new ProviderDataError(
      `${LABEL} response has fewer than ${MIN_WORLD_YEARS} years of values for World`,
    );
  }

  const global = buildGlobalSeries(input.global, input.maxYear);

  return {
    data: {
      startYear: GLOBAL_TEMPERATURE_START_YEAR,
      endYear,
      unit: GLOBAL_TEMPERATURE_UNIT,
      baseline: { ...GLOBAL_TEMPERATURE_BASELINE },
      dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
      origin: {
        ...ERA5_ORIGIN,
        notice: `${ERA5_ORIGIN.notice} (${year})`,
      },
      entities,
      global,
    },
    lastUpdated: latestTimestamp(metadata.updatedAt, input.global.metadata.updatedAt),
  };
}

@Injectable()
export class GlobalTemperatureService {
  private readonly allowedCodes = listCountryEntityCodes();
  private readonly allowedCodeSet: ReadonlySet<string> = new Set(this.allowedCodes);

  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(GLOBAL_TEMPERATURE_CATEGORY, [
      ERA5_ORIGIN,
      HADCRUT5_ORIGIN,
    ]);
  }

  /**
   * Annual temperature anomaly of every country plus World, and the World's
   * series since 1850. A provider failure serves the stored last good payload
   * (`stale: true`) when there is one; without it the error propagates and
   * becomes 502 in the global filter. There is never a partial payload.
   */
  getGlobalTemperature(): Promise<Snapshotted<GlobalTemperatureResult>> {
    return this.snapshots.resolve(GLOBAL_TEMPERATURE_CATEGORY, () => this.assemble());
  }

  /**
   * Fetches and assembles the payload from the provider. The OWID client caches
   * every request (the three global columns share one download), so assembling
   * cached data takes milliseconds.
   */
  private async assemble(): Promise<GlobalTemperatureResult> {
    // Completed years only: the mean of a year in progress would look like an annual value.
    const maxYear = new Date().getUTCFullYear() - 1;
    // The charts open on their map tab, where OWID ignores `country` and answers with one year
    // per entity. Without `tab: 'chart'` the request "works" and silently yields a one-point chart.
    const globalOptions = (column: string): OwidGrapherSeriesOptions => ({
      column,
      tab: 'chart',
      country: [WORLD_ENTITY_CODE],
      timeRange: { from: GLOBAL_SERIES_START_YEAR, to: maxYear },
    });

    const [anomaly, metadata, mean, lower, upper, globalMetadata] = await Promise.all([
      this.owid.getGrapherSeries(TEMPERATURE_ANOMALY_CHART.slug, {
        column: TEMPERATURE_ANOMALY_CHART.column,
        tab: 'chart',
        country: this.allowedCodes,
        timeRange: { from: GLOBAL_TEMPERATURE_START_YEAR, to: maxYear },
      }),
      this.owid.getIndicatorMetadata(TEMPERATURE_ANOMALY_CHART.indicatorId),
      this.owid.getGrapherSeries(
        GLOBAL_SERIES_CHART.slug,
        globalOptions(GLOBAL_SERIES_CHART.columns.mean),
      ),
      this.owid.getGrapherSeries(
        GLOBAL_SERIES_CHART.slug,
        globalOptions(GLOBAL_SERIES_CHART.columns.lower),
      ),
      this.owid.getGrapherSeries(
        GLOBAL_SERIES_CHART.slug,
        globalOptions(GLOBAL_SERIES_CHART.columns.upper),
      ),
      this.owid.getIndicatorMetadata(GLOBAL_SERIES_CHART.indicatorId),
    ]);

    const result = buildGlobalTemperatureData({
      anomaly,
      metadata,
      global: { mean, lower, upper, metadata: globalMetadata },
      allowedCodes: this.allowedCodeSet,
      maxYear,
    });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
