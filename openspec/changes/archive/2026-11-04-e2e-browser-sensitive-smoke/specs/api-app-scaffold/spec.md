## MODIFIED Requirements

### Requirement: E2E smoke covers API error format on a real route

`apps/web/e2e/api-health.spec.ts` SHALL contain a describe block (using `test(...)`, not tagged `@smoke`: it makes direct API requests and runs only in `chromium-desktop`) that exercises `GET ${API_BASE_URL}/water-footprint/products?category=<invalid>` instead of any demo route. The block replaces the former demo-validation GET/POST blocks. Because that 400 originates from service-level validation (not the global `ValidationPipe`), the pipe itself is covered by the integration test above, not by E2E.

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
