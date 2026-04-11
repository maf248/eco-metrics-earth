## Context

`apps/api` is a NestJS BFF bootstrapped as part of the `api-app-scaffold` change. A config audit against the running codebase revealed five gaps (F-008, F-009/F-025, F-020, F-021, F-026) that affect production correctness and developer experience. None of these require new endpoints or business logic — they are all hardening changes to the startup path and the test coverage baseline.

Current state of the relevant files:

- `main.ts` — calls `bootstrap()` with no `.catch()`, reads `PORT` from `process.env` directly, has no CORS setup.
- `app.module.ts` — uses `ConfigModule.forRoot({ isGlobal: true })` with no `validationSchema`.
- `app-config.service.ts` — exposes `port` and `nodeEnv` getters via `ConfigService`; has no test file.

## Goals / Non-Goals

**Goals:**

- Ensure unhandled bootstrap errors are logged and cause a non-zero exit.
- Enable CORS for cross-origin requests from the web frontend, controlled by an env var.
- Validate required env vars at startup so misconfiguration fails fast with a clear message.
- Provide test coverage for `AppConfigService` per AGENTS.md conventions.

**Non-Goals:**

- Migrating `main.ts` to retrieve the port via `app.get(AppConfigService)` — the DI container is not yet fully wired at bootstrap time and the added complexity is not justified for a single env var read.
- Replacing `AppConfigService` with a class-validator config class — Joi inline validation is sufficient for the current two vars.
- Adding end-to-end CORS tests — unit and integration tests are enough for this change.

## Decisions

### F-008 Bootstrap error handling

Append `.catch((err: unknown) => { console.error('Fatal error during bootstrap:', err); process.exit(1); })` to the `bootstrap()` call in `main.ts`.

This is the idiomatic Node.js pattern for top-level unhandled Promise rejections. It ensures the process exits with code 1 and emits a visible log message, which is required for process supervisors (Railway, Docker) to detect and restart a failed deployment.

Rejected alternative: wrapping the body of `bootstrap()` in `try/catch` — equivalent in effect but less conventional for a fire-and-forget top-level call.

### F-009 / F-025 AppConfigService usage

`AppConfigService` remains in `AppModule.providers` — it is the correct location for DI-managed config access within controllers and services. The fix is documentation only: a JSDoc comment on the service clarifies that it is intended for use within the NestJS DI context, not in the bootstrap function.

`main.ts` continues to read `process.env['PORT']` directly. This is acceptable because `main.ts` executes before the DI container is wired and calling `app.get()` after `app.listen()` just to read the port would invert the dependency unnecessarily.

Rejected alternative: calling `app.get(AppConfigService)` after `await app.listen()` — possible but adds coupling between bootstrap and the DI container for no real benefit.

### F-020 CORS configuration

Add `app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' })` to `main.ts`, immediately after `app.setGlobalPrefix()`.

`CORS_ORIGIN` defaults to `http://localhost:3000` (the web dev server) so local development works with no env file changes. In production, `CORS_ORIGIN` is set to the Vercel deployment URL in the Railway environment variables.

Rejected alternative: allowing all origins (`origin: '*'`) — insecure for a production BFF that may carry authenticated requests in the future.

### F-021 Env var validation

Add a `validationSchema` option to `ConfigModule.forRoot()` in `app.module.ts` using the `joi` package:

```ts
validationSchema: Joi.object({
  PORT: Joi.number().port().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
}),
validationOptions: { allowUnknown: true, abortEarly: true },
```

`allowUnknown: true` is required so that other env vars (e.g. database URLs, API keys) do not cause validation failures before their respective modules are implemented.

`joi` must be added to `apps/api/package.json` as a production dependency (it is a runtime validation concern, not just a dev tool). Check if `@hapi/joi` is already present; prefer the standalone `joi` package.

Rejected alternative: class-validator with a typed config class — correct but significantly more boilerplate (class, `ConfigModule.forRoot({ validate })` factory, decorator imports) for only two variables.

### F-026 AppConfigService test

Create `apps/api/__tests__/config/app-config.service.test.ts`. The test instantiates `AppConfigService` with a mocked `ConfigService` using `jest.fn()` — no `Test.createTestingModule()` overhead needed for a pure unit test.

Test cases:

- `port` getter returns the numeric value from `ConfigService` when `PORT` is set.
- `port` getter returns `3001` (default) when `ConfigService` returns `undefined` for `PORT`.
- `nodeEnv` getter returns the string value from `ConfigService` when `NODE_ENV` is set.
- `nodeEnv` getter returns `'development'` (default) when `ConfigService` returns `undefined` for `NODE_ENV`.

## Risks / Trade-offs

| Risk                                                             | Likelihood | Mitigation                                                                           |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| Adding Joi as a runtime dep increases bundle size                | Low        | Joi is small; NestJS config validation with Joi is the officially documented pattern |
| `CORS_ORIGIN` misconfiguration blocks the frontend in production | Low        | Defaults to localhost for dev; documented in `.env.example`; clear env var name      |
| Joi validation rejects a valid `PORT` string (e.g. `"3001"`)     | None       | `Joi.number().port()` coerces numeric strings automatically                          |
| Bootstrap `.catch()` masks the original stack trace              | None       | `console.error` logs the full `err` object including stack                           |
