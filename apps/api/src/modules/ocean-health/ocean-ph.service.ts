import { Injectable } from '@nestjs/common';

import type { OceanPhData } from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { OwidClient } from '../providers/owid/owid-client.service';
import { OwidProviderStatus } from '../providers/owid/owid-provider-status';
import type { OwidDatedSeries, OwidIndicatorMetadata } from '../providers/owid/owid.types';

import {
  HOT_ORIGIN,
  OCEAN_HEALTH_CATEGORY,
  OCEAN_HEALTH_SNAPSHOT_KEYS,
  OCEAN_PH_CHART,
  OCEAN_PH_STATION,
  OCEAN_PH_UNIT,
} from './ocean-health.constants';

export interface OceanPhResult {
  data: OceanPhData;
  /** The indicator's own `updatedAt`. */
  lastUpdated: string;
}

const LABEL = 'Ocean pH';

/**
 * Pure assembly of the pH payload from the dated series (columns in the order
 * yearly average, monthly): every row is served, no cap applies. Throws
 * `ProviderDataError` for another entity than Hawaii or no monthly value.
 */
export function buildOceanPhData(
  series: OwidDatedSeries,
  metadata: OwidIndicatorMetadata,
): OceanPhResult {
  if (series.entityName !== OCEAN_PH_STATION) {
    throw new ProviderDataError(
      `${LABEL} response is for "${series.entityName}", expected "${OCEAN_PH_STATION}"`,
    );
  }
  if (series.rows.every(({ values }) => values[1] === null)) {
    throw new ProviderDataError(`${LABEL} response has no monthly value`);
  }

  return {
    data: {
      unit: OCEAN_PH_UNIT,
      station: OCEAN_PH_STATION,
      dates: series.rows.map(({ date }) => date),
      monthly: series.rows.map(({ values }) => values[1]),
      yearlyAverage: series.rows.map(({ values }) => values[0]),
      dataset: { name: metadata.datasetName, version: metadata.datasetVersion },
      origin: HOT_ORIGIN,
    },
    lastUpdated: metadata.updatedAt,
  };
}

@Injectable()
export class OceanPhService {
  constructor(
    private readonly owid: OwidClient,
    private readonly providerStatus: OwidProviderStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(OCEAN_HEALTH_CATEGORY, [HOT_ORIGIN]);
  }

  /** Hawaii ocean pH, resolved through its own snapshot. */
  getPh(): Promise<Snapshotted<OceanPhResult>> {
    return this.snapshots.resolve(OCEAN_HEALTH_SNAPSHOT_KEYS.ph, () => this.assemble());
  }

  private async assemble(): Promise<OceanPhResult> {
    const [series, metadata] = await Promise.all([
      // One entity, so no `country`; the whole span, so no `time`.
      this.owid.getGrapherDatedSeries(OCEAN_PH_CHART.slug, {
        tab: 'chart',
        columns: [OCEAN_PH_CHART.columns.yearlyAverage, OCEAN_PH_CHART.columns.monthly],
      }),
      this.owid.getIndicatorMetadata(OCEAN_PH_CHART.indicatorId),
    ]);

    const result = buildOceanPhData(series, metadata);
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
