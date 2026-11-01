# api-data-layer Specification

## Purpose

The API's outbound data layer: HTTP transport with per-attempt timeout, bounded retry and an identifiable User-Agent, in-memory response caching with configurable TTL, and OWID environment variables validated at startup.

## Requirements

### Requirement: Outbound HTTP client with timeout and identifiable User-Agent

The API SHALL provide an `OutboundHttpClient` service — registered by `OutboundHttpModule` in `apps/api/src/common/http/` — as the single outbound transport for external data providers. It SHALL expose `getText(url): Promise<string>` and `getJson(url): Promise<unknown>` (the body parsed and validated as JSON), both applying: a per-attempt timeout via `AbortSignal.timeout` driven by `OWID_HTTP_TIMEOUT_MS` (default 10 000 ms), an identifiable `User-Agent` header (`eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`), and the bounded retry policy. The response body SHALL be read inside each attempt, so the per-attempt timeout and the retry policy also cover an upstream that stalls after sending headers. A `getJson` body that is not valid JSON SHALL throw a `SyntaxError` without retry — it is not a transient failure — for the provider client to map onto its own error contract. The fetch implementation SHALL be an injectable provider token (`OUTBOUND_FETCH`) so unit tests substitute fixture-returning stubs with zero network calls.

#### Scenario: Request carries the identifiable User-Agent

- **GIVEN** any outbound request
- **WHEN** the transport invokes the injected fetch
- **THEN** the request headers include `User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`

#### Scenario: Timeout aborts the attempt

- **GIVEN** the injected fetch never resolves and `OWID_HTTP_TIMEOUT_MS` is 10 000
- **WHEN** `getText` is called
- **THEN** each attempt is aborted after the timeout and, once retries are exhausted, an `OutboundTimeoutError` carrying the request URL is thrown

#### Scenario: Body read timeout is retried

- **GIVEN** the injected fetch resolves with a 200 response whose body read times out, then with a readable 200 response
- **WHEN** `getText` is called
- **THEN** the first attempt is treated as an `OutboundTimeoutError`, retried after the backoff, and the call resolves with the second body

#### Scenario: Invalid JSON body is not retried

- **GIVEN** the injected fetch resolves with a 200 response whose body is not valid JSON
- **WHEN** `getJson` is called
- **THEN** a `SyntaxError` is thrown and the fetch was invoked exactly once

#### Scenario: Non-2xx after retries throws a typed error

- **GIVEN** the injected fetch resolves with status 503 on every attempt
- **WHEN** `getJson` is called
- **THEN** the request is retried per the retry policy and finally throws an `OutboundHttpStatusError` carrying the URL and status 503

#### Scenario: Tests run with zero network

- **WHEN** `npx nx test api` runs the `common/http` suite
- **THEN** every case uses an injected `OUTBOUND_FETCH` stub — no test performs a network call

### Requirement: Bounded retry policy for transient failures

`OutboundHttpClient` SHALL retry at most 2 times (3 attempts total) with fixed exponential backoff — 500 ms after the first failure, 1 000 ms after the second. It SHALL retry only transient failures: network errors (fetch rejection), timeouts, and HTTP 408/429/5xx responses. It SHALL NOT retry any other 4xx response, and SHALL NOT parse or honor `Retry-After`.

#### Scenario: Transient failure then success

- **GIVEN** the injected fetch resolves with status 500 once, then 200
- **WHEN** `getText` is called
- **THEN** the call succeeds and the fetch was invoked exactly 2 times

#### Scenario: Permanent client error is not retried

- **GIVEN** the injected fetch resolves with status 404
- **WHEN** `getText` is called
- **THEN** an `OutboundHttpStatusError` with status 404 is thrown immediately and the fetch was invoked exactly once

#### Scenario: Retries are exhausted

- **GIVEN** the injected fetch resolves with status 500 on every attempt
- **WHEN** `getText` is called
- **THEN** the fetch was invoked exactly 3 times and the final `OutboundHttpStatusError` propagates

#### Scenario: Backoff delays are deterministic

