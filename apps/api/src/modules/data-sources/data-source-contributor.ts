import { DiscoveryService } from '@nestjs/core';

import { LiveDataSource, StaticDataSource } from '@eco-metrics/shared';

export type DataSourceContribution =
  { kind: 'provider'; source: LiveDataSource } | { kind: 'dataset'; source: StaticDataSource };

export interface DataSourceContributorProvider {
  getDataSources(): DataSourceContribution[] | Promise<DataSourceContribution[]>;
}

/** Marks a provider as declaring its module's data sources; found via `DiscoveryService`. */
export const DataSourceContributor = DiscoveryService.createDecorator<void>();
