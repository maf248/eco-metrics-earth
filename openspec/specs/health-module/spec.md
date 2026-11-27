# health-module Specification

## Purpose

Defines the NestJS HealthModule that encapsulates the health endpoint.

## Requirements

### Requirement: HealthController is encapsulated in a HealthModule

A `HealthModule` SHALL exist at `apps/api/src/health/health.module.ts`. The `HealthModule` SHALL declare `HealthController` in its `controllers` array. `AppModule` SHALL import `HealthModule` instead of declaring `HealthController` directly in its `controllers` array.

#### Scenario: HealthModule is importable as a standalone NestJS module

- **WHEN** `HealthModule` is imported into a `TestingModule`
- **THEN** it provides the `HealthController` and its routes without additional configuration

#### Scenario: AppModule uses HealthModule

- **WHEN** the NestJS application starts
- **THEN** `AppModule` imports array contains `HealthModule`
- **THEN** `AppModule` controllers array does NOT contain `HealthController` directly

#### Scenario: Health endpoint remains functional after refactor

- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response status is `200 OK`
- **THEN** the response body is `{ "status": "ok" }`

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

### Requirement: Liveness is independent of snapshot persistence

`GET /api/v1/health` SHALL NOT call the snapshot store or the Cloud Storage client, and `HealthController` SHALL NOT inject `ProviderSnapshotService` or the `SNAPSHOT_STORE` token. A missing bucket, missing IAM permission or a Cloud Storage outage SHALL NOT change the liveness response or delay the startup probe.

#### Scenario: Liveness with a failing store

- **GIVEN** the application built with a snapshot store whose methods all reject
- **WHEN** `GET /api/v1/health` is called
- **THEN** the response is `200` with `{ "status": "ok" }` and no store method was called

#### Scenario: Controller dependencies

- **WHEN** the constructor parameters of `HealthController` are inspected
- **THEN** none is `ProviderSnapshotService` or `SNAPSHOT_STORE`

### Requirement: Dependencies health covers every live provider

`DependenciesHealthController` SHALL run one indicator per live provider (`owid`, `copernicus-climate-pulse`, `noaa-lsa`), not one per category, keeping its Terminus-native body.

#### Scenario: All providers reachable

- **GIVEN** the injected HTTP client answering 200 for every URL
- **WHEN** `GET /api/v1/health/dependencies` is called
- **THEN** it answers `200` and `info` has `owid`, `copernicus-climate-pulse` and `noaa-lsa` all `up`

#### Scenario: One provider down

- **GIVEN** only the NOAA LSA URL failing
- **WHEN** the endpoint is called
- **THEN** it answers `503`, `error` has `noaa-lsa` `down` and `info` still has the other two `up`

#### Scenario: Probes use HEAD

- **WHEN** the two new indicators check
- **THEN** their requests use method `HEAD` at `{base URL}/<file>.csv` with a 3000 ms timeout and the API `User-Agent`

#### Scenario: Swagger example

- **WHEN** the endpoint's Swagger example is read
- **THEN** it lists all three keys

#### Scenario: Liveness is untouched

- **WHEN** the liveness controller test runs
- **THEN** `HealthController` still takes no provider dependency and `GET /api/v1/health` calls no provider
