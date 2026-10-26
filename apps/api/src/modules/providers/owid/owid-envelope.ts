import type { ApiResponse } from '@eco-metrics/shared';

import { OWID_PUBLISHER } from './owid.attribution';

/**
 * Success envelope of every OWID-backed endpoint: the payload plus the
 * attribution contract (`meta.source` is the OWID publisher definition with the
 * provider's own `lastUpdated`) and the time the response was assembled.
 */
export function buildOwidEnvelope<T>(data: T, lastUpdated: string): ApiResponse<T> {
  return {
    success: true,
    data,
    status: 200,
    meta: {
      source: { ...OWID_PUBLISHER, lastUpdated },
      fetchedAt: new Date().toISOString(),
    },
  };
}
