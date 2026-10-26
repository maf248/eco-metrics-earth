/**
 * Throttling environment shared by the E2E server wrapper (`run-dev-servers.ts`) and
 * `rate-limit.spec.ts`.
 *
 * The key is NOT a secret: it only exists for the locally spawned E2E API and web servers,
 * so it is committed on purpose. It must be at least 32 characters (API Joi contract).
 */
export const E2E_INTERNAL_API_KEY = 'e2e-non-secret-internal-api-key-0123456789';

/** One trusted proxy hop: the rightmost X-Forwarded-For entry identifies the client. */
export const E2E_TRUST_PROXY_HOPS = '1';

/**
 * Local stand-in for Our World in Data, so E2E never reaches the live provider.
 * The API is started with these base URLs (see `run-dev-servers.ts`).
 */
export const E2E_OWID_FIXTURE_PORT = 3999;
export const E2E_OWID_GRAPHER_BASE_URL = `http://localhost:${E2E_OWID_FIXTURE_PORT}/grapher`;
export const E2E_OWID_API_BASE_URL = `http://localhost:${E2E_OWID_FIXTURE_PORT}/v1`;
export const E2E_OWID_FIXTURE_READY_URL = `http://localhost:${E2E_OWID_FIXTURE_PORT}/`;
