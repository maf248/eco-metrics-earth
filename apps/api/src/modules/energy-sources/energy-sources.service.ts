import { Injectable } from '@nestjs/common';

import {
  ENERGY_SOURCE_IDS,
  EnergySourceId,
  EnergySourcesData,
  EnergySourcesEntity,
  MetricSeries,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { buildYearAlignedEntities, roundTo } from '../../common/series/build-year-aligned-entities';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  ENERGY_DECIMALS,
  ENERGY_GENERATION_CHART,
  ENERGY_ORIGIN,
  ENERGY_SOURCES_CATEGORY,
  ENERGY_SOURCE_COLUMNS,
  ENERGY_START_YEAR,
  ENERGY_UNIT,
  EnergyRawColumn,
} from './energy-sources.constants';

export interface BuildEnergySourcesInput {
  /** Raw provider series by column: one series per entity. */
  generation: Record<EnergyRawColumn, MetricSeries[]>;
  /** Metadata of the indicator that names the dataset and carries the timestamp. */
  metadata: OwidIndicatorMetadata;
  /** Entity codes allowed in the response (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
}

export interface EnergySourcesResult {
  data: EnergySourcesData;
  /** The provider's own timestamp (`updatedAt` of the metadata indicator). */
  lastUpdated: string;
}

const LABEL = 'Energy sources';

type SourceValues = Record<EnergySourceId, number | null>;

/** A record with one fresh value per source. */
function bySource<T>(make: () => T): Record<EnergySourceId, T> {
  const record = {} as Record<EnergySourceId, T>;
  for (const id of ENERGY_SOURCE_IDS) {
    record[id] = make();
  }
  return record;
}

/** Year to value of one raw column for one entity. */
function indexByYear(series: MetricSeries | undefined): Map<number, number | null> {
  return new Map((series?.points ?? []).map(({ year, value }) => [year, value]));
}

/**
 * The served value of a source: the raw column itself, or for several columns
 * their sum, `null` only when every part is `null`. Summing happens before
 * rounding, so two parts never drift by a rounding step.
 */
function combine(parts: (number | null)[]): number | null {
  const present = parts.filter((part): part is number => part !== null);
  return present.length === 0 ? null : present.reduce((sum, part) => sum + part, 0);
}

/** A year has real generation when at least one source is present and the total is not zero. */
function hasGeneration(values: SourceValues): boolean {
  const total = combine(ENERGY_SOURCE_IDS.map((id) => values[id]));
  return total !== null && total !== 0;
}

/**
 * Per source, one series per allowed entity holding only the years that have
 * real generation (and are not before the start year).
 */
function buildSourceSeries(input: BuildEnergySourcesInput): Record<EnergySourceId, MetricSeries[]> {
  const columns = Object.keys(ENERGY_GENERATION_CHART.columns) as EnergyRawColumn[];
  const byColumn = new Map(
    columns.map((column) => {
      const entities = new Map<string, MetricSeries>();
      for (const series of input.generation[column]) {
        if (input.allowedCodes.has(series.entityCode)) {
          entities.set(series.entityCode, series);
        }
      }
      return [column, entities] as const;
    }),
  );

  const codes = new Set<string>();
  for (const entities of byColumn.values()) {
    for (const code of entities.keys()) {
      codes.add(code);
    }
  }

  const result = bySource<MetricSeries[]>(() => []);

  for (const code of codes) {
    const indexed = new Map(
      columns.map((column) => [column, indexByYear(byColumn.get(column)?.get(code))] as const),
    );
    const entityName =
      columns.map((column) => byColumn.get(column)?.get(code)?.entityName).find(Boolean) ?? code;

    const years = new Set<number>();
    for (const byYear of indexed.values()) {
      for (const year of byYear.keys()) {
        if (year >= ENERGY_START_YEAR) {
          years.add(year);
        }
      }
    }

    const points = bySource<MetricSeries['points']>(() => []);
    for (const year of [...years].sort((a, b) => a - b)) {
      const values = Object.fromEntries(
        ENERGY_SOURCE_IDS.map((id) => [
          id,
          combine(
            ENERGY_SOURCE_COLUMNS[id].map((column) => indexed.get(column)?.get(year) ?? null),
          ),
        ]),
      ) as SourceValues;
      if (!hasGeneration(values)) {
        continue;
      }
      for (const id of ENERGY_SOURCE_IDS) {
        points[id].push({ year, value: values[id] });
      }
    }

    for (const id of ENERGY_SOURCE_IDS) {
      result[id].push({ entityName, entityCode: code, points: points[id] });
    }
  }

  return result;
}

