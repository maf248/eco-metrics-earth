# api-security-hardening Specification

## MODIFIED Requirements

### Requirement: API enforces global rate limiting

The API SHALL apply a global rate-limiting guard that allows at most 60 requests per 60 seconds per IP address across all routes, using `@nestjs/throttler` — **except the health endpoint**: `HealthController.check()` (`GET /api/v1/health`) SHALL be exempt from rate limiting via the `@SkipThrottle()` decorator, so infrastructure probes are never throttled. The exemption exists because platform health probes must always get an answer: the Cloud Run startup probe polls `/api/v1/health` during instance boot, and the E2E readiness gate polls it while bringing servers up — a `429` from either would be a false negative (instance judged unhealthy / servers judged not ready).

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
