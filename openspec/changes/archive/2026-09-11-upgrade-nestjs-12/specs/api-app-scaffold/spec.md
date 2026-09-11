# Spec: API App Scaffold — NestJS 12 Upgrade (Delta)

Delta against the existing `api-app-scaffold` capability. This change adds no product behavior: it re-pins the framework requirement to NestJS 12 and adds regression-proofing requirements so the existing behavior is **preserved** on the new major. The `api-bootstrap-smoke-test`, `api-security-hardening`, `health-module`, and `water-footprint-api` capabilities are intentionally not delta-ed — their requirements are unchanged and must keep passing as-is.

> Note on titles: the MODIFIED requirement keeps its original Spanish title (and its two original scenario titles) so the archive merge replaces the correct requirement — repo precedent (`2026-05-01-fix-api-robustness`). All new content is in English per repo convention.

## MODIFIED

### Requirement: NestJS app con estructura modular por categoría _(modified)_

The original requirement stands: the `api` app SHALL have a root module (`AppModule`) and a `modules/` folder prepared to host per-eco-category modules, each following `modules/<category>/<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`. Updated: the app SHALL run on **NestJS 12** — `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`, and `@nestjs/testing` pinned at exactly `12.0.1`, `@nestjs/config` at exactly `12.0.0` (no `^`/`~`), with `@nestjs/throttler` deliberately kept at `6.5.0` (documented exception — no Nest 12 peer support published). The app SHALL remain CommonJS; the ESM-published `@nestjs/*` 12 packages are consumed via Node's native `require(esm)`.

#### Scenario: API responde en el puerto correcto _(unchanged behavior, new framework major)_

- **GIVEN** the workspace with the `@nestjs/*` 12.x exact pins installed and the lockfile in sync
- **WHEN** `nx serve api` is executed
- **THEN** NestJS 12 starts on `http://localhost:3001` without errors or warnings

#### Scenario: Health check endpoint disponible _(unchanged)_

- **WHEN** a GET is sent to `http://localhost:3001/api/v1/health`
- **THEN** the server responds with status 200 and body `{ "status": "ok" }`

#### Scenario: NestJS versions pinned exactly with no nested 11.x copies

