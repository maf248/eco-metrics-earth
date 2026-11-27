import { Injectable } from '@nestjs/common';

import type { EcoCategory } from '@eco-metrics/shared';

import { COPERNICUS_CLIMATE_PULSE_PUBLISHER } from '../../../common/publishers/publishers';
import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from '../../data-sources/data-source-contributor';

import { COPERNICUS_CLIMATE_PULSE_ORIGIN } from './copernicus-climate-pulse.constants';

export const COPERNICUS_CLIMATE_PULSE_DATA_SOURCE_ID = 'copernicus-climate-pulse';

/**
 * The single place where Copernicus Climate Pulse is declared as a live data
 * source. Categories call {@link registerCategory} once and
 * {@link recordProviderUpdate} after each fresh retrieval; it never calls the
 * provider, because the catalog is collected at bootstrap.
 */
@Injectable()
@DataSourceContributor()
export class CopernicusClimatePulseStatus implements DataSourceContributorProvider {
  private readonly categories = new Set<EcoCategory>();
  private readonly createdAt = new Date().toISOString();
  private latestProviderUpdate: string | undefined;

  registerCategory(category: EcoCategory): void {
    this.categories.add(category);
  }

  /** Keeps the latest provider timestamp, whatever the order of calls. */
  recordProviderUpdate(updatedAt: string): void {
    if (
      this.latestProviderUpdate === undefined ||
      Date.parse(updatedAt) > Date.parse(this.latestProviderUpdate)
    ) {
      this.latestProviderUpdate = updatedAt;
    }
  }

  getDataSources(): DataSourceContribution[] {
    if (this.categories.size === 0) {
      return [];
    }

    return [
      {
        kind: 'provider',
        source: {
          id: COPERNICUS_CLIMATE_PULSE_DATA_SOURCE_ID,
          ...COPERNICUS_CLIMATE_PULSE_PUBLISHER,
          description:
            'Near real-time daily sea surface temperature from the ERA5 reanalysis, published by ' +
            'the Copernicus Climate Change Service.',
          categories: [...this.categories].sort(),
          lastUpdated: this.latestProviderUpdate ?? this.createdAt,
          lastUpdatedBasis: this.latestProviderUpdate === undefined ? 'retrieval' : 'provider',
          origins: [
            { ...COPERNICUS_CLIMATE_PULSE_ORIGIN, categories: [...this.categories].sort() },
          ],
        },
      },
    ];
  }
}
