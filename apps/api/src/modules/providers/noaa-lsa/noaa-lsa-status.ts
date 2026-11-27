import { Injectable } from '@nestjs/common';

import type { EcoCategory } from '@eco-metrics/shared';

import { NOAA_LSA_PUBLISHER } from '../../../common/publishers/publishers';
import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from '../../data-sources/data-source-contributor';

import { NOAA_LSA_ORIGIN } from './noaa-lsa.constants';

export const NOAA_LSA_DATA_SOURCE_ID = 'noaa-lsa';

/**
 * The single place where NOAA LSA is declared as a live data source. The feed
 * carries no timestamp, so the basis is always `retrieval`: the time of the
 * latest fresh read ({@link recordRetrieval}) or of the application start.
 */
@Injectable()
@DataSourceContributor()
export class NoaaLsaStatus implements DataSourceContributorProvider {
  private readonly categories = new Set<EcoCategory>();
  private lastRetrieval = new Date().toISOString();

  registerCategory(category: EcoCategory): void {
    this.categories.add(category);
  }

  recordRetrieval(retrievedAt: string): void {
    if (Date.parse(retrievedAt) > Date.parse(this.lastRetrieval)) {
      this.lastRetrieval = retrievedAt;
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
          id: NOAA_LSA_DATA_SOURCE_ID,
          ...NOAA_LSA_PUBLISHER,
          description:
            'Global mean sea level from satellite radar altimetry, one series per mission, ' +
            'published by the NOAA Laboratory for Satellite Altimetry.',
          categories: [...this.categories].sort(),
          lastUpdated: this.lastRetrieval,
          lastUpdatedBasis: 'retrieval',
          origins: [{ ...NOAA_LSA_ORIGIN, categories: [...this.categories].sort() }],
        },
      },
    ];
  }
}
