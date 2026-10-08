# api-security-hardening Specification

## Purpose

Defines the API's baseline security hardening: standard HTTP security headers on every response via `helmet`, a `CORS_ORIGIN` variable validated at startup through the AppModule Joi schema (rejecting non-URI and wildcard values, defaulting to the local origin) and read from `AppConfigService` at bootstrap, and global per-IP rate limiting (60 requests / 60 seconds) via `@nestjs/throttler`. The health endpoint is exempt from the throttler — `@SkipThrottle()` on `HealthController.check()` — so infrastructure probes (the Cloud Run startup probe and the E2E readiness gate) always get an answer and are never throttled.

## Requirements

### Requirement: API emits HTTP security headers on all responses

The NestJS API SHALL use the `helmet` middleware to set standard HTTP security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Strict-Transport-Security) on every response.

#### Scenario: Health endpoint includes security headers

- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response includes `X-Content-Type-Options: nosniff`
- **THEN** the response includes `X-Frame-Options` header
- **THEN** the response includes `Referrer-Policy` header

### Requirement: CORS_ORIGIN is validated at startup via Joi schema

The API SHALL validate the `CORS_ORIGIN` environment variable through the AppModule Joi schema as a **comma-separated list of exact origins**. Every entry (after trimming surrounding whitespace) MUST be a valid URI. The schema MUST reject entries that are not URIs, entries containing `*` (wildcards — with an error pointing the operator to `CORS_ORIGIN_PATTERN` for pattern-based origins), and empty entries (leading/trailing/doubled commas, or a wholly empty value). A single origin remains a valid one-entry list (backward compatible). If `CORS_ORIGIN` is absent from the environment, the schema SHALL default to `'http://localhost:3000'`.

#### Scenario: API starts with valid CORS_ORIGIN

- **WHEN** `CORS_ORIGIN` is set to a single valid URI (e.g., `https://eco-metrics.earth`)
- **THEN** the API starts successfully and allows exactly that origin (a single origin is a valid one-entry list — backward compatible)

#### Scenario: API starts with a comma-separated list of valid origins

- **WHEN** `CORS_ORIGIN` is set to `http://localhost:3000,https://eco-metrics.earth`
- **THEN** the API starts successfully and allows both origins (whitespace around commas is tolerated)

#### Scenario: API fails fast with invalid CORS_ORIGIN

- **WHEN** `CORS_ORIGIN` is set to a value with any entry that is not a URI (e.g., `http://localhost:3000,not-a-url`)
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: API fails fast on wildcard entries

- **WHEN** `CORS_ORIGIN` is set to `https://*.vercel.app`
- **THEN** the API process throws a validation error at startup whose message points the operator to `CORS_ORIGIN_PATTERN` for pattern-based origins

#### Scenario: API fails fast on empty entries

- **WHEN** `CORS_ORIGIN` is set to a value with a trailing comma, doubled commas, or an empty string
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: API uses default when CORS_ORIGIN is absent

- **WHEN** `CORS_ORIGIN` is not set in the environment
- **THEN** the API starts and allows `http://localhost:3000` (a one-entry list)

### Requirement: CORS_ORIGIN is read from AppConfigService

The `main.ts` bootstrap function SHALL read the allowed CORS origins from `AppConfigService` — a getter returning the parsed `CORS_ORIGIN` entries as strings plus the compiled `CORS_ORIGIN_PATTERN` as a `RegExp` when one is set — instead of accessing `process.env` directly, and SHALL pass that array to `enableCors({ origin })`.

#### Scenario: Bootstrap reads validated CORS origin

- **GIVEN** `CORS_ORIGIN` set to `http://localhost:3000,https://eco-metrics.earth` and no pattern
- **WHEN** the NestJS app bootstraps
- **THEN** `enableCors` is called with `origin` set to the array `['http://localhost:3000', 'https://eco-metrics.earth']`

#### Scenario: Bootstrap includes the compiled pattern in the origins array

