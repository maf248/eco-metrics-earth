import { Injectable } from '@nestjs/common';

import {
  ForestAreaData,
  MetricSeries,
  WORLD_ENTITY_CODE,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import {
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
import type { OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  DEFORESTATION_CATEGORY,
  DEFORESTATION_CHART_TAB,
  FAO_FRA_ORIGIN,
  FOREST_AREA_CHART,
  FOREST_AREA_DECIMALS,
  FOREST_AREA_METADATA_UNIT,
  FOREST_AREA_SNAPSHOT_KEY,
  FOREST_AREA_START_YEAR,
  FOREST_AREA_UNITS,
  FOREST_SHARE_CHART,
  FOREST_SHARE_DECIMALS,
  FOREST_SHARE_METADATA_UNIT,
  MIN_WORLD_YEARS,
  WORLD_LAND_AREA_TOLERANCE,
} from './deforestation.constants';

export interface BuildForestAreaInput {
  /** Raw provider forest area (hectares), one series per entity. */
  area: MetricSeries[];
  /** Raw provider forest area as a share of land area (%), one series per entity. */
  share: MetricSeries[];
  /** Metadata of the area indicator: names the dataset and carries a timestamp. */
  areaMetadata: OwidIndicatorMetadata;
  /** Metadata of the share indicator: carries a timestamp. */
  shareMetadata: OwidIndicatorMetadata;
  /** Entity codes allowed in the response (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
}

export interface ForestAreaResult {
  data: ForestAreaData;
  /** The provider's own timestamp: the latest `updatedAt` of the two indicators. */
  lastUpdated: string;
}

const LABEL = 'Forest area';

function requireUnit(metadata: OwidIndicatorMetadata, expected: string): void {
  if (metadata.unit !== expected) {
    throw new ProviderDataError(
      `${LABEL} indicator ${metadata.id} has unit "${metadata.unit}", expected "${expected}"`,
    );
  }
}

/**
 * The share chart is read as the FAO forest area over a fixed FAO land area, so the World's
 * implied land area (`area / (share / 100)`) must not move across the served years. A larger
 * spread means the chart was re-based: serving it would label another measure as the same one.
 */
function assertConsistentLandArea(
  area: readonly (number | null)[],
  share: readonly (number | null)[],
): void {
  const implied: number[] = [];
  area.forEach((hectares, index) => {
    const percent = share[index];
    if (hectares !== null && percent !== null && percent > 0) {
      implied.push(hectares / (percent / 100));
    }
  });
  if (implied.length === 0) {
    throw new ProviderDataError(`${LABEL} response cannot be checked: no year has both measures`);
  }
  const lowest = Math.min(...implied);
  const spread = (Math.max(...implied) - lowest) / lowest;
  if (spread > WORLD_LAND_AREA_TOLERANCE) {
    throw new ProviderDataError(
      `${LABEL} share is not on a constant land area: the World land area varies by ` +
        `${(spread * 100).toFixed(1)}% across the served years`,
    );
  }
}

/**
 * Pure assembly of the endpoint payload: checks the units of both indicators, aligns the area
 * and the share by year on the generic builder (World first, countries by name, OWID regions
 * and income groups out through the allowlist) and guards the share's land-area base. A blank
 * stays `null`, never zero. Throws `ProviderDataError` when the provider answered with nothing
 * usable (no World, no value, a single World year) or the share was re-based.
 */
export function buildForestAreaData(input: BuildForestAreaInput): ForestAreaResult {
  const { areaMetadata, shareMetadata } = input;
  requireUnit(areaMetadata, FOREST_AREA_METADATA_UNIT);
  requireUnit(shareMetadata, FOREST_SHARE_METADATA_UNIT);

  const { endYear, entities } = buildYearAlignedEntities({
    label: LABEL,
    startYear: FOREST_AREA_START_YEAR,
    allowedCodes: input.allowedCodes,
    measures: {
      area: {
        series: input.area,
        convert: (value: number) => roundTo(value, FOREST_AREA_DECIMALS),
      },
      share: {
        series: input.share,
        convert: (value: number) => roundTo(value, FOREST_SHARE_DECIMALS),
      },
    },
  });

  // The generic builder guarantees World is present, and sorts it first.
  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  if (
    world === undefined ||
    world.area.filter((value) => value !== null).length < MIN_WORLD_YEARS
  ) {
    throw new ProviderDataError(
      `${LABEL} response has fewer than ${MIN_WORLD_YEARS} years of values for World`,
    );
  }
  assertConsistentLandArea(world.area, world.share);

  return {
    data: {
      startYear: FOREST_AREA_START_YEAR,
      endYear,
      units: { ...FOREST_AREA_UNITS },
      dataset: { name: areaMetadata.datasetName, version: areaMetadata.datasetVersion },
      origin: FAO_FRA_ORIGIN,
      entities,
    },
    lastUpdated: latestTimestamp(areaMetadata.updatedAt, shareMetadata.updatedAt),
  };
}

@Injectable()
export class ForestAreaService {
  private readonly allowedCodes = listCountryEntityCodes();
  private readonly allowedCodeSet: ReadonlySet<string> = new Set(this.allowedCodes);

  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(DEFORESTATION_CATEGORY, [FAO_FRA_ORIGIN]);
  }

  /**
   * Forest area and its share of land area, 1990 to the latest year, of every country plus
   * World. A provider failure serves the stored last good payload (`stale: true`) when there
   * is one; without it the error propagates and becomes 502 in the global filter.
   */
  getForestArea(): Promise<Snapshotted<ForestAreaResult>> {
    return this.snapshots.resolve(FOREST_AREA_SNAPSHOT_KEY, () => this.assemble());
  }

  /** Fetches and assembles the payload: two chart downloads and two metadata reads. */
  private async assemble(): Promise<ForestAreaResult> {
    const options = {
      tab: DEFORESTATION_CHART_TAB,
      country: this.allowedCodes,
      timeRange: { from: FOREST_AREA_START_YEAR, to: new Date().getUTCFullYear() },
    } as const;

    const [area, share, areaMetadata, shareMetadata] = await Promise.all([
      this.owid.getGrapherSeries(FOREST_AREA_CHART.slug, {
        ...options,
        column: FOREST_AREA_CHART.column,
      }),
      this.owid.getGrapherSeries(FOREST_SHARE_CHART.slug, {
        ...options,
        column: FOREST_SHARE_CHART.column,
      }),
      this.owid.getIndicatorMetadata(FOREST_AREA_CHART.metadataIndicatorId),
      this.owid.getIndicatorMetadata(FOREST_SHARE_CHART.metadataIndicatorId),
    ]);

    const result = buildForestAreaData({
      area,
      share,
      areaMetadata,
      shareMetadata,
      allowedCodes: this.allowedCodeSet,
    });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
