## Why

The API logs through Nest's built-in `Logger`, which prints human-oriented text. On Cloud Run that text lands in Cloud Logging as an unstructured `textPayload`: every line has severity `DEFAULT`, error stacks are split across entries, nothing correlates an application log line with the request log Cloud Run writes for the same request, and Error Reporting cannot group failures. The web app's server-side BFF errors (`console.error` in `bffFetch.ts`) cannot be matched to the API log lines they caused.

This is the first half of the monitoring and observability roadmap item. It makes the API logs structured and Cloud Logging native, at zero new cost and with no external account. Error tracking with Sentry is a separate, later change; this change is designed so that change plugs in without rework (the global exception filter stays the single place where errors are logged).

## Goals

- Replace Nest's logger app-wide with `nestjs-pino` (JSON to stdout), keeping every existing `new Logger(Context)` call site working unchanged.
- Cloud Logging compatibility: `severity` field, `message` key, error stacks in `message` so Error Reporting groups API errors automatically on Cloud Run, and correlation with Cloud Run's request logs through `logging.googleapis.com/trace`.
- A request id on every log line of a request, echoed in the `X-Request-ID` response header, and a trace correlation header sent by the web's `bffFetch` so a Vercel log line can be matched to the API log lines it caused.
- Redaction of credentials, no request or response bodies in logs, no noise from the startup probe, log level by status.
- An optional `LOG_LEVEL` env var with environment-aware defaults (quiet Jest output, pretty local output, no pino-pretty in the production image).
- Documentation of where to find logs and Error Reporting, and how to optionally enable its email notifications.

## Non-Goals

- Sentry on the web or the API, source maps, Sentry alerts or an uptime monitor (a separate later change that needs an external account). The only provision is a note in the design: `@SentryExceptionCaptured()` on the global exception filter is the future hook.
- OpenTelemetry, distributed tracing spans, metrics, or log shipping to third parties.
- Structured logging in the web app. Only its BFF failure log line gains the trace id; it stays a `console.error`.
- Logging request or response bodies, or response payload contents.
- Changing any API response body or status code. Only the `X-Request-ID` response header is added.
- A Cloud Logging log-based metric, alert policy, or log sink; Error Reporting notifications are an optional manual console step, documented only.
- Provisioning the GCP project, IAM, or Error Reporting API (Cloud Run already writes to Cloud Logging, and Error Reporting reads from it with no setup).
- Editing the roadmap document beyond a final task that marks the structured-logging part done.

## Impact

- `apps/api`: new dependencies (`nestjs-pino`, `pino`, `pino-http`; `pino-pretty` as a devDependency), new `common/logging/` helpers and `AppLoggingModule`, `main.ts` bootstrap (`bufferLogs`, `useLogger`, single-line JSON fatal entry), `AllExceptionsFilter` log call, env schema and `AppConfigService` (`LOG_LEVEL`, `GCP_PROJECT_ID`).
- `.github/workflows/deploy-api.yml`: passes `GCP_PROJECT_ID` (an existing GitHub variable, already required by the pre-flight check) to the service env.
- `apps/web/src/lib/bffFetch.ts`: sends a fresh W3C `traceparent` per attempt and includes the trace ids in its failure log.
- Docs: `README.md` and `apps/api/.env.example` (env vars), `docs/deploy/cloud-run.md` (logs, Error Reporting), `AGENTS.md` (structure tree, logging convention).
- Specs: new capability `api-structured-logging`; modified `provider-failure-contract`, `bff-fetch-helper`, `api-cloud-run-deploy`.
- No API contract, shared type, or page behavior changes. No E2E change is needed: nothing user-visible changes and the logging behavior is fully observable through unit and in-process integration tests.
