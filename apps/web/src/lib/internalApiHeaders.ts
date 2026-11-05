import 'server-only';

const INTERNAL_API_KEY_HEADER = 'X-Internal-Api-Key';

/**
 * Headers for calls from the Next.js server to the API.
 *
 * When `INTERNAL_API_KEY` is set (server-only, never `NEXT_PUBLIC_`), the shared secret is sent.
 * The API requires it (`401` otherwise, except the liveness probe) and uses it to select the keyed
 * throttle tier. Without it only a local API with no key configured accepts the request. The value
 * must never be logged.
 */
export function internalApiHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY?.trim();

  return key ? { [INTERNAL_API_KEY_HEADER]: key } : {};
}