/**
 * Pure assembly of the endpoint payload: sums bioenergy and other renewables,
 * drops the years without real generation (all blank or all zero) and everything
 * before the start year, aligns the eight sources by year on the generic builder
 * and regroups them under `generation`. A blank stays `null`, never zero. Throws
 * `ProviderDataError` when the provider answered with nothing usable (no World,
 * no value).
 */
export function buildEnergySourcesData(input: BuildEnergySourcesInput): EnergySourcesResult {
  const seriesBySource = buildSourceSeries(input);
  const { endYear, entities } = buildYearAlignedEntities({
    label: LABEL,
    startYear: ENERGY_START_YEAR,
    allowedCodes: input.allowedCodes,
    measures: Object.fromEntries(
      ENERGY_SOURCE_IDS.map((id) => [
        id,
        { series: seriesBySource[id], convert: (value: number) => roundTo(value, ENERGY_DECIMALS) },
      ]),
    ) as Record<EnergySourceId, { series: MetricSeries[]; convert: (value: number) => number }>,
  });

  const regrouped: EnergySourcesEntity[] = entities.map((entity) => ({
    code: entity.code,
    iso2: entity.iso2,
    name: entity.name,
    generation: Object.fromEntries(
      ENERGY_SOURCE_IDS.map((id) => [id, entity[id]]),
    ) as EnergySourcesEntity['generation'],
  }));

  const { metadata } = input;
  return {
    data: {
      startYear: ENERGY_START_YEAR,
      endYear,
      unit: ENERGY_UNIT,
      dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
      origin: ENERGY_ORIGIN,
      entities: regrouped,
    },
    lastUpdated: metadata.updatedAt,
  };
}

@Injectable()
export class EnergySourcesService {
  private readonly allowedCodes = listCountryEntityCodes();
  private readonly allowedCodeSet: ReadonlySet<string> = new Set(this.allowedCodes);

  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
  ) {
    this.providerStatus.registerCategory(ENERGY_SOURCES_CATEGORY, [ENERGY_ORIGIN]);
  }

  /**
   * Electricity generation by source of every country plus World. Provider errors
   * propagate and become 502 in the global filter; there is never a partial
   * payload. All columns share one cached download (the client caches the table
   * per chart, country list and range), so a cold start costs one CSV request
   * and one metadata request.
   */
  async getEnergySources(): Promise<EnergySourcesResult> {
    const options = {
      country: this.allowedCodes,
      timeRange: { from: ENERGY_START_YEAR, to: new Date().getUTCFullYear() },
    };
    const columns = Object.keys(ENERGY_GENERATION_CHART.columns) as EnergyRawColumn[];

    const [series, metadata] = await Promise.all([
      Promise.all(
        columns.map((column) =>
          this.owid.getGrapherSeries(ENERGY_GENERATION_CHART.slug, {
            ...options,
            column: ENERGY_GENERATION_CHART.columns[column].column,
          }),
        ),
      ),
      this.owid.getIndicatorMetadata(ENERGY_GENERATION_CHART.metadataIndicatorId),
    ]);

    const result = buildEnergySourcesData({
      generation: Object.fromEntries(
        columns.map((column, index) => [column, series[index]]),
      ) as Record<EnergyRawColumn, MetricSeries[]>,
      metadata,
      allowedCodes: this.allowedCodeSet,
    });
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
