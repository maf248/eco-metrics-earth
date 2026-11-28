# web-error-tracking Specification

## Purpose

Web error tracking with Sentry: opt-in by DSN, server errors through onRequestError, client errors through the error boundaries, errors only, and source maps uploaded and never served.

## Requirements

### Requirement: Sentry is enabled only when a DSN is configured

The web app SHALL initialize `@sentry/nextjs` in the browser and in the Node.js server runtime only when `NEXT_PUBLIC_SENTRY_DSN` is a non-empty string. Without it no SDK is initialized and no network call is made. Options SHALL come from a pure helper in `src/lib/sentryConfig.ts` that returns `undefined` without a DSN.

#### Scenario: DSN unset

- **GIVEN** `NEXT_PUBLIC_SENTRY_DSN` is unset or empty
- **WHEN** the options helper runs and the instrumentation files execute
- **THEN** the helper returns `undefined` and `Sentry.init` is not called

#### Scenario: DSN set

- **GIVEN** a DSN, environment `preview` and release `abc123`
- **WHEN** the options helper runs
- **THEN** it returns those three values in `dsn`, `environment` and `release`

### Requirement: Only errors are sent and no personal data

The Sentry options SHALL set `sendDefaultPii: false`, SHALL NOT set any tracing, profiling, replay or logs option, and SHALL remove the default `BrowserSession` integration, so a page view sends nothing unless an error occurs. The build SHALL exclude tracing and replay code from the client bundle.

#### Scenario: Options are errors-only

- **WHEN** the options helper runs with a DSN
- **THEN** `sendDefaultPii` is `false`, no tracing, replay or logs option is defined and the filtered default integrations do not include `BrowserSession`

### Requirement: Events carry the environment and the commit release

The environment SHALL be Vercel's `VERCEL_ENV` (`production` or `preview`) captured at build time, `development` when absent. The release SHALL be `VERCEL_GIT_COMMIT_SHA` captured at build time, and omitted when absent. Both SHALL be inlined for the browser and read by the server.

#### Scenario: Preview build

- **GIVEN** `VERCEL_ENV=preview` and `VERCEL_GIT_COMMIT_SHA=abc123` at build time
- **WHEN** the config is resolved
- **THEN** the inlined environment is `preview` and the release is `abc123`

#### Scenario: Local build

- **GIVEN** neither variable is set
- **WHEN** the config is resolved
- **THEN** the environment is `development` and the release is undefined

### Requirement: Server errors are reported through onRequestError

`src/instrumentation.ts` SHALL initialize the server SDK in `register()` for the `nodejs` runtime only, and SHALL export `onRequestError` as `Sentry.captureRequestError`, so errors from Server Components and route handlers are reported once by Next's own hook.

#### Scenario: Hook is exported

- **WHEN** `instrumentation.ts` is imported
- **THEN** `onRequestError` is the Sentry `captureRequestError` function

#### Scenario: Edge runtime is not initialized

- **GIVEN** `NEXT_RUNTIME` is `edge`
- **WHEN** `register()` runs
- **THEN** `Sentry.init` is not called

### Requirement: Client-originated errors are reported by the boundaries

`src/app/error.tsx` and a new `src/app/global-error.tsx` SHALL call `Sentry.captureException` for an error without a `digest` and SHALL NOT for one with a `digest`, which Next already reported through `onRequestError`. `error.tsx` SHALL stop logging to the console. `global-error.tsx` SHALL render its own `<html>` and `<body>`, a heading and a retry button, and no color utilities. The retry button of both boundaries SHALL call `retry` (re-fetch and re-render the segment), not `reset`, which only re-renders and cannot recover from a failed server read.

#### Scenario: Client render error

- **WHEN** `ErrorPage` receives an error with no `digest`
- **THEN** `captureException` is called once with it

#### Scenario: Server-originated error

- **WHEN** `ErrorPage` or `GlobalError` receives an error with a `digest`
- **THEN** `captureException` is not called

#### Scenario: Global error fallback

- **WHEN** `GlobalError` renders
- **THEN** the output contains `<html>`, `<body>`, a heading and a retry button that calls `retry`

### Requirement: Known noise is not sent

The client options SHALL ignore the two `ResizeObserver` loop messages and SHALL deny URLs that start with `chrome-extension://`, `moz-extension://` or `safari-extension://`.

#### Scenario: Noise lists are configured

- **WHEN** the options helper runs with a DSN
- **THEN** `ignoreErrors` contains both `ResizeObserver` messages and `denyUrls` matches the three extension schemes

### Requirement: Source maps are uploaded during the build and never served

`next.config.ts` SHALL wrap the config with `withSentryConfig` using the org, project and EU `sentryUrl`, `SENTRY_AUTH_TOKEN` from the environment and `telemetry: false`. With a token the build SHALL upload source maps and delete them from the output; without one it SHALL disable source-map generation for Sentry and still succeed.

#### Scenario: Build without token

- **GIVEN** `SENTRY_AUTH_TOKEN` is unset
- **WHEN** `nx build web` runs
- **THEN** the build succeeds and `apps/web/.next/static` contains no `.map` file

#### Scenario: Build with token

- **GIVEN** `SENTRY_AUTH_TOKEN` is set
- **WHEN** the build finishes
- **THEN** source maps were uploaded for the release and `apps/web/.next/static` contains no `.map` file

### Requirement: Tests and E2E never reach Sentry

Jest and the Playwright E2E servers SHALL run with no Sentry DSN, even when a developer's local env file defines one.

#### Scenario: Jest ignores a local DSN

- **WHEN** the Jest setup runs
- **THEN** `process.env.NEXT_PUBLIC_SENTRY_DSN` is undefined

#### Scenario: E2E web process has no DSN

- **WHEN** the E2E wrapper starts the web dev server
- **THEN** its environment has `NEXT_PUBLIC_SENTRY_DSN` set to an empty string