- **GIVEN** `CORS_ORIGIN_PATTERN` set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **WHEN** the NestJS app bootstraps
- **THEN** `enableCors` is called with an `origin` array that also contains a `RegExp` matching that pattern

### Requirement: API enforces global rate limiting

The API SHALL apply a global rate-limiting guard that allows at most 60 requests per 60 seconds per **real client** IP address (see "Throttler identifies clients by the real client IP") across all routes, using `@nestjs/throttler` — **except the health endpoint**: `HealthController.check()` (`GET /api/v1/health`) SHALL be exempt from rate limiting via the `@SkipThrottle()` decorator, so infrastructure probes are never throttled. The exemption exists because platform health probes must always get an answer: the Cloud Run startup probe polls `/api/v1/health` during instance boot, and the E2E readiness gate polls it while bringing servers up — a `429` from either would be a false negative (instance judged unhealthy / servers judged not ready). Requests presenting a valid `X-Internal-Api-Key` are additionally exempt (see "Trusted first-party traffic may bypass throttling with a shared secret header"). The limit is per instance (see "Rate limit storage is per-instance in-memory").

#### Scenario: Requests within limit are allowed

- **WHEN** a client sends 60 or fewer requests within a 60-second window to any non-health route
- **THEN** all requests receive normal responses (2xx or expected status)

#### Scenario: Requests exceeding limit are rejected

- **WHEN** a client sends more than 60 requests within a 60-second window to any non-health route
- **THEN** the 61st request receives a `429 Too Many Requests` response

#### Scenario: Rate limit is applied globally without per-route configuration

- **WHEN** the ThrottlerGuard is registered as an APP_GUARD provider in AppModule
- **THEN** all existing and future routes are rate-limited without requiring per-route decorators

#### Scenario: Health endpoint is exempt from rate limiting

- **GIVEN** a NestJS app with `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])` and the global `ThrottlerGuard` (`APP_GUARD`), using the real `HealthController`
- **WHEN** a client sends more than 3 requests within the window to `GET /health`
- **THEN** every request receives `200` with `{ "status": "ok" }` — none receive `429`

#### Scenario: Infrastructure probes are never throttled

- **GIVEN** the deployed API on Cloud Run with the startup probe polling `GET /api/v1/health` (and the E2E webServer readiness gate doing the same locally)
- **WHEN** probe traffic arrives in bursts within the throttle window
- **THEN** every probe response is `200` — the probe can never observe a `429`-induced false unhealthy state

#### Scenario: Health stays exempt with proxy hops and bypass configured

- **GIVEN** `trust proxy` = 1 and `INTERNAL_API_KEY` configured
- **WHEN** a client without the key sends more than the limit to `GET /health` with a forged `X-Forwarded-For`
- **THEN** every request receives `200`

#### Scenario: The production limit values are unchanged

- **WHEN** `AppModule` configures the throttler
- **THEN** the single throttler entry is `ttl: 60_000`, `limit: 60`

### Requirement: CORS_ORIGIN_PATTERN is validated at startup and compiled to an anchored RegExp

The API SHALL support an optional `CORS_ORIGIN_PATTERN` environment variable: a single regular expression matched against the request `Origin` header, for origin families that cannot be enumerated exactly (e.g., Vercel preview URLs of the form `https://<project>-<hash>-<scope>.vercel.app`). When set to a non-empty value, it MUST be anchored (begin with `^` and end with `$`) and MUST compile as a JavaScript `RegExp`; the Joi schema SHALL reject unanchored or non-compiling values at startup. When absent or empty, no pattern applies (exact origins only).

#### Scenario: API starts with an anchored, compiling pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **THEN** the API starts successfully and origins matching the pattern are allowed

#### Scenario: API fails fast with an unanchored pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `https://.*\.vercel\.app` (no `^`/`$` anchors)
- **THEN** the API process throws a validation error at startup demanding explicit `^`...`$` anchors and does not start

#### Scenario: API fails fast with a non-compiling pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `^https://([unbalanced\.vercel\.app$`
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: Absent or empty pattern means exact origins only

