import type { ApiResponse, DataSourcePublisher } from '@eco-metrics/shared';

export interface ProviderEnvelopeFreshness {
  /** Time of the last successful provider fetch of the payload. */
  fetchedAt: string;
  /** `true` when the payload is a stored snapshot served because the provider failed. */
  stale: boolean;
}

/**
 * Success envelope of a provider-backed endpoint: the payload plus the
 * attribution contract (`meta.source` is the given publisher definition with
 * the payload's own `lastUpdated`, so a stored snapshot never freezes the
 * attribution text) and its freshness (`fetchedAt`, `stale`). Takes the
 * publisher as an argument so `common/` never imports from `modules/`.
 */
export function buildProviderEnvelope<T>(
  publisher: DataSourcePublisher,
  data: T,
  lastUpdated: string,
  { fetchedAt, stale }: ProviderEnvelopeFreshness,
): ApiResponse<T> {
  return {
    success: true,
    data,
    status: 200,
    meta: {
      source: { ...publisher, lastUpdated },
      fetchedAt,
      stale,
    },
  };
}
