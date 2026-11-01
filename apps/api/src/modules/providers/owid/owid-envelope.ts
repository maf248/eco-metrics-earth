import type { ApiResponse } from '@eco-metrics/shared';

import { OWID_PUBLISHER } from './owid.attribution';

export interface OwidEnvelopeFreshness {
  /** Time of the last successful provider fetch of the payload. */
  fetchedAt: string;
  /** `true` when the payload is a stored snapshot served because OWID failed. */
  stale: boolean;
}

/**
 * Success envelope of every OWID-backed endpoint: the payload plus the
 * attribution contract (`meta.source` is the current OWID publisher definition
 * with the payload's own `lastUpdated`, so a stored snapshot never freezes the
 * attribution text) and its freshness (`fetchedAt`, `stale`).
 */
export function buildOwidEnvelope<T>(
  data: T,
  lastUpdated: string,
  { fetchedAt, stale }: OwidEnvelopeFreshness,
): ApiResponse<T> {
  return {
    success: true,
    data,
    status: 200,
    meta: {
      source: { ...OWID_PUBLISHER, lastUpdated },
      fetchedAt,
      stale,
    },
  };
}
