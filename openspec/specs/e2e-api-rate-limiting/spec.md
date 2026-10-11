# e2e-api-rate-limiting Specification

## Purpose

Defines the Playwright E2E coverage for API rate limiting: per-client buckets keyed on the real client IP behind the configured proxy hops, resistance to forged `X-Forwarded-For` entries, and the internal-key bypass.

## Requirements

### Requirement: E2E proves client identification and bypass against the real API

A Playwright spec `apps/web/e2e/rate-limit.spec.ts` (using `test(...)`) SHALL exercise the locally started API (not tagged `@smoke`, runs in the `chromium-desktop` project only) with `TRUST_PROXY_HOPS=1` and the fixed E2E `INTERNAL_API_KEY` constant. Each test SHALL use its own unique documentation-range IP (RFC 5737: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`) as the rightmost `X-Forwarded-For` entry so tests never share a bucket with each other or with the rest of the suite (which uses the loopback bucket). Tests SHALL hit a throttled route that is read-only, free of side effects, and governed by the global default throttle limit (60 requests per 60 seconds) with no per-route throttle override and no `@SkipThrottle`. The current route is `GET /api/v1/water-footprint/products`. The spec file SHALL define that URL in exactly one constant, used by every throttled request and by the precondition probe, so switching routes later is a one-line change. The test outcome SHALL NOT depend on the route's response payload size or on response caching: it asserts only status codes (and the `x-ratelimit-remaining` header in the precondition probe).

#### Scenario: Different X-Forwarded-For clients are limited independently

- **GIVEN** the API running with `TRUST_PROXY_HOPS=1`
- **WHEN** client A sends 61 requests with `X-Forwarded-For: <ipA>`
- **THEN** the 61st receives `429`
- **AND** a request with `X-Forwarded-For: <ipB>` receives `200`

#### Scenario: Forged leftmost entry does not evade the limit

- **GIVEN** client A has exhausted its limit
- **WHEN** A sends `X-Forwarded-For: <random-ip>, <ipA>` with a different forged value on each request
- **THEN** every request receives `429`

#### Scenario: Valid internal key bypasses the limit

- **WHEN** a client sends 70 requests with `X-Internal-Api-Key` set to the E2E key
- **THEN** none receive `429`

#### Scenario: Wrong or missing key is throttled

- **WHEN** a client sends 61 requests with a wrong `X-Internal-Api-Key`, and another with no header
- **THEN** the 61st request of each receives `429`

#### Scenario: Health stays exempt

- **WHEN** a client exhausts its limit and then calls `GET /api/v1/health`
- **THEN** the health response is `200`

#### Scenario: Misconfigured (adopted) API fails with an actionable message

- **GIVEN** an API adopted by the wrapper that was started without `TRUST_PROXY_HOPS=1` / the E2E key
- **WHEN** the spec's precondition probe (`beforeAll`) detects that distinct `X-Forwarded-For` values share a counter
- **THEN** the spec fails with a message telling the developer to stop the running API or export `TRUST_PROXY_HOPS=1` and `INTERNAL_API_KEY=<E2E key>` — it never silently skips

#### Scenario: Throttled route is defined by a single constant

- **GIVEN** the rate-limit spec file
- **WHEN** it is inspected
- **THEN** the throttled URL appears in one constant that resolves to `${API_BASE_URL}/water-footprint/products`
- **AND** no other URL literal for a throttled route exists in the file
