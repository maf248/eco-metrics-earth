import { Injectable } from '@nestjs/common';

import {
  MetricSeries,
  OceanHeatContentData,
  OceanHeatDepth,
  WORLD_ENTITY_CODE,
} from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import {
  alignSeriesToYears,
  latestTimestamp,
  roundTo,
  valueYearRange,
} from '../../common/series/build-year-aligned-entities';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  OCEAN_HEALTH_CATEGORY,
  OCEAN_HEALTH_SNAPSHOT_KEYS,
  OCEAN_HEAT_DECIMALS,
  OCEAN_HEAT_DEPTHS,
  OCEAN_HEAT_EPA_ORIGIN,
  OCEAN_HEAT_NOAA_ORIGIN,
  OCEAN_HEAT_UNIT,
  heatContentColumn,
} from './ocean-health.constants';

type DepthDefinition = (typeof OCEAN_HEAT_DEPTHS)[number];

/** The World series of every source of one depth, with the indicator metadata of the chart. */
export interface HeatDepthInput {
  id: DepthDefinition['id'];
  /** One entry per source id of the depth: the chart column as a series per entity. */
  sources: { id: string; series: MetricSeries[] }[];
  metadata: OwidIndicatorMetadata;
}

export interface BuildOceanHeatContentInput {
  depths: HeatDepthInput[];
  /** Last year that may be served: the previous calendar year (the current one is partial). */
  maxYear: number;
}

export interface OceanHeatContentResult {
  data: OceanHeatContentData;
  /** Latest `updatedAt` of both charts' indicators. */
  lastUpdated: string;
}

const LABEL = 'Ocean heat content';
// `10²² J`: a different power of ten or unit would mislabel every value.
const UNIT_PATTERN = /^10²²\s*J$/;

function definitionOf(id: DepthDefinition['id']): DepthDefinition {
  const definition = OCEAN_HEAT_DEPTHS.find((depth) => depth.id === id);
  if (definition === undefined) {
    throw new ProviderDataError(`${LABEL} has no depth "${id}"`);
  }
  return definition;
}

/**
 * Pure assembly of the World's ocean heat content at both depths: verifies the
 * unit of each chart, caps the years at `maxYear`, aligns every source on one
 * shared year range (a source with no value in a year is `null`, never zero)
 * and rounds. Throws `ProviderDataError` for a missing source, a unit that is
 * not `10²² J` or no value at all.
 */
export function buildOceanHeatContentData(
  input: BuildOceanHeatContentInput,
): OceanHeatContentResult {
  const { maxYear } = input;

  const prepared = input.depths.map((depth) => {
    const definition = definitionOf(depth.id);
    if (!UNIT_PATTERN.test(depth.metadata.shortUnit)) {
      throw new ProviderDataError(
        `${LABEL} ${definition.label} unit is "${depth.metadata.shortUnit}", expected "${OCEAN_HEAT_UNIT}"`,
      );
    }

    const sources = definition.sources.map((source) => {
      const column = heatContentColumn(source.id, definition.id);
      const world = depth.sources
        .find(({ id }) => id === source.id)
        ?.series.find(({ entityCode }) => entityCode === WORLD_ENTITY_CODE);
      if (!world) {
        throw new ProviderDataError(`${LABEL} response has no World values for "${column}"`);
      }
      return {
        id: source.id,
        name: source.name,
        series: { ...world, points: world.points.filter(({ year }) => year <= maxYear) },
      };
    });

    return { definition, metadata: depth.metadata, sources };
  });

  const range = valueYearRange(
    prepared.flatMap(({ sources }) => sources.map(({ series }) => series.points)),
  );
  if (range === undefined) {
    throw new ProviderDataError(`${LABEL} response has no value in any year`);
  }

  const { startYear, endYear } = range;
  const length = endYear - startYear + 1;
  const round = (value: number): number => roundTo(value, OCEAN_HEAT_DECIMALS);

  const depths: OceanHeatDepth[] = prepared.map(({ definition, metadata, sources }) => ({
    id: definition.id,
    label: definition.label,
    dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
    sources: sources.map(({ id, name, series }) => ({
      id,
      name,
      values: alignSeriesToYears(series, startYear, length, round),
    })),
  }));

  const [firstDepth, ...otherDepths] = prepared;

  return {
    data: {
      startYear,
      endYear,
      unit: OCEAN_HEAT_UNIT,
      depths,
      origins: [OCEAN_HEAT_NOAA_ORIGIN, OCEAN_HEAT_EPA_ORIGIN],
    },
    lastUpdated: latestTimestamp(
      firstDepth.metadata.updatedAt,
      ...otherDepths.map(({ metadata }) => metadata.updatedAt),
    ),
  };
}

@Injectable()
export class OceanHeatContentService {
  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(OCEAN_HEALTH_CATEGORY, [
      OCEAN_HEAT_NOAA_ORIGIN,
      OCEAN_HEAT_EPA_ORIGIN,
    ]);
  }

  /** Ocean heat content at both depths, resolved through its own snapshot. */
  getHeatContent(): Promise<Snapshotted<OceanHeatContentResult>> {
    return this.snapshots.resolve(OCEAN_HEALTH_SNAPSHOT_KEYS.heatContent, () => this.assemble());
  }

  /** Two chart reads (one download each, shared by their columns) and two metadata reads. */
  private async assemble(): Promise<OceanHeatContentResult> {
    const maxYear = new Date().getUTCFullYear() - 1;

    const depths = await Promise.all(
      OCEAN_HEAT_DEPTHS.map(async (depth): Promise<HeatDepthInput> => {
        const [sources, metadata] = await Promise.all([
          Promise.all(
            depth.sources.map(async ({ id }) => ({
              id,
              series: await this.owid.getGrapherSeries(depth.slug, {
                column: heatContentColumn(id, depth.id),
                tab: 'chart',
                country: [WORLD_ENTITY_CODE],
              }),
            })),
          ),
          this.owid.getIndicatorMetadata(depth.indicatorId),
        ]);
        return { id: depth.id, sources, metadata };
      }),
    );

    const result = buildOceanHeatContentData({ depths, maxYear });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
