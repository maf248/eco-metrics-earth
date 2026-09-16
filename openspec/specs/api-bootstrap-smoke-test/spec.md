# api-bootstrap-smoke-test Specification

## Purpose
TBD - created by archiving change configuration-and-tests. Update Purpose after archive.
## Requirements
### Requirement: API has an HTTP smoke test verifying the health endpoint
An integration test SHALL exist at `apps/api/__tests__/app/bootstrap.test.ts` that starts the full NestJS application and sends an HTTP request to `GET /api/v1/health`, verifying the app starts correctly and the endpoint responds.

#### Scenario: Health endpoint responds 200 OK
- **WHEN** the NestJS app is started via `NestFactory.create(AppModule)` in a test
- **THEN** `GET /api/v1/health` returns HTTP status `200`

#### Scenario: Health endpoint returns expected body
- **WHEN** a `GET /api/v1/health` request is sent in the smoke test
- **THEN** the response body is `{ "status": "ok" }`

#### Scenario: App is closed after tests to prevent open handles
- **WHEN** the test suite finishes (afterAll)
- **THEN** `app.close()` is called to release the HTTP server
- **THEN** Jest reports no open handles warning for this test file
