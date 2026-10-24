import { DataSourcePublisher } from '@eco-metrics/shared';

import { OWID_PUBLISHER } from './publishers';

const PUBLISHERS_BY_HOST: Record<string, DataSourcePublisher> = {
  'ourworldindata.org': OWID_PUBLISHER,
};

/**
 * Resolves the licensor that republishes the data at `sourceUrl`.
 * Returns `undefined` for hosts without a known licensor; throws on an unparsable URL.
 */
export function resolvePublisher(sourceUrl: string): DataSourcePublisher | undefined {
  const { hostname } = new URL(sourceUrl);

  return Object.hasOwn(PUBLISHERS_BY_HOST, hostname) ? PUBLISHERS_BY_HOST[hostname] : undefined;
}
