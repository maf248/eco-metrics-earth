## Why

A config audit of `apps/api` identified five correctness and robustness issues that, left unaddressed, will cause silent failures in production and make the API unreachable from the web frontend:

- **F-008** — `main.ts` calls `bootstrap()` but drops the returned Promise. If NestJS fails to start (e.g. port already in use, misconfigured module), the error is swallowed and the process exits with code 0 and no log output.
- **F-009 / F-025** — `AppConfigService` is registered as a DI provider in `AppModule` but is never consumed. `main.ts` reads `process.env['PORT']` directly, bypassing the service. The service exists as dead code with no consumers.
- **F-020** — No CORS configuration is set in `main.ts`. In production, cross-origin requests from the Vercel-hosted web frontend to the Railway-hosted API will be blocked by browsers, making the app non-functional.
- **F-021** — `ConfigModule.forRoot()` uses no validation schema. If `PORT` is set to a non-numeric string, it is silently used as the wrong type. Missing required env vars produce no startup error.
- **F-026** — `app-config.service.ts` has no corresponding test file. Per the project's AGENTS.md conventions, every source file must have a matching test in `__tests__/` mirroring the `src/` structure.

## What Changes

- `apps/api/src/main.ts` — add `.catch()` error handler to the `bootstrap()` call; add `app.enableCors()` with `CORS_ORIGIN` env var support.
- `apps/api/src/app/app.module.ts` — add a Joi `validationSchema` to `ConfigModule.forRoot()` to validate `PORT` and `NODE_ENV` at startup.
- `.env.example` (repo root or `apps/api/`) — document the `CORS_ORIGIN` env var.
- `apps/api/__tests__/config/app-config.service.test.ts` — new test file for `AppConfigService`, covering `port` and `nodeEnv` getters.

## Non-Goals

- No new API endpoints or business logic.
- No changes to the health check response format.
- No migration of `main.ts` to use `AppConfigService` via `app.get()` — this is intentionally deferred; `AppConfigService` is documented as a DI-context service for use within controllers and services, not for bootstrap.
- No changes to `packages/shared` or `apps/web`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`api-app-scaffold`** — the existing scaffold capability is updated to require: bootstrap error handling, CORS configuration via env var, startup env var validation via Joi, and a test file for `AppConfigService`.

## Impact

- **`apps/api`** — four source-level changes (main.ts, app.module.ts, .env.example, new test file).
- **`apps/web`** — no changes, but cross-origin requests will start working once `CORS_ORIGIN` is set correctly in the API deployment.
- **No breaking changes** — all modifications are additive or harden existing behaviour. The API contract (routes, response shapes) is unchanged.
