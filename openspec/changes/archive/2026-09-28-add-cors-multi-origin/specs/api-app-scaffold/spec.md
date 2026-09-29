## MODIFIED Requirements

### Requirement: Existing API behavior preserved on NestJS 12 (regression-proofing)

The API SHALL exhibit identical observable behavior on NestJS 12 as on NestJS 11 for all existing endpoints and cross-cutting concerns: the health check, 404 handling, DTO validation, security headers (helmet), the global rate-limiting guard, and the OpenAPI document. No request/response body contract changes. (CORS header behavior was subsequently changed by the multi-origin CORS change and is owned by the `api-security-hardening` capability: `Access-Control-Allow-Origin` is emitted only for requests whose `Origin` matches an allowed origin.)

#### Scenario: Health, 404, and validation contracts unchanged

- **WHEN** the existing unit tests (`npx nx test api`) and the E2E API specs (`apps/web/e2e/api-health.spec.ts`) run against the NestJS 12 app
- **THEN** all pass with zero errors and zero warnings — health 200 `{ "status": "ok" }`, unknown routes 404 JSON, invalid POST body 400 with `error`, query echo 200

#### Scenario: CORS and security headers unchanged

- **WHEN** any API response is received (success or error)
- **THEN** the helmet security headers are present on every response, and `Access-Control-Allow-Origin` is present exactly when the request's `Origin` header matches an allowed origin (per `api-security-hardening`) — reflecting the request's own origin

#### Scenario: Rate-limiting guard remains active with the updated throttler

- **GIVEN** the global `ThrottlerGuard` registered as `APP_GUARD` with `@nestjs/throttler` 6.7.1 (peer range declares NestJS 12 since 6.7.1 — pin retired)
- **WHEN** requests flow through the API (every bootstrap-test request and every E2E API request passes through the global guard)
- **THEN** requests within the 60/60s window receive normal responses and the guard produces no errors — the `api-security-hardening` rate-limit requirement keeps holding without code changes

#### Scenario: Rate limiting returns 429 after exceeding the request budget

- **GIVEN** the API running on NestJS 12 with the global `ThrottlerGuard` active (`@nestjs/throttler` 6.7.1 — pin retired, 60 requests / 60 s TTL per tracker)
- **WHEN** more than the configured request budget is sent to a single endpoint within the TTL window (direct rate-limit test: E2E hammering or unit test with a small-limit `ThrottlerModule`)
- **THEN** the API responds **429** for the excess requests, with the throttler payload (`statusCode: 429`, `message: "ThrottlerException: Too Many Requests"` — exact shape re-verified empirically at implementation) and a `Retry-After` header
- **AND** rate limiting remains active after the NestJS 12 upgrade — the 429 path is proven directly, not only inferred from pass-through traffic
