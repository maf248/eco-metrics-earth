# api-app-scaffold Specification

## Purpose

Defines the NestJS BFF scaffold with per-category modules, global `/api/v1` prefix, typed config, and smoke test.

## Requirements

### Requirement: NestJS app with modular per-category structure

The original requirement stands: the `api` app SHALL have a root module (`AppModule`) and a `modules/` folder prepared to host per-eco-category modules, each following `modules/<category>/<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`. Updated: the app SHALL run on **NestJS 12** — `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, and `@nestjs/testing` pinned at exactly `12.1.2`, `@nestjs/swagger` at exactly `12.0.2`, `@nestjs/config` at exactly `12.0.1` (no `^`/`~`), with `@nestjs/throttler` at `6.7.1` (peer range declares NestJS 12 since 6.7.1 — pin retired). The app SHALL remain CommonJS; the ESM-published `@nestjs/*` 12 packages are consumed via Node's native `require(esm)`.

#### Scenario: API responds on the correct port _(unchanged behavior, new framework major)_

- **GIVEN** the workspace with the `@nestjs/*` 12.x exact pins installed and the lockfile in sync
- **WHEN** `nx serve api` is executed
- **THEN** NestJS 12 starts on `http://localhost:3001` without errors or warnings

#### Scenario: Health check endpoint available _(unchanged)_

- **WHEN** a GET is sent to `http://localhost:3001/api/v1/health`
- **THEN** the server responds with status 200 and body `{ "status": "ok" }`

#### Scenario: NestJS versions pinned exactly with no nested 11.x copies

- **WHEN** `apps/api/package.json` and the installed tree are inspected after the upgrade
- **THEN** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` are pinned at `"12.1.2"`, `@nestjs/swagger` at `"12.0.2"` and `@nestjs/config` at `"12.0.1"` — exact, no `^`/`~`
- **AND** `npm ls @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/swagger @nestjs/config @nestjs/testing` resolves a single 12.x version each, with no nested 11.x copies

### Requirement: Global route prefix configured

All BFF endpoints SHALL be under the `/api/v1` prefix. The prefix SHALL be configured globally in the application bootstrap.

#### Scenario: Routes without prefix return 404

- **WHEN** a GET is made to `http://localhost:3001/health` (without prefix)
- **THEN** the server returns status 404

#### Scenario: Routes with correct prefix respond

- **WHEN** a GET is made to `http://localhost:3001/api/v1/health`
- **THEN** the server returns status 200

### Requirement: BFF base folder structure

The `api` app SHALL have the following structure inside `src/`:

- `modules/` — NestJS modules per ecological category
- `common/` — shared pipes, interceptors, guards, and filters
- `config/` — application configuration (typed env vars)

#### Scenario: Config module loads environment variables

- **WHEN** the app starts with a valid `.env`
- **THEN** the environment variables are available typed through the NestJS ConfigService

### Requirement: BFF smoke test

At least one smoke test SHALL exist that verifies `AppModule` compiles and the health check responds correctly.

#### Scenario: BFF smoke test passes

- **WHEN** `nx test api` is run
- **THEN** the smoke test passes and Jest returns exit code 0

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

`AppModule` SHALL validate environment variables at startup via `ConfigModule.forRoot` with the existing Joi schema (Joi 18.2.9, unchanged). Joi-specific options (`allowUnknown: true`, `abortEarly: true`) SHALL be passed under `validationOptions.libraryOptions` — the `@nestjs/config` 12 Standard Schema validation contract. The observable validation behavior SHALL remain identical to NestJS 11: unknown env vars are tolerated, the first invalid variable aborts startup with a clear error, and absent variables fall back to the schema defaults.

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

The API SHALL exhibit identical observable behavior on NestJS 12 as on NestJS 11 for all existing endpoints and cross-cutting concerns: the health check, 404 handling, DTO validation, security headers (helmet), the global rate-limiting guard, and the OpenAPI document. No request/response body contract changes. (CORS header behavior was subsequently changed by the multi-origin CORS change and is owned by the `api-security-hardening` capability: `Access-Control-Allow-Origin` is emitted only for requests whose `Origin` matches an allowed origin.)

#### Scenario: Health, 404, and validation contracts unchanged

- **WHEN** the existing unit tests (`npx nx test api`) and the E2E API specs (`apps/web/e2e/api-health.spec.ts`) run against the NestJS 12 app
- **THEN** all pass with zero errors and zero warnings — health 200 `{ "status": "ok" }`, unknown routes 404 JSON, invalid POST body 400 with `error`, query echo 200

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

### Requirement: NestJS-family audit advisories eliminated

The dependency tree SHALL be free of `npm audit` advisories whose vulnerable chain routes through `@nestjs/platform-express` → `multer` or `@nestjs/swagger` → `js-yaml`. Before/after audit counts SHALL be documented; the expected reduction is ~8 advisories from the 32 baseline. Advisories without an available fix (`express`/`qs`/`body-parser`) and non-NestJS families (`semantic-release` subtree, `concurrently`) explicitly remain out of scope.

#### Scenario: multer and js-yaml chains gone from the audit

- **GIVEN** the lockfile regenerated with `@nestjs/*` 12.x (`multer` 2.3.0 via root override — 2.2.0 has 3 verified high advisories; `js-yaml` 5.4.1)
- **WHEN** `npm audit --json` is executed
- **THEN** no advisory lists `multer` or `js-yaml` as a vulnerable package
- **AND** `@nestjs/platform-express` / `@nestjs/swagger` no longer appear as fix paths for those chains

#### Scenario: Audit counts recorded

- **WHEN** the upgrade completes
- **THEN** the before (32: 4 critical, 21 high, 5 moderate, 2 low) and after counts are recorded in ROADMAP.md (status table, "Dependencias" row)
- **AND** the after count is ~8 lower (the exact number is recorded, not promised)
