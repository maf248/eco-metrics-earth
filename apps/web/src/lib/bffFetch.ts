import 'server-only';

import { apiBaseUrl } from '@/lib/apiBaseUrl';
import { internalApiHeaders } from '@/lib/internalApiHeaders';

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

async function fetchData<T>(url: string, isData: BffFetchOptions<T>['isData']): Promise<T> {
  const response = await fetch(url, {
    headers: internalApiHeaders(),
    next: { revalidate: 86400 },
    // A per-attempt signal also opts the request out of render-pass memoization,
    // so the retry is a real second request.
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`BFF responded with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { success?: unknown; data?: unknown } | null;

  if (payload?.success !== true || !isData(payload.data)) {
    throw new Error('BFF payload does not match the expected response shape');
  }

  return payload.data;
}

/**
 * Reads a resource from the BFF, retrying once to ride out a cold start.
 *
 * Throws when every attempt fails so that a page is never rendered (and never
 * cached by ISR) without data: during a revalidation Next.js keeps serving the
 * last successfully generated page.
 */
export async function fetchFromBff<T>({ path, label, isData }: BffFetchOptions<T>): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchData(url, isData);
    } catch (error) {
      lastError = error;
    }
  }

  // eslint-disable-next-line no-console
  console.error(`${label} fetch failed after ${MAX_ATTEMPTS} attempts (${url}):`, lastError);
  throw new Error(`${label} could not be fetched from the BFF`, { cause: lastError });
}
