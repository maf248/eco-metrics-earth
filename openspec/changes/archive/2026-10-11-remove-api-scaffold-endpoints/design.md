## Context

The API still ships scaffold routes (`GET /api/v1/`, `GET|POST /api/v1/demo-validation`). Besides having no consumers, they incidentally carry test value: they are the only routes that exercise the global `ValidationPipe` (the only DTOs in the API), and the E2E rate-limit suite throttles `GET /demo-validation`. Removing them must not leave those guarantees uncovered.

Verified facts from the code:

- `main.ts` configures the pipe and filter inline (`new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, `new AllExceptionsFilter()`). `bootstrap.test.ts` builds the app from `AppModule` with its own copy of the prefix/CORS setup, and `main.test.ts` runs the real `main.ts` against a mocked `NestFactory` (fake app tracking `useGlobalPipes`, `useGlobalFilters`, etc.).
- `CreateMetricDto` and `GetMetricsQueryDto` are used only by `DemoValidationController` and their own tests. After deletion `src/common/controllers/` and `src/common/dto/` are empty and are removed.
- `FallbackController` (`@All('{*path}')`) plus `AllExceptionsFilter` produce the JSON 404 for unmatched routes.
- `GET /api/v1/water-footprint/products?category=<invalid>` already returns 400 in `ApiResponse` format, but from service-level validation.
- `/health` has `@SkipThrottle`; the global default is 60 requests / 60 s.

## Decisions

### D1. Root route becomes a plain 404

`GET /api/v1/` is deleted with no redirect (nothing points at it). It falls to the fallback and returns the standard JSON 404. A test asserts it. Implementation must verify empirically that the fallback pattern also matches the bare prefix (`/api/v1` and `/api/v1/`): `{*path}` in path-to-regexp v8 sits inside an optional group, so it is expected to, but this is not assumed. If it does not, the minimal fix is in `FallbackController`'s route pattern, and the task must surface that to the user (it would be a small additional behavior change in `common/fallback`, not a silent one).

### D2. Extract `applyGlobalPipeline(app)` for a single source of truth

Problem: the test must exercise the production pipe options, not a copy; today they are inline in `main.ts`, which cannot be imported without starting the server.

Decision: create `apps/api/src/app/global-pipeline.ts` exporting `applyGlobalPipeline(app: INestApplication): void`, which calls `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` and `app.useGlobalFilters(new AllExceptionsFilter())`, in the same order as today. `main.ts` calls it in place of the two inline calls. The prefix, helmet, CORS, trust proxy, Swagger and shutdown hooks stay in `main.ts`: they are not needed to prove the validation and error-shape contract, and moving them would widen the diff.

Impact on `main.test.ts`: the fake application still receives one `useGlobalPipes` and one `useGlobalFilters` call, so existing assertions hold; one assertion is added that both are called (via the shared function) before `listen`.

### D3. Test-only controller and DTO under `__tests__`

New test `apps/api/__tests__/app/global-pipeline.test.ts` (mirrors `src/app/global-pipeline.ts`):

- Test-only DTOs (class-validator + class-transformer decorators, including a numeric field transformed from a string) and a test-only controller with a `POST` body route and a `GET` query route are declared in the test file (or a sibling helper under `__tests__/`). Nothing is added to `src/`.
- `Test.createTestingModule({ controllers: [TestController] })`, then `module.createNestApplication({ logger: false })` and `applyGlobalPipeline(app)`, then `app.init()` and supertest. No `AppModule` import is needed, so there is no env/throttler/network coupling.
- Assertions: 400 + `ApiResponse` shape with joined messages for missing fields; 400 for extra properties (`forbidNonWhitelisted`); transformation to DTO instance and coerced types (`transform`); a valid request returns 2xx.
- Zero console output: Nest logger disabled via the `logger: false` option (a supported option, not a suppression of a real problem), per the zero-warnings rule.

Alternative rejected: reading the options back from `main.ts` by running it with a mocked `NestFactory` (as `main.test.ts` does) only proves the options object was passed, not the behavior on real requests.

### D4. Rate-limit E2E on `GET /api/v1/water-footprint/products`

The route is read-only, side-effect free, and uses the global default throttle with no override. The spec states these as the required properties and names the current route, so a future change of route is a one-line edit of a single `THROTTLED_URL` constant. The URL already is a single constant (`THROTTLED_URL`); only its path changes. The payload is a static 60-product dataset served from memory; the test asserts only status codes and the `x-ratelimit-remaining` header (the precondition probe), so payload size or any future HTTP caching cannot affect the result. Note: `playwright`'s `request.get` reads the body, so 60+ sequential requests transfer 60+ payloads; that is acceptable for local loopback and is the accepted cost of using a real route.

### D5. E2E validation checks move to the water-footprint route

In `api-health.spec.ts` the two demo describe blocks are replaced by a `@smoke` block `API water-footprint — error format` covering: invalid category returns 400 with `success: false`, `error` string, and `status: 400`; a valid request returns 200; CORS header on the 400. `@smoke` is kept because these run in the non-desktop projects too and are cheap, single requests.

### D6. Specs

`e2e-api-rate-limiting` is MODIFIED (all existing scenarios kept, plus one for the single constant). `api-app-scaffold` gets three ADDED requirements and a MODIFIED regression requirement whose scenario list is preserved. `e2e-server-readiness` is MODIFIED only to drop the stale hard-coded "10 API specs" count in a scenario; all scenarios kept. `api-bootstrap-smoke-test`, `api-security-hardening` and `health-module` were checked and do not mention the scaffold routes.

### D7. Docs and conventions

- `README.md` and `apps/api/README.md`: remove the three endpoint rows, update project-structure trees (`app/` is `AppModule` plus the global pipeline helper; `common/` loses the DTO/controllers entries).
- `AGENTS.md`: update the Project Structure tree; add to Documentation Maintenance, next to the ROADMAP rule, that OpenSpec artifacts must not reference ROADMAP item IDs (IDs are renumbered when items close; describe items by content; archived changes stay untouched).
- `ROADMAP.md`: at close only (after implementation), delete the scaffold-endpoints item and its Plan de Acción entry and renumber the following `Ixx` IDs and all cross-references per "Keep ROADMAP.md sequence continuous". The task text does not cite the ID.

## Alternatives considered

- **Keep the demo controller but hide it from Swagger/production**: still ships dead code and a public route; rejected.
- **Add a permanent real DTO-bearing endpoint for validation coverage**: adds product surface for test purposes; rejected (non-goal). A test-only controller is sufficient.
- **Copy the pipe options into the test**: duplicates configuration and can drift; rejected in favor of D2.
- **Redirect `/api/v1/` to docs or health**: nothing needs it; rejected by decision.
- **Throttle `/health`-adjacent or a new test route in E2E**: `/health` is exempt by design; a new route is surface for tests; rejected.

## Risks and mitigations

- **Fallback may not match the bare prefix** (D1): covered by a test written first; contingency noted above and to be escalated, not silently patched.
- **Coverage thresholds (80% statements/functions/lines, api)**: deleting well-covered files can move percentages; the new `global-pipeline.ts` is fully exercised. Run `npx nx test api` and confirm thresholds hold.
- **Rate-limit E2E slower or flaky on a larger payload**: only status codes are asserted; mitigated by the loopback target and the design above. If run time regresses noticeably, report it rather than weakening the test.
- **External consumers of the removed routes**: none known (verified for the repo; the web app does not call them). Production removal is a deliberate public-surface reduction; commit type `refactor(api)`, not a major release.
- **Stale references**: a final repo-wide search (excluding archive) must show no remaining references.
