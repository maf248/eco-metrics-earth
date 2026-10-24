import { fetchFromBff } from '@/lib/bffFetch';
import type { DataSourcesCatalog } from '@eco-metrics/shared';

function isDataSourcesCatalog(data: unknown): data is DataSourcesCatalog {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { providers, datasets } = data as Record<string, unknown>;

  return Array.isArray(providers) && Array.isArray(datasets);
}

/** Fetches the catalog of data sources in use from the BFF; throws when every attempt fails. */
export function getDataSources(): Promise<DataSourcesCatalog> {
  return fetchFromBff({
    path: '/data-sources',
    label: 'Data sources',
    isData: isDataSourcesCatalog,
  });
}
