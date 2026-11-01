import 'server-only';

import { apiBaseUrl } from '@/lib/apiBaseUrl';
import { internalApiHeaders } from '@/lib/internalApiHeaders';
import type { ApiResponseMeta } from '@eco-metrics/shared';

// A Cloud Run cold start takes several seconds: the first attempt wakes the
// instance and the second one finds it ready, so no delay is needed between them.
const MAX_ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 10_000;
const REVALIDATE_SECONDS = 86_400;
/**
 * Revalidation of a read that follows a provider `502`. Next regenerates a page on the
 * shortest revalidate among its fetches, so a degraded render never occupies the 24 h slot.
 */
export const DEGRADED_REVALIDATE_SECONDS = 300;

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
  const { source, fetchedAt, stale } = meta as {
    source?: unknown;
    fetchedAt?: unknown;
    stale?: unknown;
  };
  if (typeof source !== 'object' || source === null || !isString(fetchedAt)) {
    return false;
  }
  // Absent means fresh (payloads cached before the flag existed); any non-boolean is malformed.
  if (stale !== undefined && typeof stale !== 'boolean') {
    return false;
  }
  const { provider, license, sourceUrl, lastUpdated } = source as Record<string, unknown>;
  return [provider, license, sourceUrl, lastUpdated].every(isString);
}

/** The BFF answered, but with a body this version of the web does not accept. */
class BffShapeError extends Error {}

/** The BFF answered `502` with its own provider-error body: the data provider is down. */
class BffProviderError extends Error {}

/** True for the BFF's provider-error body; a gateway's HTML `502` page is not one. */
async function isProviderErrorBody(response: Response): Promise<boolean> {
  try {
    const body = (await response.json()) as { success?: unknown; status?: unknown } | null;
    return body?.success === false && body.status === 502;
  } catch {
    return false;
  }
}

/** How the next attempt may use Next's Data Cache, given how the previous one failed. */
function cacheOptions(previousError: unknown, shortenAfterProviderError: boolean): RequestInit {
  // The Data Cache can hold a response written under an older payload contract
  // (it outlives deployments and dev restarts). After a shape mismatch the retry
  // goes to the BFF directly instead of reading the same entry again.
  if (previousError instanceof BffShapeError) {
    return { cache: 'no-store' };
  }
  // Only provider-backed reads shorten the revalidation after a provider `502`.
  const revalidate =
    shortenAfterProviderError && previousError instanceof BffProviderError
      ? DEGRADED_REVALIDATE_SECONDS
      : REVALIDATE_SECONDS;
  return { next: { revalidate } };
}

async function fetchEnvelope<T>(
  url: string,
  isData: BffFetchOptions<T>['isData'],
  requireMeta: boolean,
  previousError: unknown,
  shortenAfterProviderError: boolean,
): Promise<BffEnvelope<T>> {
  const response = await fetch(url, {
    headers: internalApiHeaders(),
    ...cacheOptions(previousError, shortenAfterProviderError),
    // A per-attempt signal also opts the request out of render-pass memoization,
    // so the retry is a real second request.
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (response.status === 502 && (await isProviderErrorBody(response))) {
      throw new BffProviderError('BFF reported that the data provider is unavailable');
    }
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

type AttemptsResult<T> =
  { ok: true; envelope: BffEnvelope<T> } | { ok: false; url: string; lastError: unknown };

/** Runs the attempts of one read; the caller decides what a failure means. */
async function readWithRetry<T>(
  { path, isData, requireMeta = false }: BffEnvelopeOptions<T>,
  shortenAfterProviderError = false,
): Promise<AttemptsResult<T>> {
  const url = `${apiBaseUrl()}${path}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return {
        ok: true,
        envelope: await fetchEnvelope(
          url,
          isData,
          requireMeta,
          lastError,
          shortenAfterProviderError,
        ),
      };
    } catch (error) {
      lastError = error;
    }
  }

  return { ok: false, url, lastError };
}

function logFailure({ label }: BffFetchOptions<unknown>, url: string, lastError: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`${label} fetch failed after ${MAX_ATTEMPTS} attempts (${url}):`, lastError);
}

/**
 * Reads a resource from the BFF, retrying once to ride out a cold start, and
 * returns the envelope's `data` together with its `meta` (attribution).
 *
 * Throws when every attempt fails so that a page is never rendered (and never
 * cached by ISR) without data: during a revalidation Next.js keeps serving the
 * last successfully generated page.
 */
export async function fetchEnvelopeFromBff<T>(
  options: BffEnvelopeOptions<T>,
): Promise<BffEnvelope<T>> {
  const result = await readWithRetry(options);
  if (result.ok) {
    return result.envelope;
  }

  logFailure(options, result.url, result.lastError);
  throw new Error(`${options.label} could not be fetched from the BFF`, {
    cause: result.lastError,
  });
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

/** A provider-backed read: the validated payload, or the fact that the provider is down. */
export type ProviderPayloadResult<P> =
  { kind: 'ok'; payload: P } | { kind: 'provider-unavailable' };

/**
 * Like {@link fetchPayloadFromBff} for categories whose data comes from an external
 * provider. When the final attempt got the BFF's own provider `502` (no snapshot to
 * serve), it returns `provider-unavailable` so the page can render a graceful state;
 * the retry after such a `502` is requested with a short revalidation so that the
 * degraded page is regenerated within minutes. Every other failure (timeout, network
 * error, other status, an HTML `502`, a shape mismatch) throws exactly like
 * {@link fetchPayloadFromBff}, so ISR keeps the last good page and `error.tsx` stays
 * the fallback for failures of our own BFF.
 */
export async function fetchProviderPayloadFromBff<T>(
  options: BffFetchOptions<T>,
): Promise<ProviderPayloadResult<{ data: T; meta: ApiResponseMeta }>> {
  const result = await readWithRetry({ ...options, requireMeta: true }, true);

  if (result.ok) {
    const { data, meta } = result.envelope;
    if (!meta) {
      throw new Error(`${options.label} could not be fetched from the BFF`);
    }
    return { kind: 'ok', payload: { data, meta } };
  }

  logFailure(options, result.url, result.lastError);
  if (result.lastError instanceof BffProviderError) {
    return { kind: 'provider-unavailable' };
  }
  throw new Error(`${options.label} could not be fetched from the BFF`, {
    cause: result.lastError,
  });
}
