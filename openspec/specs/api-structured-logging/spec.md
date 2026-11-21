# api-structured-logging Specification

## Purpose

Structured, Cloud Logging native API logs: severity, request id, Cloud Run trace correlation, redaction and Error Reporting grouping.

## Requirements

### Requirement: The API logs through nestjs-pino as structured JSON

The API SHALL use `nestjs-pino` as its only logger. `main.ts` SHALL create the app with `bufferLogs: true` and call `app.useLogger(app.get(Logger))` (the `nestjs-pino` `Logger`) so that boot logs and every `new Logger(Context)` call site from `@nestjs/common` are emitted by pino without changing those call sites. Outside `NODE_ENV=development` each log entry SHALL be one JSON object per line on stdout. Application code under `apps/api/src` SHALL NOT call `console.*`.

#### Scenario: Existing Nest Logger call sites are routed through pino

- **GIVEN** the app booted with the pino logger installed and `NODE_ENV=production`
- **WHEN** a service calls `new Logger('X').warn('message')`
- **THEN** one JSON line is written to stdout with `severity` `WARNING`, `message` `message` and `context` `X`

#### Scenario: Bootstrap installs the logger before listening

- **GIVEN** `NestFactory.create` mocked in the bootstrap test
- **WHEN** `bootstrap()` runs
- **THEN** `NestFactory.create` is called with `bufferLogs: true` and `abortOnError: false`, and `useLogger` is called once, before `listen`

#### Scenario: No console calls in the API sources

- **WHEN** the lint step runs over `apps/api/src`
- **THEN** no `console.*` call and no `eslint-disable` for `no-console` remains

### Requirement: Log entries follow the Cloud Logging structured format

The pino options SHALL map the level to a string `severity` field (`trace` and `debug` to `DEBUG`, `info` to `INFO`, `warn` to `WARNING`, `error` to `ERROR`, `fatal` to `CRITICAL`) through a pure exported function, use `message` as the message key, write an ISO 8601 `time`, and omit `level`, `pid` and `hostname`. In `NODE_ENV=development` the severity formatter SHALL NOT be applied.

#### Scenario: Every pino level maps to a Cloud Logging severity

- **WHEN** the level formatter receives `trace`, `debug`, `info`, `warn`, `error` and `fatal`
- **THEN** it returns `{ severity }` with `DEBUG`, `DEBUG`, `INFO`, `WARNING`, `ERROR` and `CRITICAL` respectively

#### Scenario: Production output uses severity and message

- **GIVEN** a logger built with the production options writing to a captured stream
- **WHEN** it logs `info` with the message `hello`
- **THEN** the parsed line has `severity: 'INFO'`, `message: 'hello'`, an ISO `time`, and has no `level`, `pid` or `hostname`

### Requirement: Log entries correlate with Cloud Run request logs

When the request has a valid trace context and `GCP_PROJECT_ID` is set, every log line of the request SHALL carry `logging.googleapis.com/trace` (`projects/<GCP_PROJECT_ID>/traces/<TRACE_ID>`) and, when valid, `logging.googleapis.com/spanId`. The context SHALL be read from `traceparent` first, then `X-Cloud-Trace-Context`; a malformed one is ignored and the fields omitted. `GCP_PROJECT_ID` SHALL be optional, validated as a GCP project id, and read through `AppConfigService`.

#### Scenario: W3C traceparent yields trace fields

