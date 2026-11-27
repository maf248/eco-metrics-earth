import { Injectable } from '@nestjs/common';

import {
  MetricSeries,
  TREE_COVER_LOSS_DRIVER_IDS,
  TreeCoverLossData,
  TreeCoverLossDriverId,
  WORLD_ENTITY_CODE,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import { buildYearAlignedEntities, roundTo } from '../../common/series/build-year-aligned-entities';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  DEFORESTATION_CATEGORY,
  DEFORESTATION_CHART_TAB,
  GFW_DRIVERS_ORIGIN,
  MIN_WORLD_YEARS,
  TREE_COVER_LOSS_CHART,
  TREE_COVER_LOSS_COLUMNS,
  TREE_COVER_LOSS_DECIMALS,
  TREE_COVER_LOSS_DRIVERS,
  TREE_COVER_LOSS_SNAPSHOT_KEY,
  TREE_COVER_LOSS_START_YEAR,
  TREE_COVER_LOSS_UNIT,
} from './deforestation.constants';

export interface BuildTreeCoverLossInput {
  /** Raw provider series by driver: one series per entity, hectares. */
  drivers: Record<TreeCoverLossDriverId, MetricSeries[]>;
  /** Metadata of the indicator that names the dataset and carries the timestamp. */
  metadata: OwidIndicatorMetadata;
  /** Entity codes allowed in the response (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
}

export interface TreeCoverLossResult {
  data: TreeCoverLossData;
  /** The provider's own timestamp (`updatedAt` of the metadata indicator). */
  lastUpdated: string;
}

const LABEL = 'Tree cover loss';

/**
 * Pure assembly of the endpoint payload: one year-aligned array per driver on the generic
 * builder, whole hectares, the drivers listed in stacking order. A blank cell stays `null`
 * (no value), never zero. There is no total and no regrouping: the web derives what it shows.
 * Throws `ProviderDataError` when the unit is not hectares or the provider answered with
 * nothing usable (no World, no value, a single World year).
 */
export function buildTreeCoverLossData(input: BuildTreeCoverLossInput): TreeCoverLossResult {
  const { metadata } = input;
  if (metadata.unit !== TREE_COVER_LOSS_UNIT) {
    throw new ProviderDataError(
      `${LABEL} indicator ${metadata.id} has unit "${metadata.unit}", expected "${TREE_COVER_LOSS_UNIT}"`,
    );
  }

  const { endYear, entities } = buildYearAlignedEntities({
    label: LABEL,
    startYear: TREE_COVER_LOSS_START_YEAR,
    allowedCodes: input.allowedCodes,
    measures: Object.fromEntries(
      TREE_COVER_LOSS_DRIVER_IDS.map((id) => [
        id,
        {
          series: input.drivers[id],
          convert: (value: number) => roundTo(value, TREE_COVER_LOSS_DECIMALS),
        },
      ]),
    ) as Record<
      TreeCoverLossDriverId,
      { series: MetricSeries[]; convert: (value: number) => number }
    >,
  });

  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  const worldYears = TREE_COVER_LOSS_DRIVER_IDS.reduce(
    (years, id) => Math.max(years, world?.[id].filter((value) => value !== null).length ?? 0),
    0,
  );
  if (worldYears < MIN_WORLD_YEARS) {
    throw new ProviderDataError(
      `${LABEL} response has fewer than ${MIN_WORLD_YEARS} years of values for World`,
    );
  }

  return {
    data: {
      startYear: TREE_COVER_LOSS_START_YEAR,
      endYear,
      unit: TREE_COVER_LOSS_UNIT,
      dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
      origin: GFW_DRIVERS_ORIGIN,
      drivers: TREE_COVER_LOSS_DRIVERS.map(({ id, name }) => ({ id, name })),
      entities,
    },
    lastUpdated: metadata.updatedAt,
  };
}

@Injectable()
export class TreeCoverLossService {
  private readonly allowedCodes = listCountryEntityCodes();
  private readonly allowedCodeSet: ReadonlySet<string> = new Set(this.allowedCodes);

  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(DEFORESTATION_CATEGORY, [GFW_DRIVERS_ORIGIN]);
  }

  /**
   * Tree cover loss by dominant driver, 2001 to the latest year, of every country plus World.
   * A provider failure serves the stored last good payload (`stale: true`) when there is one;
   * without it the error propagates and becomes 502 in the global filter.
   */
  getTreeCoverLoss(): Promise<Snapshotted<TreeCoverLossResult>> {
    return this.snapshots.resolve(TREE_COVER_LOSS_SNAPSHOT_KEY, () => this.assemble());
  }

  /**
   * Fetches and assembles the payload. The seven driver columns share one cached download (the
   * client caches the table per chart, country list and range), so a cold start costs one CSV
   * request and one metadata request.
   */
  private async assemble(): Promise<TreeCoverLossResult> {
    const options = {
      tab: DEFORESTATION_CHART_TAB,
      country: this.allowedCodes,
      timeRange: { from: TREE_COVER_LOSS_START_YEAR, to: new Date().getUTCFullYear() },
    } as const;

    const [series, metadata] = await Promise.all([
      Promise.all(
        TREE_COVER_LOSS_DRIVER_IDS.map((id) =>
          this.owid.getGrapherSeries(TREE_COVER_LOSS_CHART.slug, {
            ...options,
            column: TREE_COVER_LOSS_COLUMNS[id],
          }),
        ),
      ),
      this.owid.getIndicatorMetadata(TREE_COVER_LOSS_CHART.metadataIndicatorId),
    ]);

    const result = buildTreeCoverLossData({
      drivers: Object.fromEntries(
        TREE_COVER_LOSS_DRIVER_IDS.map((id, index) => [id, series[index]]),
      ) as Record<TreeCoverLossDriverId, MetricSeries[]>,
      metadata,
      allowedCodes: this.allowedCodeSet,
    });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
