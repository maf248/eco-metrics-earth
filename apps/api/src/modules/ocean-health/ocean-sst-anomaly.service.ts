import { Injectable } from '@nestjs/common';

import type { MetricSeries, OceanSstAnomalyData, OceanSstAnomalyRegion } from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import { assertBaselineMatches } from '../../common/series/baseline';
import {
  alignSeriesToYears,
  roundTo,
  valueYearRange,
} from '../../common/series/build-year-aligned-entities';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidGrapherSeriesOptions, OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  HADSST_ORIGIN,
  OCEAN_HEALTH_CATEGORY,
  OCEAN_HEALTH_SNAPSHOT_KEYS,
  OCEAN_SST_ANOMALY_BASELINE,
  OCEAN_SST_ANOMALY_CHART,
  OCEAN_SST_ANOMALY_DECIMALS,
  OCEAN_SST_ANOMALY_REGIONS,
  OCEAN_SST_ANOMALY_UNIT,
} from './ocean-health.constants';

export interface BuildOceanSstAnomalyInput {
  /** One series per entity for each of the three chart columns. */
  mean: MetricSeries[];
  lower: MetricSeries[];
  upper: MetricSeries[];
  /** Metadata of the mean's indicator: dataset identity, timestamp and baseline text. */
  metadata: OwidIndicatorMetadata;
  /** Last year that may be served: the previous calendar year (the current one is partial). */
  maxYear: number;
}

export interface OceanSstAnomalyResult {
  data: OceanSstAnomalyData;
  /** The indicator's own `updatedAt`. */
  lastUpdated: string;
}

const LABEL = 'Ocean sea surface temperature anomaly';
const MIN_WORLD_YEARS = 2;

function seriesOf(series: MetricSeries[], code: string, maxYear: number): MetricSeries | undefined {
  const found = series.find(({ entityCode }) => entityCode === code);
  return found && { ...found, points: found.points.filter(({ year }) => year <= maxYear) };
}

/**
 * Pure assembly of the annual anomaly of World and both hemispheres: verifies
 * the 1861-1890 baseline against the provider's description, drops the partial
 * current year, aligns the mean and its 95% bounds on shared years and rounds.
 * Throws `ProviderDataError` when the provider answered with nothing usable,
 * including a World series too short to be a chart (what a response that
 * ignored the chart tab looks like).
 */
export function buildOceanSstAnomalyData(input: BuildOceanSstAnomalyInput): OceanSstAnomalyResult {
  const { metadata, maxYear } = input;
  assertBaselineMatches(metadata.descriptionShort, OCEAN_SST_ANOMALY_BASELINE, LABEL);

  const perRegion = OCEAN_SST_ANOMALY_REGIONS.map(({ code, name }) => {
    const mean = seriesOf(input.mean, code, maxYear);
    if (!mean) {
      throw new ProviderDataError(`${LABEL} response has no ${name} entity`);
    }
    return {
      code,
      name,
      mean,
      lower: seriesOf(input.lower, code, maxYear),
      upper: seriesOf(input.upper, code, maxYear),
    };
  });

  const range = valueYearRange(
    perRegion.flatMap(({ mean, lower, upper }) =>
      [mean, lower, upper].map((series) => series?.points ?? []),
    ),
  );
  if (range === undefined) {
    throw new ProviderDataError(`${LABEL} response has no value in any year`);
  }

  const { startYear, endYear } = range;
  const length = endYear - startYear + 1;
  const round = (value: number): number => roundTo(value, OCEAN_SST_ANOMALY_DECIMALS);
  const align = (series: MetricSeries | undefined): (number | null)[] =>
    alignSeriesToYears(series, startYear, length, round);

  const regions: OceanSstAnomalyRegion[] = perRegion.map(({ code, name, mean, lower, upper }) => ({
    code,
    name,
    mean: align(mean),
    lower: align(lower),
    upper: align(upper),
  }));

  if (regions[0].mean.filter((value) => value !== null).length < MIN_WORLD_YEARS) {
    throw new ProviderDataError(
      `${LABEL} response has fewer than ${MIN_WORLD_YEARS} years of values for World`,
    );
  }

  return {
    data: {
      startYear,
      endYear,
      unit: OCEAN_SST_ANOMALY_UNIT,
      baseline: { ...OCEAN_SST_ANOMALY_BASELINE },
      dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
      origin: HADSST_ORIGIN,
      regions,
    },
    lastUpdated: metadata.updatedAt,
  };
}

@Injectable()
export class OceanSstAnomalyService {
  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(OCEAN_HEALTH_CATEGORY, [HADSST_ORIGIN]);
  }

  /** Annual anomaly of World and both hemispheres, resolved through its own snapshot. */
  getSeaSurfaceAnomaly(): Promise<Snapshotted<OceanSstAnomalyResult>> {
    return this.snapshots.resolve(OCEAN_HEALTH_SNAPSHOT_KEYS.seaSurfaceAnomaly, () =>
      this.assemble(),
    );
  }

  private async assemble(): Promise<OceanSstAnomalyResult> {
    // Completed years only: the mean of a year in progress would look like an annual value.
    const maxYear = new Date().getUTCFullYear() - 1;
    // Without `tab: 'chart'` the default filtered request answers with World only.
    const options = (column: string): OwidGrapherSeriesOptions => ({
      column,
      tab: 'chart',
      country: OCEAN_SST_ANOMALY_REGIONS.map(({ code }) => code),
    });

    const [mean, lower, upper, metadata] = await Promise.all([
      this.owid.getGrapherSeries(
        OCEAN_SST_ANOMALY_CHART.slug,
        options(OCEAN_SST_ANOMALY_CHART.columns.mean),
      ),
      this.owid.getGrapherSeries(
        OCEAN_SST_ANOMALY_CHART.slug,
        options(OCEAN_SST_ANOMALY_CHART.columns.lower),
      ),
      this.owid.getGrapherSeries(
        OCEAN_SST_ANOMALY_CHART.slug,
        options(OCEAN_SST_ANOMALY_CHART.columns.upper),
      ),
      this.owid.getIndicatorMetadata(OCEAN_SST_ANOMALY_CHART.indicatorId),
    ]);

    const result = buildOceanSstAnomalyData({ mean, lower, upper, metadata, maxYear });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
