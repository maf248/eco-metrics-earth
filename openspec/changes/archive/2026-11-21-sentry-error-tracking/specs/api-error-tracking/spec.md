## ADDED Requirements

### Requirement: Sentry is enabled only when a DSN is configured

The API SHALL initialize `@sentry/nestjs` only when `SENTRY_DSN` is a non-empty string. Without it the SDK SHALL NOT be initialized, so no network call is made and `Sentry.captureException` is a no-op. The options SHALL come from a pure exported builder that takes the environment and returns `undefined` when the DSN is missing.

#### Scenario: DSN unset disables Sentry

- **GIVEN** `SENTRY_DSN` is unset or empty
- **WHEN** the options builder runs and `instrument.ts` is imported
- **THEN** the builder returns `undefined` and `Sentry.init` is not called

#### Scenario: DSN set enables Sentry

- **GIVEN** `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` and `SENTRY_RELEASE=abc123`
- **WHEN** the options builder runs
- **THEN** it returns `dsn`, `environment: 'production'` and `release: 'abc123'`

### Requirement: Sentry initializes before the application modules load

`apps/api/src/instrument.ts` SHALL initialize Sentry and SHALL be the first import of `main.ts`, before any `@nestjs/*`, `express`, `axios` or application import, so the SDK can instrument those modules.

#### Scenario: instrument is the first import

- **WHEN** the source of `apps/api/src/main.ts` is read
- **THEN** its first import statement is `import './instrument'`

### Requirement: Only errors are sent and no personal data

The Sentry options SHALL set `sendDefaultPii: false` and SHALL NOT set `tracesSampleRate`, `tracesSampler`, `profilesSampleRate` or `enableLogs`, so no traces, profiles or Sentry logs are produced.

#### Scenario: Options carry no tracing, profiling or PII

- **GIVEN** a DSN is configured
- **WHEN** the options builder runs
- **THEN** `sendDefaultPii` is `false` and none of the tracing, profiling or logs options is defined

### Requirement: AllExceptionsFilter is the single Sentry capture point for 5xx

`AllExceptionsFilter` SHALL call `Sentry.captureException` exactly once for each response with status 500 or above, and never for a status below 500. The API SHALL NOT register `SentryModule`, `SentryGlobalFilter` or `@SentryExceptionCaptured`. The existing Cloud Logging error entry and the response body SHALL be unchanged.

#### Scenario: Unexpected error is captured once

- **WHEN** the filter handles a plain `Error`
- **THEN** `captureException` is called once with that error, the logger writes its one `ERROR` entry and the response is the unchanged `500` body

#### Scenario: 4xx are never captured

- **WHEN** the filter handles `HttpException` with status 400, 401, 404 or 429
- **THEN** `captureException` is not called

#### Scenario: Provider failure is captured with a fixed fingerprint

- **WHEN** the filter handles a `ProviderError`
- **THEN** `captureException` is called once with fingerprint `['provider-unavailable']` and level `warning`, and the response is the unchanged `502`

### Requirement: Captures are throttled per event group to protect the monthly quota

A throttle SHALL key each 5xx by its event group: `provider-unavailable` for every `ProviderError`, else `name: message`. It SHALL admit a group at most once per 6 hours for `provider-unavailable` and once per 5 minutes for any other group. A suppressed capture SHALL still log and respond as before. The throttle SHALL take an injectable clock and keep its state in memory.

#### Scenario: Repeated provider outage is collapsed

- **GIVEN** a `provider-unavailable` capture was admitted at time T
- **WHEN** another `ProviderError` is handled at T + 10 minutes, then at T + 6 hours
- **THEN** the first is suppressed and the second is admitted

#### Scenario: Distinct unexpected errors pass, duplicates do not

- **WHEN** two errors with different messages and then the first one again within 5 minutes are handled
- **THEN** the first two are admitted and the repeat is suppressed

#### Scenario: A repeat after the window is admitted

- **WHEN** the same unexpected error is handled at T and again at T + 5 minutes
- **THEN** both are admitted

### Requirement: Events are flushed before the response and never break it

When a capture was admitted, the filter SHALL await `Sentry.flush` bounded to 2000 ms before writing the response, because Cloud Run throttles CPU after the response. A throwing or timing-out Sentry call SHALL NOT change the status or body of the response.

#### Scenario: Flush is awaited for an admitted capture

- **WHEN** the filter handles an unexpected error and the throttle admits it
- **THEN** `flush` is called with 2000 before `response.json`

#### Scenario: Sentry failure does not alter the response

- **GIVEN** `captureException` throws
- **WHEN** the filter handles an unexpected error
- **THEN** the response is still the `500` body and no exception escapes the filter

### Requirement: Sentry settings are validated environment variables

`env-validation.schema.ts` SHALL accept optional `SENTRY_DSN` (an `https` URI, or empty), `SENTRY_ENVIRONMENT` (kebab-case, or empty) and `SENTRY_RELEASE` (1 to 200 characters without whitespace, or empty). A malformed value SHALL fail startup with a message naming the variable.

#### Scenario: Unset or empty values are accepted

- **WHEN** the environment has none of the three variables, or all three empty
- **THEN** validation passes

#### Scenario: Malformed DSN fails startup

- **WHEN** the environment has `SENTRY_DSN=not a url`
- **THEN** validation fails with a message naming `SENTRY_DSN`

### Requirement: The deploy workflow configures Sentry per target

`deploy-api.yml` SHALL pass `SENTRY_DSN` (from the repository variable `SENTRY_DSN_API`), `SENTRY_ENVIRONMENT` (the deploy target) and `SENTRY_RELEASE` (the commit SHA) to Cloud Run only when the variable is set. A missing variable SHALL NOT fail the pre-flight checks.

#### Scenario: Variable set

- **GIVEN** `SENTRY_DSN_API` is set and the target is `development`
- **WHEN** the workflow prepares the Cloud Run env vars
- **THEN** they include `SENTRY_DSN`, `SENTRY_ENVIRONMENT=development` and `SENTRY_RELEASE=<sha>`

#### Scenario: Variable unset

- **GIVEN** `SENTRY_DSN_API` is unset
- **WHEN** the workflow runs
- **THEN** none of the three variables is passed and the pre-flight check still succeeds

### Requirement: The API image starts Node with source maps enabled

The API image `CMD` SHALL start Node with `--enable-source-maps`, so `Error.stack` points to the TypeScript sources using the `main.js.map` shipped in the image. The API SHALL NOT upload source maps to Sentry and SHALL NOT need a Sentry auth token.

#### Scenario: The image command enables source maps

- **WHEN** the `CMD` of the `Dockerfile` is read
- **THEN** it runs `node` with `--enable-source-maps` before `main.js`

#### Scenario: Built stacks map to TypeScript

- **WHEN** the production build is run with `node --enable-source-maps` and an error thrown from application code prints its stack
- **THEN** the frames reference `.ts` paths, not `main.js`

### Requirement: Tests and E2E never reach Sentry

Jest and the Playwright E2E servers SHALL run with no Sentry DSN, so the SDK is disabled and makes no network call, even when a developer's local `.env` defines one.

#### Scenario: E2E API process has no DSN

- **WHEN** the E2E wrapper starts the API
- **THEN** its environment has `SENTRY_DSN` set to an empty string