- **WHEN** `CORS_ORIGIN_PATTERN` is not set or is set to an empty string
- **THEN** the API starts and only the `CORS_ORIGIN` exact origins are allowed

### Requirement: CORS reflects matched origins and omits the header for unknown origins

With the allowed origins configured as an array (exact strings plus the optional pattern), the API SHALL emit `Access-Control-Allow-Origin` on a response only when the request carries an `Origin` header that matches an exact origin or the pattern — reflecting the request's own origin in the header value. Requests without an `Origin` header, or with an origin that matches nothing, SHALL receive no `Access-Control-Allow-Origin` header; the browser's same-origin policy then blocks any cross-origin read. This replaces the previous fixed-string behavior in which the header was emitted unconditionally on every response.

#### Scenario: Request with an Origin matching an exact entry

- **GIVEN** `CORS_ORIGIN` set to `http://localhost:3000,https://eco-metrics.earth`
- **WHEN** a request with `Origin: https://eco-metrics.earth` hits any API route
- **THEN** the response includes `Access-Control-Allow-Origin: https://eco-metrics.earth`

#### Scenario: Request with an Origin matching the pattern (Vercel preview URL)

- **GIVEN** `CORS_ORIGIN_PATTERN` set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **WHEN** a request with `Origin: https://eco-metrics-earth-abc123-some-scope.vercel.app` hits any API route
- **THEN** the response includes `Access-Control-Allow-Origin` reflecting that preview origin

#### Scenario: Request with an unknown Origin gets no CORS header

- **GIVEN** any allowed-origins configuration
- **WHEN** a request with `Origin: https://evil.example` hits any API route
- **THEN** the response includes no `Access-Control-Allow-Origin` header

#### Scenario: Request without an Origin header gets no CORS header

- **GIVEN** any allowed-origins configuration
- **WHEN** a request without an `Origin` header (e.g., curl, infrastructure health probes) hits any API route
- **THEN** the response includes no `Access-Control-Allow-Origin` header

### Requirement: TRUST_PROXY_HOPS is validated at startup and applied as the Express trust proxy setting

The API SHALL support a `TRUST_PROXY_HOPS` environment variable validated by the AppModule Joi schema as a **non-negative integer** with default `0`. `AppConfigService` SHALL expose it as `trustProxyHops: number`. `main.ts` SHALL create the app as a `NestExpressApplication` and call `app.set('trust proxy', appConfig.trustProxyHops)` before `app.listen`. The API SHALL NEVER set `trust proxy` to `true` or to any value other than the validated hop count. With `0`, Express ignores `X-Forwarded-For` and `req.ip` is the socket address (local development behavior).

#### Scenario: Default is zero hops

- **GIVEN** `TRUST_PROXY_HOPS` is not set
- **WHEN** the API starts
- **THEN** `AppConfigService.trustProxyHops` is `0` and `trust proxy` is set to `0`

#### Scenario: Valid hop count is applied

- **GIVEN** `TRUST_PROXY_HOPS=1`
- **WHEN** the NestJS app bootstraps
- **THEN** `app.set('trust proxy', 1)` is called with the number `1` (not a string, not `true`)

#### Scenario: Invalid hop count fails fast

- **WHEN** `TRUST_PROXY_HOPS` is set to `-1`, `1.5`, `abc`, or `true`
- **THEN** the API throws a validation error at startup and does not start

### Requirement: Throttler identifies clients by the real client IP

The global `ThrottlerGuard` SHALL continue to key on `req.ip` (the default `getTracker`). Because `trust proxy` is set to the configured hop count, `req.ip` SHALL be the client address as seen by the trusted proxies: with `TRUST_PROXY_HOPS=1`, the **rightmost** `X-Forwarded-For` entry (the one appended by the first trusted hop). Entries to its left are client-supplied and SHALL NOT influence the bucket.

#### Scenario: Different clients get different buckets

- **GIVEN** an app with `trust proxy` = 1 and a throttler limit of 3
- **WHEN** client A (`X-Forwarded-For: 203.0.113.10`) exhausts its 3 requests and then sends a 4th
- **THEN** the 4th request from A receives `429`
- **AND** a request from client B (`X-Forwarded-For: 203.0.113.11`) still receives `200`

