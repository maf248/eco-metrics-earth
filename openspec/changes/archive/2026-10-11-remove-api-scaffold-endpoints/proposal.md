## Why

### Goals

- Shrink the public API surface of the production BFF (Cloud Run, global prefix `/api/v1`) by removing scaffold endpoints that have no consumers:
  - `GET /api/v1/` returning `{ message: 'Hello API' }` (`AppController` + `AppService`, tagged `App` in Swagger).
  - `GET /api/v1/demo-validation` and `POST /api/v1/demo-validation` (`DemoValidationController`, already marked `@deprecated`, tagged `Demo` in Swagger), together with the two DTOs only they use (`CreateMetricDto`, `GetMetricsQueryDto`).
- Keep the safety nets those scaffolds were incidentally providing, by moving them to real routes or to a dedicated test:
  - The global `ValidationPipe` configuration (`whitelist`, `forbidNonWhitelisted`, `transform`) and the global exception filter's `ApiResponse` error shape stay covered by an integration test that uses the **same shared configuration code path as `main.ts`**.
  - The E2E validation checks and the E2E rate-limit suite are re-pointed at `GET /api/v1/water-footprint/products`.
- Make the rate-limit E2E future-proof: the spec states the _property_ the throttled route must have (read-only, side-effect-free, governed by the global default throttle), names water-footprint products as the current route, and keeps the URL in one constant.
- Record a documentation convention: OpenSpec artifacts never reference ROADMAP item IDs.

### Non-Goals

- No new endpoints, no new features, and no change to `water-footprint` behavior (controller, service, dataset, response shape).
- No redirect or replacement for `GET /api/v1/`. It simply becomes an unmatched route and returns the standard JSON 404 from the existing catch-all fallback.
- No change to the health endpoint, the throttler configuration (60 requests / 60 s, internal-key bypass, `@SkipThrottle` on health), CORS, helmet, or Swagger setup beyond dropping the `Demo` tag.
- No change to the `ValidationPipe` options themselves; they are only moved, not altered.
- No test-only controller or DTO is added under `apps/api/src/` (they live exclusively under `apps/api/__tests__/`).
- No removal of the `class-validator` / `class-transformer` dependencies: the global `ValidationPipe` requires them and the upcoming real modules will use DTOs.
- Archived OpenSpec changes are left untouched.
- This is not a breaking change and not a major release: the removed routes are mocks with no consumers. The commit type is `refactor(api)`.

## What Changes

### Impact

- **API surface (removed):** `GET /api/v1/`, `GET /api/v1/demo-validation`, `POST /api/v1/demo-validation`. `GET /api/v1/` now returns the standard JSON 404 (`{ success: false, error, status: 404 }`) like any other unknown route. Swagger loses the `App` and `Demo` tags.
- **API code:** deletion of `app.controller.ts`, `app.service.ts`, `demo-validation.controller.ts`, `create-metric.dto.ts`, `get-metrics-query.dto.ts` (and the then-empty `common/controllers/` and `common/dto/` folders); `AppModule` and `main.ts` updated; a small shared function extracted so `main.ts` and the new test configure the global pipe and filter identically.
- **Tests:** unit tests for the removed code are deleted; a new integration test covers the real global pipeline; `app.module`/`bootstrap`-level tests gain a root-route 404 assertion.
- **E2E:** `apps/web/e2e/api-health.spec.ts` demo-validation blocks are replaced by checks against `water-footprint/products?category=<invalid>`; `apps/web/e2e/rate-limit.spec.ts` targets `water-footprint/products` through a single constant.
- **Specs:** `e2e-api-rate-limiting` (MODIFIED), `api-app-scaffold` (MODIFIED + ADDED), `e2e-server-readiness` (MODIFIED, drops a stale spec count).
- **Docs:** endpoint tables and project-structure trees in `README.md`, `apps/api/README.md`, `AGENTS.md`; a new convention in `AGENTS.md` (Documentation Maintenance); the corresponding scaffold item is removed from `ROADMAP.md` at close, with renumbering.
