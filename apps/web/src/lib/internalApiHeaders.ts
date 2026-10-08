import 'server-only';

const INTERNAL_API_KEY_HEADER = 'X-Internal-Api-Key';

/**
 * Headers for calls from the Next.js server to the API.
 *
 * When `INTERNAL_API_KEY` is set (server-only, never `NEXT_PUBLIC_`), the shared secret is sent
 * so the API can skip per-IP throttling for this trusted consumer. Without it the API simply
 * rate-limits the request per client IP. The value must never be logged.
 */
export function internalApiHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY?.trim();

  return key ? { [INTERNAL_API_KEY_HEADER]: key } : {};
}