#### Scenario: A forged extra leftmost entry does not change the bucket

- **GIVEN** `trust proxy` = 1 and client A has exhausted its limit with `X-Forwarded-For: 203.0.113.10`
- **WHEN** client A sends `X-Forwarded-For: 198.51.100.77, 203.0.113.10` (forged leftmost entry, real entry rightmost)
- **THEN** the request still receives `429` (same bucket)
- **AND** rotating the forged leftmost value on each request never yields a fresh bucket

#### Scenario: Forwarded header is ignored with zero hops

- **GIVEN** `trust proxy` = 0
- **WHEN** two requests carry different `X-Forwarded-For` values
- **THEN** both are counted in the same bucket (the socket address)

### Requirement: Trusted first-party traffic may bypass throttling with a shared secret header

The API SHALL support an optional `INTERNAL_API_KEY` environment variable (Joi: string, minimum 32 characters when set; empty string treated as unset). `AppConfigService` SHALL expose it as `internalApiKey: string | undefined`. The API SHALL skip throttling for a request if and only if `INTERNAL_API_KEY` is configured AND the request carries an `X-Internal-Api-Key` header equal to it. The comparison SHALL be constant-time (`crypto.timingSafeEqual`, guarding differing byte lengths without throwing). The bypass SHALL be implemented through the throttler's own extension point (`ThrottlerModule.forRootAsync` `skipIf`), keeping `ThrottlerGuard` as the global `APP_GUARD`. A missing or wrong header SHALL NOT produce `401`/`403`; the request is limited normally per client IP. The key value SHALL never be logged or echoed in any response.

#### Scenario: Valid key bypasses the limit

- **GIVEN** `INTERNAL_API_KEY` configured and a throttler limit of 3
- **WHEN** a client sends 10 requests with `X-Internal-Api-Key` equal to the key
- **THEN** every request receives `200` and none receive `429`

#### Scenario: Wrong key is throttled normally

- **GIVEN** `INTERNAL_API_KEY` configured and a limit of 3
- **WHEN** a client sends 4 requests with a wrong `X-Internal-Api-Key` (including one of different length)
- **THEN** the first 3 receive `200` and the 4th receives `429` (no exception thrown by the comparison)

#### Scenario: Missing key is throttled normally

- **GIVEN** `INTERNAL_API_KEY` configured and a limit of 3
- **WHEN** a client sends 4 requests without the header
- **THEN** the 4th receives `429`

#### Scenario: No bypass is possible when the key is not configured

- **GIVEN** `INTERNAL_API_KEY` unset or empty
- **WHEN** a client sends more than the limit with `X-Internal-Api-Key: ` (empty) or any value
- **THEN** requests beyond the limit receive `429`

#### Scenario: Short key is rejected at startup

- **WHEN** `INTERNAL_API_KEY` is set to a value shorter than 32 characters
- **THEN** the API throws a validation error at startup (message does not include the value) and does not start

#### Scenario: Secret is never logged

- **WHEN** the API starts and serves requests with and without a valid key
- **THEN** no log line or response body contains the key value

### Requirement: Rate limit storage is per-instance in-memory (accepted limitation)

The throttler SHALL keep the default in-memory storage; no Redis or shared store SHALL be introduced. The limit is therefore enforced **per Cloud Run instance**: the effective global limit per client scales with the number of running instances (and resets when an instance is recycled or scales to zero). This is accepted because the service runs with a small instance ceiling and scale-to-zero, the dataset is public and static, the first-party consumer bypasses the limit anyway, and the limit is abuse mitigation (cost/noise), not a security boundary or billing quota. Documentation (README, runbook) SHALL state this caveat.

#### Scenario: Caveat is documented

- **WHEN** `apps/api/README.md` and `docs/deploy/cloud-run.md` are read
- **THEN** both state that the 60 req / 60 s limit is per instance and in-memory
