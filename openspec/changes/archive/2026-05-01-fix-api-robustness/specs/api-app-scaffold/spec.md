## ADDED Requirements

### Requirement: Bootstrap error handling

The API bootstrap function MUST catch unhandled errors, log a clear fatal message to stderr, and call `process.exit(1)` so that process supervisors can detect and restart a failed deployment.

#### Scenario: Bootstrap fails due to port conflict

- **WHEN** `bootstrap()` throws (e.g. EADDRINUSE)
- **THEN** the error is logged to stderr with the prefix `'Fatal error during bootstrap:'`
- **THEN** the process exits with code `1`

#### Scenario: Bootstrap succeeds normally

- **WHEN** `bootstrap()` resolves without error
- **THEN** the `.catch()` handler is not invoked and the process remains running

---

### Requirement: CORS configuration via environment variable

The API MUST enable CORS with an origin controlled by the `CORS_ORIGIN` environment variable. If `CORS_ORIGIN` is not set, the default allowed origin MUST be `http://localhost:3000`.

#### Scenario: CORS_ORIGIN is set to a Vercel URL

- **WHEN** `CORS_ORIGIN=https://eco-metrics.vercel.app` is set in the environment
- **THEN** the API responds with `Access-Control-Allow-Origin: https://eco-metrics.vercel.app` on cross-origin requests from that origin

#### Scenario: CORS_ORIGIN is not set (local development)

- **WHEN** `CORS_ORIGIN` is absent from the environment
- **THEN** the API allows cross-origin requests from `http://localhost:3000` by default

#### Scenario: CORS_ORIGIN is documented in .env.example

- **WHEN** a developer clones the repository
- **THEN** `.env.example` lists `CORS_ORIGIN` with a comment explaining its purpose and the default value

---

### Requirement: Startup env var validation with Joi

`AppModule` MUST validate environment variables at startup using a Joi schema passed to `ConfigModule.forRoot()`. Invalid or missing required env vars MUST cause the application to crash immediately with a clear validation error message, before any request is served.

#### Scenario: PORT is set to a non-numeric string

- **WHEN** `PORT=not-a-port` is set in the environment
- **THEN** the application fails to start and logs a Joi validation error identifying `PORT` as invalid

#### Scenario: NODE_ENV is set to an unrecognised value

- **WHEN** `NODE_ENV=staging` is set in the environment
- **THEN** the application fails to start and logs a Joi validation error identifying `NODE_ENV` as invalid

#### Scenario: Neither PORT nor NODE_ENV is set

- **WHEN** both `PORT` and `NODE_ENV` are absent from the environment
- **THEN** the application starts successfully using the defaults (`PORT=3001`, `NODE_ENV=development`)

#### Scenario: PORT is a valid numeric string

- **WHEN** `PORT=3001` is set in the environment
- **THEN** the application starts successfully and Joi coerces the value to the number `3001`

---

## MODIFIED Requirements

### Requirement: Test de smoke del BFF _(modified)_

The original requirement mandated at least one smoke test for `AppModule`. This requirement is extended: in addition to the `AppModule` smoke test, a dedicated unit test file MUST exist for `AppConfigService` at `apps/api/__tests__/config/app-config.service.test.ts`, covering all public getters with both present and absent env var values.

#### Scenario: Test de smoke del BFF pasa _(unchanged)_

- **WHEN** `nx test api` is executed
- **THEN** the smoke test passes and Jest returns exit code 0

#### Scenario: AppConfigService port getter returns configured value

- **WHEN** `ConfigService` returns `4000` for the key `'PORT'`
- **THEN** `AppConfigService.port` returns `4000`

#### Scenario: AppConfigService port getter returns default value

- **WHEN** `ConfigService` returns `undefined` for the key `'PORT'`
- **THEN** `AppConfigService.port` returns `3001`

#### Scenario: AppConfigService nodeEnv getter returns configured value

- **WHEN** `ConfigService` returns `'production'` for the key `'NODE_ENV'`
- **THEN** `AppConfigService.nodeEnv` returns `'production'`

#### Scenario: AppConfigService nodeEnv getter returns default value

- **WHEN** `ConfigService` returns `undefined` for the key `'NODE_ENV'`
- **THEN** `AppConfigService.nodeEnv` returns `'development'`
