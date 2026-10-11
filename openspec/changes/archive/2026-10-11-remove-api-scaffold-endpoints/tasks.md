## 1. Shared global pipeline (spec: "Global validation pipeline is shared and integration-tested")

- [x] 1.1 Create `apps/api/src/app/global-pipeline.ts` exporting `applyGlobalPipeline(app: INestApplication): void` that calls `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` then `app.useGlobalFilters(new AllExceptionsFilter())` (options unchanged from the current `main.ts`).
- [x] 1.2 In `apps/api/src/main.ts`, replace the inline `useGlobalPipes` / `useGlobalFilters` calls with `applyGlobalPipeline(app)` (same position in the sequence); remove the now-unused `ValidationPipe` and `AllExceptionsFilter` imports. Scenario: "main.ts uses the shared function".
- [x] 1.3 Update `apps/api/__tests__/app/main.test.ts`: assert `useGlobalPipes` and `useGlobalFilters` are each called exactly once and before `listen`.
- [x] 1.4 Create `apps/api/__tests__/app/global-pipeline.test.ts` with test-only DTOs and a test-only controller (POST body route, GET query route) defined under `__tests__/` only, built via `Test.createTestingModule` + `createNestApplication({ logger: false })` + `applyGlobalPipeline(app)` + supertest. Use `it(...)`. Cover scenarios: missing required field -> 400 `ApiResponse` with joined messages; extra property -> 400 (`forbidNonWhitelisted`); string numerics coerced to DTO types / DTO instance (`transform`); valid request succeeds. Zero console output.

## 2. Remove scaffold endpoints (spec: "Scaffold endpoints are not exposed")

- [x] 2.1 Before deleting, confirm with a repo-wide search that `CreateMetricDto` and `GetMetricsQueryDto` have no consumers other than `DemoValidationController` and their own tests.
- [x] 2.2 Delete `apps/api/src/app/app.controller.ts`, `apps/api/src/app/app.service.ts`, `apps/api/src/common/controllers/demo-validation.controller.ts`, `apps/api/src/common/dto/create-metric.dto.ts`, `apps/api/src/common/dto/get-metrics-query.dto.ts`; remove the empty `common/controllers/` and `common/dto/` folders.
- [x] 2.3 Update `apps/api/src/app/app.module.ts`: drop the `AppController`, `AppService` and `DemoValidationController` imports, empty/remove the `controllers` array, and keep only `{ provide: APP_GUARD, useClass: ThrottlerGuard }` in `providers`.
- [x] 2.4 Remove `.addTag('Demo', ...)` from the Swagger builder in `apps/api/src/main.ts`. Keep `class-validator` and `class-transformer` in `apps/api/package.json`.
- [x] 2.5 Delete the unit tests: `apps/api/__tests__/app/app.controller.test.ts`, `app.service.test.ts`, `__tests__/common/controllers/demo-validation.controller.test.ts`, `__tests__/common/dto/create-metric.dto.test.ts`, `__tests__/common/dto/get-metrics-query.dto.test.ts` (and the empty `controllers/` and `dto/` test folders).
- [x] 2.6 Add tests, written first, that using the real `AppModule` (or the bootstrap-style setup with prefix `api/v1` and `applyGlobalPipeline`) `GET /api/v1/`, `GET /api/v1/demo-validation` and `POST /api/v1/demo-validation` each return 404 with JSON `{ success: false, error: <string>, status: 404 }`. Scenarios: "API root returns the standard JSON 404", "Former demo-validation routes return 404". If the bare prefix is not caught by the fallback, stop and report to the user before changing `FallbackController` (see design D1).
- [x] 2.7 Verify scenario "Scaffold code is gone": repo-wide search (excluding `openspec/changes/archive/`) finds no references to the removed classes or `demo-validation` outside this change's artifacts and the docs updated in section 5.

## 3. E2E (specs: "E2E smoke covers API error format on a real route", rate-limiting MODIFIED requirement)

- [x] 3.1 In `apps/web/e2e/api-health.spec.ts`, remove the two `API demo-validation` describe blocks and add a `@smoke` block against `${API_BASE_URL}/water-footprint/products`: invalid category returns 400 with `success: false`, string `error`, `status: 400`; valid request returns 200 with `success: true`; CORS `access-control-allow-origin` present on the 400 with `Origin: http://localhost:3000`. Use `test(...)`.
- [x] 3.2 In `apps/web/e2e/rate-limit.spec.ts`, change the single `THROTTLED_URL` constant to `${API_BASE_URL}/water-footprint/products`, keep it the only throttled-route URL in the file, and add a short comment stating the required route properties (read-only, side-effect-free, global default throttle, no per-route override). Assertions remain status codes and the `x-ratelimit-remaining` header only. Scenario: "Throttled route is defined by a single constant".
- [x] 3.3 Run `npm run e2e` (check ports first: the user's dev server may occupy `:3000`/`:3001`) and confirm all rate-limit scenarios and the new smoke block pass with zero warnings.

## 4. Coverage

- [x] 4.1 Run `npx nx test api` and confirm the 80% statements / functions / lines thresholds still pass with zero errors and warnings. If any threshold fails, add tests rather than lowering it.

## 5. Documentation and conventions

- [x] 5.1 `README.md`: delete the endpoint rows for `GET /api/v1/`, `GET /api/v1/demo-validation`, `POST /api/v1/demo-validation`; update the project-structure tree (`app/` and `common/` lines).
- [x] 5.2 `apps/api/README.md`: delete the same three endpoint rows; update the structure tree (remove `common/controllers/` and `common/dto/` entries; mention the global pipeline helper under `app/`).
- [x] 5.3 `AGENTS.md` Project Structure tree: `app/` becomes `AppModule, global pipeline helper`; `common/` line drops `DTOs`.
- [x] 5.4 `AGENTS.md` Documentation Maintenance, next to the ROADMAP rule: add a convention that OpenSpec artifacts (proposal, design, tasks, specs) must not reference ROADMAP item IDs because IDs are renumbered when items close; items are described by content; archived changes stay untouched.

## 6. Gates

- [x] 6.1 `npm run lint`, `npm run build`, `npm run test` and `npm run e2e` all pass with zero errors and warnings.
- [x] 6.2 `npx openspec validate remove-api-scaffold-endpoints --strict` passes.

## 7. Close (only after everything above is done and verified)

- [x] 7.1 In `ROADMAP.md`, delete the "Endpoints de scaffold expuestos en producción" item block and its Plan de Acción entry, renumber all subsequent `Ixx` IDs so the sequence has no gaps, and update every cross-reference in the document (status table, Plan de Acción, other items), per "Keep ROADMAP.md sequence continuous" in `AGENTS.md`. Also fix any ID reference in `AGENTS.md` (for example the dependency-management note) that the renumbering invalidates. Do not touch `openspec/changes/archive/`.
- [x] 7.2 Archive with `npx openspec archive remove-api-scaffold-endpoints --yes` (merge, never overwrite), then stop for the user's final approval. Suggested commit type: `refactor(api)`.
