import { DataSourcePublisher } from '@eco-metrics/shared';

import {
  COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  NOAA_LSA_PUBLISHER,
  OWID_PUBLISHER,
} from './publishers';

const PUBLISHERS_BY_HOST: Record<string, DataSourcePublisher> = {
  'ourworldindata.org': OWID_PUBLISHER,
  'pulse.climate.copernicus.eu': COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  'sites.ecmwf.int': COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  'www.star.nesdis.noaa.gov': NOAA_LSA_PUBLISHER,
};

/**
 * Resolves the licensor that republishes the data at `sourceUrl`.
 * Returns `undefined` for hosts without a known licensor; throws on an unparsable URL.
 */
export function resolvePublisher(sourceUrl: string): DataSourcePublisher | undefined {
  const { hostname } = new URL(sourceUrl);

  return Object.hasOwn(PUBLISHERS_BY_HOST, hostname) ? PUBLISHERS_BY_HOST[hostname] : undefined;
}