- **GIVEN** fake timers and two consecutive transient failures
- **WHEN** the retry sequence runs
- **THEN** the delays before the second and third attempts are exactly 500 ms and 1 000 ms

### Requirement: In-memory response caching with configurable TTL

The API SHALL cache outbound provider responses in memory using `@nestjs/cache-manager` with cache-manager v6's built-in memory store — no store package, no database. The cache SHALL be registered module-scoped inside `OwidModule` via `CacheModule.registerAsync` with a TTL of `OWID_CACHE_TTL_SECONDS` seconds (default 86 400 = 24 h), converted to milliseconds in the factory (cache-manager v6 TTL is in milliseconds). Cached values SHALL be the parsed payloads, and the owning client SHALL return deep copies (`structuredClone`) so consumers cannot mutate cached data through returned references.

#### Scenario: Second call within TTL is served from cache

- **GIVEN** a provider method was called once and its parsed result cached
- **WHEN** the same method is called again with the same parameters within the TTL
- **THEN** the cached payload is returned and the transport is not invoked again

#### Scenario: Cache miss populates and reuses

- **GIVEN** no cached entry for a request
- **WHEN** the method is called
- **THEN** the transport is invoked once, the parsed result is stored under the cache key, and the returned value equals the subsequently cached value

#### Scenario: Consumer mutation cannot corrupt the cache

- **GIVEN** a cached parsed payload
- **WHEN** a consumer mutates the object returned by a cache hit
- **THEN** a subsequent call for the same key returns the unmutated payload

#### Scenario: TTL is configurable via env

- **GIVEN** `OWID_CACHE_TTL_SECONDS` is set to a custom value (e.g. 3600)
- **WHEN** the API bootstraps
- **THEN** the cache TTL is that many seconds — the factory converts it to milliseconds for cache-manager

#### Scenario: No database

- **GIVEN** any configuration
- **THEN** the cache is in-memory only — no database and no persistence layer (a data layer stays in the backlog)

### Requirement: OWID environment variables validated at startup

The Joi env-validation schema SHALL validate four new variables, each with a default: `OWID_GRAPHER_BASE_URL` (valid URI without a trailing slash; default `https://ourworldindata.org/grapher`), `OWID_API_BASE_URL` (valid URI without a trailing slash; default `https://api.ourworldindata.org/v1`), `OWID_HTTP_TIMEOUT_MS` (integer between 1 000 and 60 000; default 10 000), and `OWID_CACHE_TTL_SECONDS` (integer between 60 and 604 800; default 86 400). `AppConfigService` SHALL expose them as typed getters — `owidGrapherBaseUrl`, `owidApiBaseUrl`, `owidHttpTimeoutMs`, `owidCacheTtlSeconds` — and SHALL be importable by feature modules through a new `@Global()` `AppConfigModule` that provides and exports it, with `AppModule` importing the module instead of providing the service directly.

#### Scenario: Defaults apply when variables are absent

- **WHEN** the API starts with none of the four `OWID_*` variables set
- **THEN** the four getters return the documented defaults and the API starts successfully

#### Scenario: Invalid base URL fails startup

- **WHEN** `OWID_API_BASE_URL` is set to a non-URI value (e.g. `not-a-url`)
- **THEN** the Joi validation throws at startup and the API does not start

#### Scenario: Trailing slash in a base URL fails startup

- **WHEN** `OWID_GRAPHER_BASE_URL` is set to `https://ourworldindata.org/grapher/`
- **THEN** the Joi validation throws at startup with an error explaining that a trailing slash would produce broken request URLs

#### Scenario: Out-of-bounds numeric values fail startup

- **WHEN** `OWID_HTTP_TIMEOUT_MS` is set to `100` or `OWID_CACHE_TTL_SECONDS` is set to `1`
- **THEN** the Joi validation throws at startup and the API does not start

#### Scenario: Feature module injects AppConfigService

- **GIVEN** the `@Global()` `AppConfigModule` imported by `AppModule`
- **WHEN** `OwidModule` (or its `CacheModule.registerAsync` factory) injects `AppConfigService`
- **THEN** the typed getters resolve without a circular module import
