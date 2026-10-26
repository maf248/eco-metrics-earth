import { Injectable } from '@nestjs/common';

import { Co2EmissionsData, MetricSeries, listCountryEntityCodes } from '@eco-metrics/shared';

import {
  buildYearAlignedEntities,
  latestTimestamp,
  roundTo,
} from '../../common/series/build-year-aligned-entities';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  CO2_EMISSIONS_CATEGORY,
  CO2_ORIGIN,
  CO2_PER_CAPITA_CHART,
  CO2_PER_CAPITA_DECIMALS,
  CO2_START_YEAR,
  CO2_TOTAL_CHART,
  CO2_TOTAL_DECIMALS,
  CO2_UNITS,
  TONNES_PER_MEGATONNE,
} from './co2-emissions.constants';

export interface BuildCo2EmissionsInput {
  /** Annual emissions in tonnes, one series per entity. */
  total: MetricSeries[];
  /** Annual emissions in tonnes per person, one series per entity. */
  perCapita: MetricSeries[];
  totalMetadata: OwidIndicatorMetadata;
  perCapitaMetadata: OwidIndicatorMetadata;
  /** Entity codes allowed in the response (countries, Kosovo and World). */
  allowedCodes: ReadonlySet<string>;
}

/** What the pure builder assembles from the provider's data: the payload without its origin. */
export interface BuiltCo2Emissions {
  data: Omit<Co2EmissionsData, 'origin'>;
  /** Latest `updatedAt` of the two indicators: the provider's own timestamp. */
  lastUpdated: string;
}

export interface Co2EmissionsResult {
  data: Co2EmissionsData;
  /** Latest `updatedAt` of the two indicators: the provider's own timestamp. */
  lastUpdated: string;
}

/**
 * Pure assembly of the endpoint payload: merges both metrics by entity code on
 * the generic builder, converting units and rounding per measure. Throws
 * `ProviderDataError` when the provider answered with nothing usable.
 */
export function buildCo2EmissionsData(input: BuildCo2EmissionsInput): BuiltCo2Emissions {
  const { endYear, entities } = buildYearAlignedEntities({
    label: 'CO2 emissions',
    startYear: CO2_START_YEAR,
    allowedCodes: input.allowedCodes,
    measures: {
      total: {
        series: input.total,
        convert: (value) => roundTo(value / TONNES_PER_MEGATONNE, CO2_TOTAL_DECIMALS),
      },
      perCapita: {
        series: input.perCapita,
        convert: (value) => roundTo(value, CO2_PER_CAPITA_DECIMALS),
      },
    },
  });

  return {
    data: {
      startYear: CO2_START_YEAR,
      endYear,
      units: { ...CO2_UNITS },
      dataset: {
        name: input.totalMetadata.datasetName,
        version: input.totalMetadata.datasetVersion,
      },
      entities,
    },
    lastUpdated: latestTimestamp(input.totalMetadata.updatedAt, input.perCapitaMetadata.updatedAt),
  };
}

@Injectable()
export class Co2EmissionsService {
  private readonly allowedCodes = listCountryEntityCodes();
  private readonly allowedCodeSet: ReadonlySet<string> = new Set(this.allowedCodes);

  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
  ) {
    this.providerStatus.registerCategory(CO2_EMISSIONS_CATEGORY, [CO2_ORIGIN]);
  }

  /**
   * Annual CO2 emissions of every country plus World. Provider errors propagate
   * and become 502 in the global filter. The OWID client caches all four
   * requests, so assembling cached data takes milliseconds.
   */
  async getCo2Emissions(): Promise<Co2EmissionsResult> {
    const options = {
      country: this.allowedCodes,
      timeRange: { from: CO2_START_YEAR, to: new Date().getUTCFullYear() },
    };

    const [total, perCapita, totalMetadata, perCapitaMetadata] = await Promise.all([
      this.owid.getGrapherSeries(CO2_TOTAL_CHART.slug, {
        ...options,
        column: CO2_TOTAL_CHART.column,
      }),
      this.owid.getGrapherSeries(CO2_PER_CAPITA_CHART.slug, {
        ...options,
        column: CO2_PER_CAPITA_CHART.column,
      }),
      this.owid.getIndicatorMetadata(CO2_TOTAL_CHART.indicatorId),
      this.owid.getIndicatorMetadata(CO2_PER_CAPITA_CHART.indicatorId),
    ]);

    const built = buildCo2EmissionsData({
      total,
      perCapita,
      totalMetadata,
      perCapitaMetadata,
      allowedCodes: this.allowedCodeSet,
    });
    this.providerStatus.recordProviderUpdate(built.lastUpdated);

    return { data: { ...built.data, origin: CO2_ORIGIN }, lastUpdated: built.lastUpdated };
  }
}
