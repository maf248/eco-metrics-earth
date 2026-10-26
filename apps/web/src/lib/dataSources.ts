import { fetchFromBff } from '@/lib/bffFetch';
import { isDataSourceOrigin } from '@/lib/payloadGuards';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { DataSourcesCatalog } from '@eco-metrics/shared';

const KNOWN_CATEGORIES: readonly string[] = Object.values(ECO_CATEGORIES);

function isOrigin(value: unknown): boolean {
  if (!isDataSourceOrigin(value)) {
    return false;
  }
  const { categories } = value as unknown as Record<string, unknown>;
  return (
    Array.isArray(categories) &&
    categories.every((category) => KNOWN_CATEGORIES.includes(category as string))
  );
}

/** A live provider must list its origins (possibly none): an older payload is rejected. */
function isLiveProvider(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { origins } = value as Record<string, unknown>;
  return Array.isArray(origins) && origins.every(isOrigin);
}

function isDataSourcesCatalog(data: unknown): data is DataSourcesCatalog {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { providers, datasets } = data as Record<string, unknown>;

  return Array.isArray(providers) && providers.every(isLiveProvider) && Array.isArray(datasets);
}

/** Fetches the catalog of data sources in use from the BFF; throws when every attempt fails. */
export function getDataSources(): Promise<DataSourcesCatalog> {
  return fetchFromBff({
    path: '/data-sources',
    label: 'Data sources',
    isData: isDataSourcesCatalog,
  });
}
