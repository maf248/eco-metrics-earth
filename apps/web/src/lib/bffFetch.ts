import 'server-only';

import { apiBaseUrl } from '@/lib/apiBaseUrl';
import { internalApiHeaders } from '@/lib/internalApiHeaders';
import type { ApiResponseMeta } from '@eco-metrics/shared';

// A Cloud Run cold start takes several seconds: the first attempt wakes the
// instance and the second one finds it ready, so no delay is needed between them.
const MAX_ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 10_000;

interface BffFetchOptions<T> {
  /** Path below the API base URL, e.g. `/data-sources`. */
  path: string;
  /** Human name of the resource, used in logs and in the thrown error. */
  label: string;
  /** Runtime shape guard for the envelope's `data`. */
  isData: (data: unknown) => data is T;
}

interface BffEnvelopeOptions<T> extends BffFetchOptions<T> {
  /**
   * When true, a payload without a well-typed `meta` (source attribution and
   * `fetchedAt`) counts as a failed attempt.
   */
  requireMeta?: boolean;
}

/** Data plus the response `meta` (attribution), as returned by the BFF envelope. */
export interface BffEnvelope<T> {
  data: T;
  meta?: ApiResponseMeta;
}

const isString = (value: unknown): value is string => typeof value === 'string';

function isMeta(meta: unknown): meta is ApiResponseMeta {
  if (typeof meta !== 'object' || meta === null) {
    return false;
  }
  const { source, fetchedAt } = meta as { source?: unknown; fetchedAt?: unknown };
  if (typeof source !== 'object' || source === null || !isString(fetchedAt)) {
    return false;
  }
  const { provider, license, sourceUrl, lastUpdated } = source as Record<string, unknown>;
  return [provider, license, sourceUrl, lastUpdated].every(isString);
}

/** The BFF answered, but with a body this version of the web does not accept. */
class BffShapeError extends Error {}

async function fetchEnvelope<T>(
  url: string,
  isData: BffFetchOptions<T>['isData'],
  requireMeta: boolean,
  bypassDataCache: boolean,
): Promise<BffEnvelope<T>> {
  const response = await fetch(url, {
    headers: internalApiHeaders(),
    // The Data Cache can hold a response written under an older payload contract
    // (it outlives deployments and dev restarts). After a shape mismatch the retry
    // goes to the BFF directly instead of reading the same entry again.
    ...(bypassDataCache ? { cache: 'no-store' as const } : { next: { revalidate: 86400 } }),
    // A per-attempt signal also opts the request out of render-pass memoization,
    // so the retry is a real second request.
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`BFF responded with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    success?: unknown;
    data?: unknown;
    meta?: unknown;
  } | null;

  if (payload?.success !== true || !isData(payload.data)) {
    throw new BffShapeError('BFF payload does not match the expected response shape');
  }

  if (requireMeta && !isMeta(payload.meta)) {
    throw new BffShapeError('BFF payload is missing the response meta');
  }

  return { data: payload.data, meta: isMeta(payload.meta) ? payload.meta : undefined };
}

/**
 * Reads a resource from the BFF, retrying once to ride out a cold start, and
 * returns the envelope's `data` together with its `meta` (attribution).
 *
 * Throws when every attempt fails so that a page is never rendered (and never
 * cached by ISR) without data: during a revalidation Next.js keeps serving the
 * last successfully generated page.
 */
export async function fetchEnvelopeFromBff<T>({
  path,
  label,
  isData,
  requireMeta = false,
}: BffEnvelopeOptions<T>): Promise<BffEnvelope<T>> {
  const url = `${apiBaseUrl()}${path}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchEnvelope(url, isData, requireMeta, lastError instanceof BffShapeError);
    } catch (error) {
      lastError = error;
    }
  }

  // eslint-disable-next-line no-console
  console.error(`${label} fetch failed after ${MAX_ATTEMPTS} attempts (${url}):`, lastError);
  throw new Error(`${label} could not be fetched from the BFF`, { cause: lastError });
}

/** Reads only the `data` of a BFF resource. See {@link fetchEnvelopeFromBff}. */
export async function fetchFromBff<T>(options: BffFetchOptions<T>): Promise<T> {
  return (await fetchEnvelopeFromBff(options)).data;
}

/**
 * Reads a resource whose attribution `meta` is mandatory. Returns the validated
 * `data` together with its `meta`; a response without `meta` fails like any
 * other unusable payload (and the type-narrowing check below never fires).
 */
export async function fetchPayloadFromBff<T>(
  options: BffFetchOptions<T>,
): Promise<{ data: T; meta: ApiResponseMeta }> {
  const { data, meta } = await fetchEnvelopeFromBff({ ...options, requireMeta: true });

  if (!meta) {
    throw new Error(`${options.label} could not be fetched from the BFF`);
  }
  return { data, meta };
}