- **GIVEN** `GCP_PROJECT_ID=my-project` and a request with `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
- **WHEN** the request logs a line
- **THEN** the line has `logging.googleapis.com/trace: 'projects/my-project/traces/4bf92f3577b34da6a3ce929d0e0e4736'` and `logging.googleapis.com/spanId: '00f067aa0ba902b7'`

#### Scenario: X-Cloud-Trace-Context is the fallback

- **GIVEN** `GCP_PROJECT_ID=my-project` and a request with only `X-Cloud-Trace-Context: 105445aa7843bc8bf206b12000100000/1;o=1`
- **WHEN** the request logs a line
- **THEN** the trace field ends with `/traces/105445aa7843bc8bf206b12000100000` and the span field is `0000000000000001`

#### Scenario: Missing project id or malformed header omits the fields

- **GIVEN** either `GCP_PROJECT_ID` unset, or a `traceparent` with an all-zero trace id and no other header
- **WHEN** the request logs a line
- **THEN** the line has no `logging.googleapis.com/trace` field and the request is served normally

#### Scenario: GCP_PROJECT_ID is validated at startup

- **WHEN** the environment has `GCP_PROJECT_ID=Not A Project`
- **THEN** environment validation fails at startup with a message naming `GCP_PROJECT_ID`
- **AND** an unset or empty value is accepted

### Requirement: Every request has a safe request id

A request id SHALL be resolved for every request: the incoming `X-Request-ID` when it matches `^[A-Za-z0-9._-]{8,64}$`, else the trace id of the trace context, else a new UUID v4. It SHALL be echoed in the `X-Request-ID` response header on every response (including `401`, `404` and `5xx`) and appear as `requestId` in every log line of the request. An unsafe value SHALL be ignored and never reflected.

#### Scenario: A safe incoming id is accepted and echoed

- **WHEN** a client sends `X-Request-ID: web-1234.abcd_EF`
- **THEN** the response carries `X-Request-ID: web-1234.abcd_EF` and the request's log lines carry `requestId: 'web-1234.abcd_EF'`

#### Scenario: An unsafe incoming id is replaced

- **WHEN** a client sends an `X-Request-ID` that is longer than 64 characters, shorter than 8, contains a space, a newline-like or non-ASCII character, or is sent twice
- **THEN** the response carries a generated UUID in `X-Request-ID` and the unsafe value appears nowhere in the response headers or the logs

#### Scenario: A trace id is the id when no request id is sent

- **GIVEN** a request with a valid `traceparent` and no `X-Request-ID`
- **WHEN** the response is returned
- **THEN** `X-Request-ID` equals the 32-hex trace id of the `traceparent`

#### Scenario: A UUID is generated when nothing is sent

- **WHEN** a request without any of the three headers is served
- **THEN** `X-Request-ID` is a UUID v4 and differs between two requests

#### Scenario: The header is present on rejected requests

- **GIVEN** `INTERNAL_API_KEY` configured
- **WHEN** a client calls a category route without the key
- **THEN** the response is `401` and still carries `X-Request-ID`

### Requirement: Credentials and bodies are never logged

Request log serializers SHALL emit only `method` and `url` for the request and `statusCode` for the response; headers, bodies and payloads SHALL NOT be logged. As defense in depth, `redact` SHALL censor `authorization`, `cookie`, `x-api-key`, the internal key header (built from `INTERNAL_KEY_HEADER`) under `req.headers`, and `set-cookie` under `res.headers`. No endpoint carries a secret in its query string, so `url` keeps it.

#### Scenario: Secret headers do not reach the logs

- **GIVEN** a request with `Authorization`, `Cookie`, `X-Api-Key` and `X-Internal-Api-Key` headers carrying known marker values
- **WHEN** the request completes and its log output is captured
- **THEN** no marker value appears anywhere in the captured output and no `headers` object is present

#### Scenario: Redaction covers the headers if a serializer ever logs them

- **GIVEN** a logger built with the production options
- **WHEN** an object with `req.headers` holding the listed secret headers is logged
- **THEN** each listed header is censored in the output

#### Scenario: Bodies are not logged

- **WHEN** a `POST` with a JSON body is served
- **THEN** the log output does not contain the body content

### Requirement: Request completion logging is quiet and level-aware

pino-http SHALL write one completion line per request, except for `GET /api/v1/health` (query string and trailing slash ignored). The level SHALL be `info` below 400, `warn` for 4xx and `silent` for 5xx, because `AllExceptionsFilter` already logs every 5xx once with its stack.

#### Scenario: The startup probe is not logged

- **WHEN** `GET /api/v1/health` and `GET /api/v1/health?probe=1` are served
- **THEN** no completion line is written for either
- **AND** `GET /api/v1/health/dependencies` is logged

#### Scenario: Level follows the status

- **WHEN** requests answered `200`, `404` and `500` complete
- **THEN** the `200` is logged at `INFO`, the `404` at `WARNING`, and the `500` produces no pino-http completion line

### Requirement: LOG_LEVEL selects verbosity with environment defaults

`LOG_LEVEL` SHALL be an optional env var validated by Joi against the pino levels (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`). `AppConfigService.logLevel` SHALL return it when set, otherwise `info` when `NODE_ENV=production`, `debug` when `NODE_ENV=development` and `silent` when `NODE_ENV=test`, so Jest output stays clean.

#### Scenario: Defaults per environment

- **WHEN** `LOG_LEVEL` is unset and `NODE_ENV` is `production`, `development`, `test`
- **THEN** `logLevel` is `info`, `debug`, `silent` respectively

#### Scenario: Explicit value wins and invalid values are rejected

- **WHEN** `LOG_LEVEL=warn` is set
- **THEN** `logLevel` is `warn` in every environment
- **AND** `LOG_LEVEL=verbose` fails environment validation at startup with a message naming `LOG_LEVEL`

### Requirement: Pretty output is local-only and the production image does not need pino-pretty

