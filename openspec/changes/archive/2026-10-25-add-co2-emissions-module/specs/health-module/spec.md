## ADDED Requirements

### Requirement: Liveness never depends on external providers

`GET /api/v1/health` SHALL remain a liveness check that returns `{ "status": "ok" }` with `200` and SHALL NOT perform any outbound request or depend on any provider, Terminus indicator or HTTP client. `HealthController` SHALL NOT inject any provider-related dependency. This endpoint is the Cloud Run startup probe (`deploy-api.yml`, 2 s timeout) and the deploy workflow SHALL keep targeting it.

#### Scenario: Liveness answers while the provider is down

- **GIVEN** the OWID transport and the dependencies HTTP client both stubbed to fail every request
- **WHEN** `GET /api/v1/health` is called
- **THEN** the response is `200` with `{ "status": "ok" }`
- **AND** neither stub was invoked

#### Scenario: Controller has no provider dependency

- **WHEN** `HealthController` is instantiated in a `TestingModule` that provides nothing else
- **THEN** it resolves and `check()` returns `{ status: 'ok' }`

#### Scenario: Startup probe target unchanged

- **WHEN** `.github/workflows/deploy-api.yml` is read
- **THEN** its startup probe path is still `/api/v1/health`

### Requirement: Dependencies health endpoint

The API SHALL expose `GET /api/v1/health/dependencies`, registered by `HealthModule` in a `DependenciesHealthController` separate from `HealthController`, which checks external providers with `@nestjs/terminus`. The module SHALL import `TerminusModule` and `@nestjs/axios`'s `HttpModule`, and an `OwidHealthIndicator` SHALL call `HttpHealthIndicator.pingCheck('owid', url, { httpClient, timeout: 3000, headers })` with the injected `HttpService` as `httpClient`, `url` = `{OWID_GRAPHER_BASE_URL}/co-emissions-per-capita.metadata.json`, and the API's identifiable `User-Agent`. The endpoint SHALL return Terminus' native result (`{ status, info, error, details }`) with `200` when every indicator is up and `503` (same body) when any is down; the Terminus `ServiceUnavailableException` SHALL NOT be flattened by the global filter into the `ApiResponse` error envelope. The endpoint is an explicit exception to the `ApiResponse` envelope, like liveness. It SHALL stay under the global throttler (no `@SkipThrottle()`) and SHALL be documented in Swagger under the `'Health'` tag.

#### Scenario: Provider reachable

- **GIVEN** the injected HTTP client stubbed to answer 200
- **WHEN** `GET /api/v1/health/dependencies` is called
- **THEN** the response is `200` with `status: 'ok'` and `info.owid.status` equal to `'up'`

#### Scenario: Provider down

- **GIVEN** the injected HTTP client stubbed to fail with a connection error
- **WHEN** the endpoint is called
- **THEN** the response is `503` with `status: 'error'` and `error.owid.status` equal to `'down'`
- **AND** the body keeps the Terminus shape (not `{ success: false, error, status }`)

#### Scenario: Provider answers with an error status

- **GIVEN** the stub answers 500
- **WHEN** the endpoint is called
- **THEN** the response is `503` and `error.owid` includes the status code

#### Scenario: Timeout and target

- **WHEN** the indicator performs its check
- **THEN** the request URL is `{OWID_GRAPHER_BASE_URL}/co-emissions-per-capita.metadata.json` and the timeout option is 3000 ms

#### Scenario: One indicator per provider

- **WHEN** a second OWID-backed category module is added
- **THEN** the dependencies endpoint still reports a single `owid` entry

#### Scenario: Tests make no network calls

- **WHEN** `npx nx test api` runs the health suites
- **THEN** every dependency check goes through a stubbed `HttpService`

#### Scenario: Dependencies are declared and pinned

- **WHEN** `apps/api/package.json` is read
- **THEN** `@nestjs/terminus` (12.1.0), `@nestjs/axios` (12.0.1) and `axios` (1.20.0) are listed with exact versions, and pruning the API lockfile followed by `npm ci --dry-run` on the pruned package succeeds
