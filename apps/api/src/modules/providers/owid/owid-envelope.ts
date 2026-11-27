import type { ApiResponse } from '@eco-metrics/shared';

import {
  buildProviderEnvelope,
  type ProviderEnvelopeFreshness,
} from '../../../common/envelope/provider-envelope';

import { OWID_PUBLISHER } from './owid.attribution';

export type OwidEnvelopeFreshness = ProviderEnvelopeFreshness;

/**
 * Success envelope of every OWID-backed endpoint: the generic provider
 * envelope with the OWID publisher (see `buildProviderEnvelope`).
 */
export function buildOwidEnvelope<T>(
  data: T,
  lastUpdated: string,
  freshness: OwidEnvelopeFreshness,
): ApiResponse<T> {
  return buildProviderEnvelope(OWID_PUBLISHER, data, lastUpdated, freshness);
}
