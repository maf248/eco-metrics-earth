import { apiBaseUrl } from '@/lib/apiBaseUrl';
import { internalApiHeaders } from '@/lib/internalApiHeaders';
import type { WaterFootprintProduct } from '@eco-metrics/shared';

// A Cloud Run cold start takes several seconds: the first attempt wakes the
// instance and the second one finds it ready, so no delay is needed between them.
const MAX_ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 10_000;

interface WaterFootprintSuccessResponse {
  success: true;
  data: WaterFootprintProduct[];
}

function isWaterFootprintResponse(value: unknown): value is WaterFootprintSuccessResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { success?: unknown; data?: unknown };
  return candidate.success === true && Array.isArray(candidate.data);
}

async function fetchProducts(url: string): Promise<WaterFootprintProduct[]> {
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

  const payload: unknown = await response.json();

  if (!isWaterFootprintResponse(payload)) {
    throw new Error('BFF payload does not match the water-footprint response shape');
  }

  return payload.data;
}

/**
 * Fetches the full water-footprint dataset from the BFF.
 *
 * Throws when every attempt fails so that the page is never rendered (and never
 * cached by ISR) without data: during a revalidation Next.js keeps serving the
 * last successfully generated page.
 */
export async function getWaterFootprintProducts(): Promise<WaterFootprintProduct[]> {
  const url = `${apiBaseUrl()}/water-footprint/products`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchProducts(url);
    } catch (error) {
      lastError = error;
    }
  }

  // eslint-disable-next-line no-console
  console.error(`Water footprint fetch failed after ${MAX_ATTEMPTS} attempts (${url}):`, lastError);
  throw new Error('Water footprint data could not be fetched from the BFF', { cause: lastError });
}