- **WHEN** `apps/api/package.json` and the installed tree are inspected after the upgrade
- **THEN** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger` are pinned at `"12.0.1"` and `@nestjs/config` at `"12.0.0"` — exact, no `^`/`~`
- **AND** `npm ls @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/swagger @nestjs/config @nestjs/testing` resolves a single 12.x version each, with no nested 11.x copies

## ADDED

### Requirement: NestJS dependency manifest without dead weight

The `apps/api` dependency manifest SHALL contain only `@nestjs/*` packages that are actually used. `swagger-ui-express` SHALL NOT be a dependency — `@nestjs/swagger` has served its own `swagger-ui-dist` UI since v11, and no source file imports `swagger-ui-express` (verified by grep).

#### Scenario: swagger-ui-express removed from the manifest and build output

- **WHEN** `apps/api/package.json` is inspected after the upgrade
- **THEN** `swagger-ui-express` does not appear in `dependencies` or `devDependencies`
- **AND** a fresh `nx build api` produces a `dist/package.json` that also does not list it

#### Scenario: Swagger UI still served by @nestjs/swagger

- **GIVEN** the API running with `SWAGGER_ENABLED=true`
- **WHEN** a GET is sent to `http://localhost:3001/api/v1/api/docs`
- **THEN** the Swagger UI is served with the eco-metrics earth API document (manual verification — no automated Swagger coverage exists in the repo)

### Requirement: Environment validation behavior preserved under @nestjs/config 12

`AppModule` SHALL validate environment variables at startup via `ConfigModule.forRoot` with the existing Joi schema (Joi 18.2.8, unchanged). Joi-specific options (`allowUnknown: true`, `abortEarly: true`) SHALL be passed under `validationOptions.libraryOptions` — the `@nestjs/config` 12 Standard Schema validation contract. The observable validation behavior SHALL remain identical to NestJS 11: unknown env vars are tolerated, the first invalid variable aborts startup with a clear error, and absent variables fall back to the schema defaults.

#### Scenario: Invalid env var fails fast

- **WHEN** the app starts with `PORT=not-a-port`
- **THEN** startup aborts with a validation error identifying `PORT` — same behavior as NestJS 11

#### Scenario: Schema defaults apply when env vars are absent

- **WHEN** the app starts without `PORT`, `NODE_ENV`, `CORS_ORIGIN`, or `SWAGGER_ENABLED` set
- **THEN** it starts successfully using the schema defaults (`3001`, `development`, `http://localhost:3000`, `false`)

#### Scenario: Unknown env vars are allowed

- **WHEN** the app starts with additional unrecognized env vars in the environment
- **THEN** startup succeeds — `allowUnknown` semantics preserved via `libraryOptions`

### Requirement: Existing API behavior preserved on NestJS 12 (regression-proofing)

The API SHALL exhibit identical observable behavior on NestJS 12 as on NestJS 11 for all existing endpoints and cross-cutting concerns: the health check, 404 handling, DTO validation, CORS headers, security headers (helmet), the global rate-limiting guard, and the OpenAPI document. No request/response contract changes.

#### Scenario: Health, 404, and validation contracts unchanged

- **WHEN** the existing unit tests (`npx nx test api` — 54 tests: 50 baseline + 1 direct rate-limit coverage from task 3.10 + 3 fallback coverage from task 2.2) and the E2E API specs (`apps/web/e2e/api-health.spec.ts`, 10 specs) run against the NestJS 12 app
- **THEN** all pass with zero errors and zero warnings — health 200 `{ "status": "ok" }`, unknown routes 404 JSON, invalid POST body 400 with `error`, query echo 200

#### Scenario: CORS and security headers unchanged

- **WHEN** any API response is received (success or error)
- **THEN** `Access-Control-Allow-Origin` reflects `CORS_ORIGIN` and the helmet security headers are present — same as NestJS 11

#### Scenario: Rate-limiting guard remains active under the held-back throttler pin

- **GIVEN** the global `ThrottlerGuard` registered as `APP_GUARD` with `@nestjs/throttler` 6.5.0 (deliberate pin — no Nest 12 peer support published yet)
- **WHEN** requests flow through the API (every bootstrap-test request and every E2E API request passes through the global guard)
- **THEN** requests within the 60/60s window receive normal responses and the guard produces no errors — the `api-security-hardening` rate-limit requirement keeps holding without code changes

#### Scenario: Rate limiting returns 429 after exceeding the request budget

- **GIVEN** the API running on NestJS 12 with the global `ThrottlerGuard` active (`@nestjs/throttler` 6.5.0 — deliberate pin, 60 requests / 60 s TTL per tracker)
- **WHEN** more than the configured request budget is sent to a single endpoint within the TTL window (direct rate-limit test — task 3.10: E2E hammering or unit test with a small-limit `ThrottlerModule`)
- **THEN** the API responds **429** for the excess requests, with the throttler payload (`statusCode: 429`, `message: "ThrottlerException: Too Many Requests"` — exact shape re-verified empirically at implementation) and a `Retry-After` header
- **AND** rate limiting remains active after the NestJS 12 upgrade — the 429 path is proven directly, not only inferred from pass-through traffic

### Requirement: NestJS-family audit advisories eliminated

The dependency tree SHALL be free of `npm audit` advisories whose vulnerable chain routes through `@nestjs/platform-express` → `multer` or `@nestjs/swagger` → `js-yaml`. Before/after audit counts SHALL be documented; the expected reduction is ~8 advisories from the 32 baseline. Advisories without an available fix (`express`/`qs`/`body-parser`) and non-NestJS families (`semantic-release` subtree, `concurrently`) explicitly remain out of scope.

#### Scenario: multer and js-yaml chains gone from the audit

- **GIVEN** the lockfile regenerated with `@nestjs/*` 12.x (`multer` 2.3.0 via root override — 2.2.0 has 3 verified high advisories; `js-yaml` 5.4.1)
- **WHEN** `npm audit --json` is executed
- **THEN** no advisory lists `multer` or `js-yaml` as a vulnerable package
- **AND** `@nestjs/platform-express` / `@nestjs/swagger` no longer appear as fix paths for those chains

#### Scenario: Audit counts recorded

- **WHEN** the upgrade completes
- **THEN** the before (32: 4 critical, 21 high, 5 moderate, 2 low) and after counts are recorded in ROADMAP.md (I01 and the status table)
- **AND** the after count is ~8 lower (the exact number is recorded, not promised)

## File Changes

### MODIFIED: `apps/api/package.json`

Six `@nestjs/*` pins → 12.x exact (`12.0.1` × 5, `12.0.0` for config); `swagger-ui-express` removed; `@nestjs/throttler` untouched at 6.5.0.

### MODIFIED: `package-lock.json`

Regenerated — `@nestjs/*` 12 tree, `multer` 2.3.0 (root top-level override), `js-yaml` 5.4.1, `swagger-ui-express` subtree gone.

### MODIFIED: `apps/api/src/app/app.module.ts`

`validationOptions` → `validationOptions.libraryOptions` (the only source change of the upgrade).

### MODIFIED: `apps/api/jest.config.cjs`

Added `transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)']` — the minimal empirically-verified pattern — so `@swc/jest` transforms the ESM-published `@nestjs/*` 12 packages for the CJS Jest pipeline. Without this pattern the 54 api tests fail with "Cannot use import statement outside a module" — verified empirically with `--skip-nx-cache`.

### ADDED: direct rate-limit test (user-approved option B — form decided at implementation, task 3.10)

Either `apps/api/__tests__/app/throttler-guard.test.ts` (unit form: `Test.createTestingModule` + small-limit `ThrottlerModule` + supertest) or `apps/web/e2e/api-rate-limit.spec.ts` (E2E form, isolated from the other API specs). The chosen file asserts the 429 + `ThrottlerException: Too Many Requests` response of the global `ThrottlerGuard` (`@nestjs/throttler` 6.5.0) under NestJS 12, without contaminating the existing suites via the shared throttling budget.

### MODIFIED: `README.md`, `apps/api/README.md`, `AGENTS.md`, `ROADMAP.md`, `openspec/config.yaml`

Version tables/mentions, D-series renumbering with cross-reference sync, I01 audit numbers, stale `config.yaml` context refresh.

### NOT MODIFIED (explicitly)

`apps/api/src/main.ts`, `apps/api/webpack.config.js`, `.spec.swcrc`, all existing controllers/services/DTOs/unit tests, the existing `apps/web/e2e/` specs (the rate-limit test of task 3.10 adds a new file without modifying them), `.github/workflows/ci.yml`, `CHANGELOG.md`.
