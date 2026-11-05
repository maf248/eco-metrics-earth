## ADDED Requirements

### Requirement: API rejects requests without a valid internal key

A global guard (`InternalKeyGuard`) SHALL reject with `401` every request that lacks an `X-Internal-Api-Key` header equal to `INTERNAL_API_KEY`, on every route including unknown paths, except routes marked `@AllowKeyless()`. The comparison SHALL be constant-time and SHALL NOT throw on a different length. The `401` response SHALL NOT reveal whether the key was missing or wrong and SHALL NOT echo any value; the key SHALL never be logged. When `INTERNAL_API_KEY` is not configured (possible only outside production) the guard SHALL allow every request.

#### Scenario: Missing or wrong key is rejected

- **GIVEN** `INTERNAL_API_KEY` configured
- **WHEN** a client calls a category route without the header, with a wrong key, with a key of a different length, or with the header twice
- **THEN** every response is `401` and no key value appears in the body

#### Scenario: Valid key is served

- **GIVEN** `INTERNAL_API_KEY` configured
- **WHEN** a client calls a category route, `GET /api/v1/data-sources` or `GET /api/v1/health/dependencies` with the valid key
- **THEN** the route's normal response is returned

#### Scenario: Unknown path without a key

- **WHEN** a client without the key calls a path that does not exist
- **THEN** the response is `401`, not `404`

#### Scenario: No key configured outside production

- **GIVEN** `NODE_ENV` is `development` or `test` and `INTERNAL_API_KEY` is unset
- **WHEN** a client calls any route without the header
- **THEN** the request is served normally

### Requirement: Liveness probe stays reachable without a key

`HealthController.check()` (`GET /api/v1/health`) SHALL be the only route marked `@AllowKeyless()` and SHALL be exempt from every throttler (`@SkipThrottle({ default: true, anonymous: true })`). `GET /api/v1/health/dependencies` SHALL require the key.

#### Scenario: Probe works without a key and without limits

- **GIVEN** `INTERNAL_API_KEY` configured
- **WHEN** a client without the key sends more requests to `GET /api/v1/health` than the anonymous limit in one window
- **THEN** every response is `200` with `{ "status": "ok" }`

#### Scenario: Dependencies health requires the key

- **WHEN** a client calls `GET /api/v1/health/dependencies` without the key
- **THEN** the response is `401` and no provider is called

### Requirement: Rate limiting has two tiers selected by the key check

The global `ThrottlerGuard` SHALL use two named throttlers, both `ttl: 60_000`, tracked by the real client IP and counted independently: `default` with `limit: 300` for keyed requests and `anonymous` with `limit: 30` for the others. A request is keyed when it carries a valid key or when no `INTERNAL_API_KEY` is configured; each throttler SHALL skip the other tier's requests. `ThrottlerGuard` SHALL be registered before `InternalKeyGuard`.

#### Scenario: Anonymous tier

- **GIVEN** `INTERNAL_API_KEY` configured and a client without the key
- **WHEN** it sends 31 requests to a non-health route within 60 seconds
- **THEN** the first 30 receive `401` and the 31st receives `429`

#### Scenario: Keyed tier

- **WHEN** a client with the valid key sends 301 requests to a throttled route within 60 seconds
- **THEN** the first 300 are served and the 301st receives `429`

#### Scenario: Tiers are independent

- **GIVEN** an IP that exhausted the anonymous limit
- **WHEN** the same IP sends a request with the valid key
- **THEN** it is served normally

#### Scenario: Forged forwarded entries do not evade the anonymous tier

- **GIVEN** `trust proxy` = 1 and a client that exhausted the anonymous limit
- **WHEN** it varies a forged leftmost `X-Forwarded-For` entry on each request
- **THEN** every request receives `429`

### Requirement: INTERNAL_API_KEY is required at startup in production

The Joi schema SHALL require `INTERNAL_API_KEY` (string, minimum 32 characters) when `NODE_ENV=production`, failing at boot with a message that names the variable and never includes a value. Outside production it SHALL remain optional (empty string treated as unset).

#### Scenario: Production without a valid key does not start

- **GIVEN** `NODE_ENV=production`
- **WHEN** `INTERNAL_API_KEY` is unset, empty, or shorter than 32 characters
- **THEN** validation fails and the API does not start

#### Scenario: Development and test do not require the key

- **GIVEN** `NODE_ENV` is `development` or `test`
- **WHEN** `INTERNAL_API_KEY` is unset
- **THEN** validation passes

### Requirement: Swagger cannot be enabled in production

