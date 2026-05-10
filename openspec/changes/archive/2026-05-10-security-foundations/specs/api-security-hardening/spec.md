## ADDED Requirements

### Requirement: API emits HTTP security headers on all responses
The NestJS API SHALL use the `helmet` middleware to set standard HTTP security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Strict-Transport-Security) on every response.

#### Scenario: Health endpoint includes security headers
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response includes `X-Content-Type-Options: nosniff`
- **THEN** the response includes `X-Frame-Options` header
- **THEN** the response includes `Referrer-Policy` header

### Requirement: CORS_ORIGIN is validated at startup via Joi schema
The API SHALL validate the `CORS_ORIGIN` environment variable through the AppModule Joi schema. The schema MUST reject non-URI values and wildcard strings. If absent, it SHALL default to `'http://localhost:3000'`.

#### Scenario: API starts with valid CORS_ORIGIN
- **WHEN** `CORS_ORIGIN` is set to a valid URI (e.g., `https://eco-metrics.earth`)
- **THEN** the API starts successfully and uses that URI as the CORS origin

#### Scenario: API fails fast with invalid CORS_ORIGIN
- **WHEN** `CORS_ORIGIN` is set to a non-URI string (e.g., `not-a-url`)
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: API uses default when CORS_ORIGIN is absent
- **WHEN** `CORS_ORIGIN` is not set in the environment
- **THEN** the API starts and uses `http://localhost:3000` as the CORS origin

### Requirement: CORS_ORIGIN is read from AppConfigService
The `main.ts` bootstrap function SHALL read the CORS origin from `AppConfigService.corsOrigin` instead of accessing `process.env` directly.

#### Scenario: Bootstrap reads validated CORS origin
- **WHEN** the NestJS app bootstraps
- **THEN** `enableCors` is called with the value returned by `AppConfigService.corsOrigin`

### Requirement: API enforces global rate limiting
The API SHALL apply a global rate-limiting guard that allows at most 60 requests per 60 seconds per IP address across all routes, using `@nestjs/throttler`.

#### Scenario: Requests within limit are allowed
- **WHEN** a client sends 60 or fewer requests within a 60-second window
- **THEN** all requests receive normal responses (2xx or expected status)

#### Scenario: Requests exceeding limit are rejected
- **WHEN** a client sends more than 60 requests within a 60-second window
- **THEN** the 61st request receives a `429 Too Many Requests` response

#### Scenario: Rate limit is applied globally without per-route configuration
- **WHEN** the ThrottlerGuard is registered as an APP_GUARD provider in AppModule
- **THEN** all existing and future routes are rate-limited without requiring per-route decorators
