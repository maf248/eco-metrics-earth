import { Injectable } from '@nestjs/common';

import { DataSourceOrigin, EcoCategory, LiveDataSourceOrigin } from '@eco-metrics/shared';

import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from '../../data-sources/data-source-contributor';

import { OWID_PUBLISHER } from './owid.attribution';

const OWID_DATA_SOURCE_ID = 'owid';

/**
 * The single place where Our World in Data is declared as a live data source.
 *
 * `DataSourcesService` rejects two contributions with the same id, so OWID-backed
 * category modules must not each declare their own. Instead, every category calls
 * {@link registerCategory} once and {@link recordProviderUpdate} after each successful
 * retrieval; this contributor turns that state into one catalog entry. It never
 * calls the provider: the catalog is collected at application bootstrap.
 */
@Injectable()
@DataSourceContributor()
export class OwidProviderStatus implements DataSourceContributorProvider {
  private readonly categories = new Set<EcoCategory>();
  /** Registered origins by `producer` + `title`; a shared origin keeps every category. */
  private readonly origins = new Map<
    string,
    { origin: DataSourceOrigin; categories: Set<EcoCategory> }
  >();
  private readonly createdAt = new Date().toISOString();
  private latestProviderUpdate: string | undefined;

  /** `origins` are the static upstream producers of the category's data (may be empty). */
  registerCategory(category: EcoCategory, origins: readonly DataSourceOrigin[]): void {
    this.categories.add(category);
    for (const origin of origins) {
      const key = `${origin.producer}\u0000${origin.title}`;
      const entry = this.origins.get(key) ?? { origin, categories: new Set<EcoCategory>() };
      entry.categories.add(category);
      this.origins.set(key, entry);
    }
  }

  private listOrigins(): LiveDataSourceOrigin[] {
    return [...this.origins.values()]
      .map(({ origin, categories }) => ({ ...origin, categories: [...categories].sort() }))
      .sort(
        (a, b) =>
          a.producer.localeCompare(b.producer, 'en') || a.title.localeCompare(b.title, 'en'),
      );
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
          id: OWID_DATA_SOURCE_ID,
          ...OWID_PUBLISHER,
          description:
            'Open research data on emissions, climate and energy, compiled from the original ' +
            'datasets and republished by the provider.',
          categories: [...this.categories].sort(),
          lastUpdated: this.latestProviderUpdate ?? this.createdAt,
          lastUpdatedBasis: this.latestProviderUpdate === undefined ? 'retrieval' : 'provider',
          origins: this.listOrigins(),
        },
      },
    ];
  }
}