Swagger UI registers raw Express handlers that bypass global guards, so the Joi schema SHALL reject `SWAGGER_ENABLED=true` when `NODE_ENV=production`, failing at boot with a message that names the variable and never includes a value.

#### Scenario: Swagger enabled in production does not start

- **GIVEN** `NODE_ENV=production`
- **WHEN** `SWAGGER_ENABLED` is `true`
- **THEN** validation fails and the API does not start

## MODIFIED Requirements

### Requirement: API enforces global rate limiting

The API SHALL apply a global rate-limiting guard using `@nestjs/throttler` with the two tiers defined in "Rate limiting has two tiers selected by the key check" (`default`: 300 requests per 60 seconds for keyed requests; `anonymous`: 30 per 60 seconds for the rest), per **real client** IP address (see "Throttler identifies clients by the real client IP"), across all routes — **except the health endpoint**: `HealthController.check()` (`GET /api/v1/health`) SHALL be exempt via `@SkipThrottle({ default: true, anonymous: true })`, so infrastructure probes are never throttled. The exemption exists because platform health probes must always get an answer: the Cloud Run startup probe polls `/api/v1/health` during instance boot, and the E2E readiness gate polls it while bringing servers up — a `429` from either would be a false negative. The limits are per instance (see "Rate limit storage is per-instance in-memory").

#### Scenario: Requests within limit are allowed

- **WHEN** a client with the valid key sends 300 or fewer requests within a 60-second window to any non-health route
- **THEN** all requests receive normal responses (2xx or expected status)

#### Scenario: Requests exceeding limit are rejected

- **WHEN** a client with the valid key sends more than 300 requests within a 60-second window to any non-health route
- **THEN** the 301st request receives a `429 Too Many Requests` response

#### Scenario: Rate limit is applied globally without per-route configuration

- **WHEN** the ThrottlerGuard is registered as an APP_GUARD provider in AppModule
- **THEN** all existing and future routes are rate-limited without requiring per-route decorators

#### Scenario: Health endpoint is exempt from rate limiting

- **GIVEN** a NestJS app with the two-tier throttler configured with small limits and the global `ThrottlerGuard`, using the real `HealthController`
- **WHEN** a client sends more requests than either limit within the window to `GET /health`
- **THEN** every request receives `200` with `{ "status": "ok" }` — none receive `429`

#### Scenario: Infrastructure probes are never throttled

- **GIVEN** the deployed API on Cloud Run with the startup probe polling `GET /api/v1/health` (and the E2E webServer readiness gate doing the same locally)
- **WHEN** probe traffic arrives in bursts within the throttle window
- **THEN** every probe response is `200` — the probe can never observe a `429`-induced false unhealthy state

#### Scenario: Health stays exempt with proxy hops and bypass configured

- **GIVEN** `trust proxy` = 1 and `INTERNAL_API_KEY` configured
- **WHEN** a client without the key sends more than the anonymous limit to `GET /health` with a forged `X-Forwarded-For`
- **THEN** every request receives `200`

#### Scenario: The production limit values are unchanged

- **WHEN** `AppModule` configures the throttler
- **THEN** it has exactly two entries: `default` with `ttl: 60_000`, `limit: 300` and `anonymous` with `ttl: 60_000`, `limit: 30`

### Requirement: Rate limit storage is per-instance in-memory (accepted limitation)

The throttler SHALL keep the default in-memory storage; no Redis or shared store SHALL be introduced. Both tiers are therefore enforced **per Cloud Run instance**: the effective limit per client scales with the number of running instances (and resets when an instance is recycled or scales to zero). This is accepted because the service runs with a hard instance cap and scale-to-zero, anonymous callers are rejected with `401` anyway, and the limits are abuse mitigation, not a security boundary or billing quota. Documentation (README, runbook) SHALL state this caveat.

#### Scenario: Caveat is documented

- **WHEN** `apps/api/README.md` and `docs/deploy/cloud-run.md` are read
- **THEN** both state that the limits (300 keyed / 30 anonymous per 60 s) are per instance and in-memory

## REMOVED Requirements

### Requirement: Trusted first-party traffic may bypass throttling with a shared secret header

**Reason**: The key is now mandatory for every non-probe request and selects the generous throttling tier; header name, constant-time comparison, 32-character minimum and never-logged rule carry over into the new requirements.

**Migration**: The Next.js server already sends `X-Internal-Api-Key`; no caller change. A missing or wrong header now means `401` (or `429` over the anonymous limit) instead of per-IP throttling.
