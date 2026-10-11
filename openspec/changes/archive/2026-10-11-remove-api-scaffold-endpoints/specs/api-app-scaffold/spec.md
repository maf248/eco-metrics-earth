## ADDED Requirements

### Requirement: Scaffold endpoints are not exposed

The API SHALL NOT expose the scaffold routes `GET /api/v1/`, `GET /api/v1/demo-validation`, or `POST /api/v1/demo-validation`. `AppController`, `AppService`, `DemoValidationController`, `CreateMetricDto`, and `GetMetricsQueryDto` SHALL NOT exist in `apps/api/src/`, `AppModule` SHALL NOT register them, and the Swagger document SHALL NOT declare the `App` or `Demo` tags. Unmatched routes, including the API root, SHALL be answered by the existing catch-all fallback with the standard JSON 404 produced by the global exception filter. No redirect SHALL be added for the former root route.

#### Scenario: API root returns the standard JSON 404

- **GIVEN** the application bootstrapped with the global prefix `api/v1` and the global exception filter
- **WHEN** a client sends `GET /api/v1/`
- **THEN** the response status is `404`
- **AND** the body is JSON of the form `{ "success": false, "error": <string>, "status": 404 }`

#### Scenario: Former demo-validation routes return 404

- **GIVEN** the same application
- **WHEN** a client sends `GET /api/v1/demo-validation` or `POST /api/v1/demo-validation`
- **THEN** each response status is `404` with the same JSON error shape

#### Scenario: Scaffold code is gone

- **WHEN** the repository is searched for `AppController`, `AppService`, `DemoValidationController`, `CreateMetricDto`, `GetMetricsQueryDto`, and the string `demo-validation` outside `openspec/changes/archive/`
- **THEN** no source, test, E2E, or documentation file references them (this change's own artifacts excepted until archived)
- **AND** `apps/api/src/common/controllers/` and `apps/api/src/common/dto/` no longer exist

### Requirement: Global validation pipeline is shared and integration-tested

The global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) and the global `AllExceptionsFilter` SHALL be applied by a single exported function in `apps/api/src/app/global-pipeline.ts` (`applyGlobalPipeline(app)`), which `main.ts` SHALL call instead of configuring them inline. An integration test under `apps/api/__tests__/` SHALL build a Nest application with a test-only controller and DTO (defined only under `apps/api/__tests__/`, never in `src/`), apply the same `applyGlobalPipeline` function, and assert the pipe options and the `ApiResponse` error shape over HTTP.

#### Scenario: Missing required field is rejected with an ApiResponse error

- **GIVEN** a test app using `applyGlobalPipeline` with a test-only `POST` route whose DTO has required validated fields
- **WHEN** a body missing a required field is sent
- **THEN** the response status is `400`
- **AND** the body is `{ "success": false, "error": <string naming the failing field>, "status": 400 }` with multiple validation messages joined by `; `

#### Scenario: Unknown properties are rejected

- **GIVEN** the same test app
- **WHEN** a valid body plus an extra property not declared in the DTO is sent
- **THEN** the response status is `400` and the error message names the forbidden property

#### Scenario: Payload is transformed to the DTO types

- **GIVEN** the same test app with a DTO using `class-transformer` (for example `@Type(() => Number)` on a numeric field) and a test-only `GET` route with a query DTO
- **WHEN** a valid payload or query with numeric values in string form is sent
- **THEN** the handler receives an instance of the DTO class with values coerced to the declared types and the response is successful

#### Scenario: main.ts uses the shared function

- **GIVEN** the `main bootstrap` unit test with a fake application
- **WHEN** `main.ts` is executed
- **THEN** `useGlobalPipes` and `useGlobalFilters` are each called exactly once, via `applyGlobalPipeline`, before `listen`
- **AND** `main.ts` contains no inline `new ValidationPipe(...)` or `new AllExceptionsFilter()`

### Requirement: E2E smoke covers API error format on a real route

`apps/web/e2e/api-health.spec.ts` SHALL contain a `@smoke` describe block (using `test(...)`) that exercises `GET ${API_BASE_URL}/water-footprint/products?category=<invalid>` instead of any demo route. The block replaces the former demo-validation GET/POST blocks. Because that 400 originates from service-level validation (not the global `ValidationPipe`), the pipe itself is covered by the integration test above, not by E2E.

#### Scenario: Invalid category returns 400 in ApiResponse format

- **GIVEN** the API running under the E2E wrapper
- **WHEN** `GET /api/v1/water-footprint/products?category=not-a-category` is sent
- **THEN** the status is `400` and the JSON body has `success: false`, a string `error`, and `status: 400`

#### Scenario: Valid request on the same route succeeds

- **WHEN** `GET /api/v1/water-footprint/products` is sent
- **THEN** the status is `200` and the body has `success: true`

#### Scenario: CORS headers are present on the 400 error response

- **WHEN** the invalid-category request is sent with `Origin: http://localhost:3000`
- **THEN** `access-control-allow-origin` equals `http://localhost:3000`

## MODIFIED Requirements

### Requirement: Existing API behavior preserved on NestJS 12 (regression-proofing)

The API SHALL exhibit identical observable behavior on NestJS 12 as on NestJS 11 for all existing endpoints and cross-cutting concerns: the health check, 404 handling, global DTO validation (exercised through the shared global pipeline integration test), security headers (helmet), the global rate-limiting guard, and the OpenAPI document. No request/response body contract changes. (CORS header behavior was subsequently changed by the multi-origin CORS change and is owned by the `api-security-hardening` capability: `Access-Control-Allow-Origin` is emitted only for requests whose `Origin` matches an allowed origin.)

#### Scenario: Health, 404, and validation contracts unchanged

- **WHEN** the existing unit tests (`npx nx test api`) and the E2E API specs (`apps/web/e2e/api-health.spec.ts`) run against the NestJS 12 app
- **THEN** all pass with zero errors and zero warnings — health 200 `{ "status": "ok" }`, unknown routes 404 JSON, an invalid `category` on `GET /api/v1/water-footprint/products` 400 in `ApiResponse` format with `success: false` and an `error` message

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
