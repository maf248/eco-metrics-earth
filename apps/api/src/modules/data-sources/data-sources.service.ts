import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { DataSourcesCatalog, LiveDataSource, StaticDataSource } from '@eco-metrics/shared';

import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from './data-source-contributor';

const byId = (a: { id: string }, b: { id: string }): number => a.id.localeCompare(b.id);

/** A publication's license is its publisher's when it has one: both together are ambiguous. */
function rejectPublisherWithLicense({ id, publications }: StaticDataSource): void {
  const ambiguous = publications.find(({ publisher, license }) => publisher && license);
  if (ambiguous) {
    throw new Error(
      `Data source "${id}": publication "${ambiguous.citation}" has both a publisher and a license`,
    );
  }
}

@Injectable()
export class DataSourcesService implements OnApplicationBootstrap {
  constructor(private readonly discovery: DiscoveryService) {}

  /** Collects once at startup so a duplicate id fails the boot, not the first request. */
  async onApplicationBootstrap(): Promise<void> {
    await this.getCatalog();
  }

  async getCatalog(): Promise<DataSourcesCatalog> {
    const contributions = await this.collect();
    const providers: LiveDataSource[] = [];
    const datasets: StaticDataSource[] = [];
    const seen = new Set<string>();

    for (const { kind, source } of contributions) {
      if (seen.has(source.id)) {
        throw new Error(`Duplicate data source id "${source.id}"`);
      }
      seen.add(source.id);

      if (kind === 'provider') {
        providers.push(source);
      } else {
        rejectPublisherWithLicense(source);
        datasets.push({
          ...source,
          publications: [...source.publications].sort((a, b) =>
            a.citation.localeCompare(b.citation),
          ),
        });
      }
    }

    return { providers: providers.sort(byId), datasets: datasets.sort(byId) };
  }

  private async collect(): Promise<DataSourceContribution[]> {
    const wrappers = this.discovery.getProviders({ metadataKey: DataSourceContributor.KEY });
    const contributors = wrappers
      .map(({ instance }) => instance as DataSourceContributorProvider | undefined)
      .filter((instance): instance is DataSourceContributorProvider => instance !== undefined);

    const lists = await Promise.all(
      contributors.map((contributor) => contributor.getDataSources()),
    );

    return lists.flat();
  }
}
