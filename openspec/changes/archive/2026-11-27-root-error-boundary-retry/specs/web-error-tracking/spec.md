## MODIFIED Requirements

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