When `NODE_ENV=development` the logger SHALL print human-readable output through the `pino-pretty` transport. Otherwise it SHALL write JSON to stdout with no transport. `pino-pretty` SHALL be a devDependency of `apps/api` only, SHALL NOT be imported statically, and the Docker image built from the pruned lockfile SHALL start and log in production without it.

#### Scenario: Production options use no transport

- **WHEN** the logger options are built for `NODE_ENV=production` and `NODE_ENV=test`
- **THEN** they contain no `transport` and do contain the severity formatter

#### Scenario: Development options use pino-pretty

- **WHEN** the logger options are built for `NODE_ENV=development`
- **THEN** they contain a `transport` with target `pino-pretty` and no severity formatter

#### Scenario: The pruned production dependencies exclude pino-pretty

- **WHEN** `npx nx run api:prune` runs and `npm ci --omit=dev --ignore-scripts` is run inside `apps/api/dist`
- **THEN** the install succeeds and `nestjs-pino`, `pino` and `pino-http` are installed
- **AND** `pino-pretty` is not installed (it is only a devDependency) and `node main.js` starts and logs in production without it

### Requirement: The global exception filter is the single place errors are logged

`AllExceptionsFilter` SHALL remain the only place an exception with a stack is logged, except the dependencies check, which answers its own `503` and is logged once by Terminus. Each 5xx outcome (including a `ProviderError` mapped to `502`) SHALL produce exactly one `ERROR` entry whose `message` is the error's stack (or `Name: message` without one) plus `status`, `method` and `path`; the filter SHALL NOT log 4xx outcomes.

#### Scenario: An unexpected error is logged once with its stack in message

- **GIVEN** a controller that throws a plain `Error('boom')` and a captured log stream
- **WHEN** the route is called
- **THEN** the response is `500` and exactly one entry has `severity: 'ERROR'` and a `message` containing `Error: boom` and `at `, with `status: 500` and the request `requestId`

#### Scenario: A failed dependencies check is logged once

- **GIVEN** the provider check fails and a captured log stream
- **WHEN** `GET /api/v1/health/dependencies` answers `503`
- **THEN** exactly one `ERROR` entry is written, carrying the `requestId`, and pino-http writes no completion line

#### Scenario: A client error is not logged by the filter

- **WHEN** a controller throws `BadRequestException`
- **THEN** the response is `400`, the filter writes no entry and pino-http writes one `WARNING` completion line

#### Scenario: A thrown non-Error value still logs a message

- **GIVEN** a controller that throws a string
- **WHEN** the route is called
- **THEN** the response is `500` and the one `ERROR` entry has a non-empty `message`

### Requirement: A bootstrap failure is one structured entry

A bootstrap failure SHALL be one JSON line on stderr with `severity` `ERROR` and the stack in `message`, followed by exit code 1. `main.ts` SHALL create the app with `abortOnError: false` so that module-initialization failures (an env var rejected by validation, a DI error) reach that handler instead of exiting inside Nest.

#### Scenario: Bootstrap failure is a single JSON line

- **GIVEN** `NestFactory.create` rejecting with an `Error` (with `abortOnError: false` this includes an invalid env var such as `LOG_LEVEL=verbose`)
- **WHEN** `main.ts` runs
- **THEN** one line is written to stderr that parses as JSON with `severity: 'ERROR'` and `message` containing the stack
- **AND** the process exits with code 1

### Requirement: Cloud Run logs and Error Reporting are documented

`docs/deploy/cloud-run.md` SHALL document where to read the API logs (Logs Explorer filters for the `eco-metrics-api` and `eco-metrics-api-dev` services, the severity field, finding all lines of one request by `requestId` or by trace, and `LOG_LEVEL`), that Error Reporting groups 5xx errors with no setup, and, as optional manual setup, enabling Error Reporting notifications in the console (sent for new error groups and for regressions, at most 20 per hour per project).

#### Scenario: The runbook covers logs and Error Reporting

- **WHEN** `docs/deploy/cloud-run.md` is read
- **THEN** it has a section describing the Logs Explorer filter by service and `requestId`, the Error Reporting grouping, and the optional notification setup with the limits above

### Requirement: Environment variables and conventions are documented

`README.md` (Environment Variables table) and `apps/api/.env.example` SHALL document `LOG_LEVEL` and `GCP_PROJECT_ID` together. `AGENTS.md` SHALL state in its Project Structure tree that `common/logging/` holds the logger options and helpers, and in its conventions that API code logs through the Nest `Logger` API (`new Logger(Context)`) and never `console.*`.

#### Scenario: Docs are in sync

- **WHEN** the change is complete
- **THEN** both env vars appear in `README.md` and `apps/api/.env.example` with the same defaults and descriptions, and `AGENTS.md` shows the `common/logging/` entry and the no-`console.*` rule
