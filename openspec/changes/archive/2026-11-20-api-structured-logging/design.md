## Context

Verified facts (2026-11-20): NestJS 12.5.1 on Express, Node 24, webpack build (`NxAppWebpackPlugin`, node target, dependencies stay external and are installed in the image from the pruned lockfile), Cloud Run services `eco-metrics-api` (main) and `eco-metrics-api-dev` (develop). Latest packages: `nestjs-pino` 5.3.2 (peers `pino ^10`, `pino-http ^11`, `@nestjs/common|core ^11.0.8 || ^12.0.2`), `pino-http` 11.0.0, `pino` 10.4.0, `pino-pretty` 13.2.0. Pin exact versions and re-check with `npm view` at implementation time.

Current logging: Nest `Logger` in `AllExceptionsFilter` (5xx and `ProviderError` with an object plus the stack as second argument), `SnapshotsModule`, `ProviderSnapshotService`, `GcsSnapshotStore`, `WaterFootprintService`; one `console.error` in the `main.ts` bootstrap catch. The internal key header is `x-internal-api-key` (`INTERNAL_KEY_HEADER` in `common/internal-key/internal-key.ts`). The only route with a query parameter is `water-footprint/products?category=`, not secret.

Facts read from the package sources (nestjs-pino 5.3.2, pino-http 11.0.0):

- `nestjs-pino`'s `Logger.call` treats the last extra argument as the context and passes the rest to pino. The existing call `logger.error({ ...fields }, stack)` therefore already ends up as pino `(fields, stack)`: the stack becomes `message`. The new filter code makes this explicit.
- pino-http binds `customProps` to the request-scoped child logger at request start, so every application log line of the request carries them. `genReqId` runs before any guard, so `X-Request-ID` can be set on every response. `customLogLevel` may return `'silent'`, which skips the completion line. A 5xx completion line is logged with a synthetic `err` object, which is why it must be silenced (see decision 7).
- Next.js 16.4.6 builds the fetch Data Cache key from the request headers and removes only `traceparent` and `tracestate` (`next/dist/server/lib/incremental-cache/index.js`, `generateCacheKey`).

## Decisions

### 1. nestjs-pino app-wide, existing call sites untouched

`NestFactory.create(AppModule, { bufferLogs: true })` then `app.useLogger(app.get(Logger))` immediately after, before `applyGlobalPipeline`. `AppLoggingModule` (in `common/logging/`) wraps `LoggerModule.forRootAsync({ inject: [AppConfigService], useFactory })` and is imported by `AppModule`. `new Logger(Context)` from `@nestjs/common` keeps working because `useLogger` redirects Nest's static logger to pino; no call site changes. Tests that already build the app with `{ logger: false }` and no `useLogger` call stay silent. `main.test.ts` fakes the app object and must gain `useLogger`. Tests that assert log output do not go through `AppLoggingModule` (its level is `silent` under `NODE_ENV=test`): they build a test module importing `LoggerModule.forRoot(buildLoggerParams({ logLevel: 'info', nodeEnv: 'production', gcpProjectId }, stream))` with an in-memory stream, and call `app.useLogger(app.get(Logger))` so the static `new Logger(Context)` call sites write to that stream. `nestjs-pino` keeps one root pino logger per module registry (the first app's options and stream win), so such a module is built once per test file (`beforeAll`) with a shared harness (`__tests__/common/logging/logging-harness.ts`), the captured stream is cleared between tests, and variants of the options (for example with a project id) live in their own test file.

### 2. Cloud Logging format

Options shape (built by a pure `buildLoggerParams(config, destination?)` so tests can inject a stream):

```ts
{
  pinoHttp: {
    level: config.logLevel,                       // LOG_LEVEL or env default
    messageKey: 'message',
    base: null,                                   // drop pid and hostname
    timestamp: pino.stdTimeFunctions.isoTime,     // "time": ISO 8601
    formatters: { level: (label) => ({ severity: levelToSeverity(label) }) }, // not in development
    redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
    genReqId: (req, res) => { const id = resolveRequestId(req.headers); res.setHeader('X-Request-ID', id); return id; },
    customProps: (req) => ({ requestId: req.id, ...buildTraceFields(projectId, req.headers) }),
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'silent' : res.statusCode >= 400 ? 'warn' : 'info'),
    autoLogging: { ignore: (req) => isHealthProbe(req) },
    // development only: transport: { target: 'pino-pretty', options: { singleLine: true, messageKey: 'message' } } and no formatters
  },
}
```

The severity map is `trace|debug -> DEBUG`, `info -> INFO`, `warn -> WARNING`, `error -> ERROR`, `fatal -> CRITICAL`. A pino `transport` cannot be combined with `formatters.level`, which is why the formatter is dropped in development (pretty output wants the level label; `messageKey: 'message'` is passed to pino-pretty so it finds the message) and why production uses no transport at all (plain JSON to stdout, the fastest and simplest path, no worker thread). Cloud Logging parses stdout JSON lines on Cloud Run into `jsonPayload` with `severity` and `message` promoted to the log entry.

Error Reporting: it groups an entry whose `message` (also accepted: `stack_trace`, `exception`) contains a stack trace in a supported format (the severity is not what triggers it; the filter logs at `ERROR` anyway), and takes the service from the Cloud Run resource labels, so no `serviceContext` is needed. The filter therefore logs `message = error.stack` (starts with `Name: message`, so the summary is the first line). If Error Reporting turns out not to group on the dev service, the documented fallback is to also emit the same text in `stack_trace`; this is a one-line change and is part of the post-deploy check below.

### 3. Trace correlation and project id

Cloud Run sets `K_SERVICE`, `K_REVISION`, `K_CONFIGURATION` and `PORT` but not the project id. Options: (a) metadata server call at boot (async, a network dependency in the logger factory, needs a local fallback); (b) `GOOGLE_CLOUD_PROJECT` read from the environment; (c) pass `GCP_PROJECT_ID` explicitly. Chosen: (c). The deploy workflow already requires the `GCP_PROJECT_ID` repository variable, so adding one line to `env_vars` needs no new variable and no network call, and the value is plain data. When unset (local, tests) the trace fields are omitted and everything else works.

Parsing is a pure function `parseTraceContext(headers)`: `traceparent` first (regex `^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$`, reject an all-zero trace id), then `X-Cloud-Trace-Context` (`^([0-9a-f]{32})/(\d+)(?:;o=[01])?$`, span decimal converted with `BigInt(span).toString(16).padStart(16, '0')`, reject out-of-range spans). Output fields: `logging.googleapis.com/trace` and `logging.googleapis.com/spanId`. Cloud Run's request log uses the same trace id, so Logs Explorer nests the application lines under the request.

### 4. Request id, and why the web sends `traceparent` and not `X-Request-ID` (deviation from the roadmap draft)

`resolveRequestId(headers)`: incoming `X-Request-ID` if it matches `^[A-Za-z0-9._-]{8,64}$` (a repeated header arrives as `a, b` and fails the pattern), else the trace id from `parseTraceContext`, else `randomUUID()`. Echoed in the response header and bound as `requestId` on every line.

The roadmap draft has `bffFetch` send a fresh `X-Request-ID` per call. Next's fetch Data Cache key includes request headers except `traceparent` and `tracestate`, and the web depends on that cache for `revalidate: 86400` (see the Data Cache note in `AGENTS.md`). A random custom header would turn every read into a cache miss: the 24 h caching, the deploy-surviving cache and the "keep serving the last good page" behavior would silently stop working. Sending a fresh W3C `traceparent` (flags `00`, unsampled) per attempt gives the same correlation without touching the cache key: the API's `requestId` equals the trace id, and Cloud Run is expected to keep an incoming trace id for its own request log (checked after deploy, see the verification below). The API still accepts `X-Request-ID` for curl and other clients. A regression guard is documented rather than tested (the cache key code is Next internals): the verification step in the tasks restarts `next dev` between two renders and checks the second one does not call the BFF. The restart matters: `loadCategoryData` sits under an in-memory `use cache`, which would serve the second render without any fetch and hide a broken Data Cache key.

### 5. Redaction and what is logged

Serializers whitelist `method`, `url` and `statusCode`; headers and bodies never enter a log line. `redact` with the paths `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-api-key"]`, `req.headers["x-internal-api-key"]` (via `INTERNAL_KEY_HEADER`) and `res.headers["set-cookie"]` is defense in depth against a future serializer or `logger.info({ req })` call. `url` keeps the query string: the only query (`category`) is not secret and the key is a header.

### 6. Levels and local output

`LOG_LEVEL` optional (Joi `valid('fatal','error','warn','info','debug','trace','silent')`, no schema default); `AppConfigService.logLevel` applies the default by `NODE_ENV` (`production` info, `development` debug, `test` silent). Jest sets `NODE_ENV=test`, so suites stay silent with no per-test mocking. `pino-pretty` is a devDependency of `apps/api`, referenced only by the string `target: 'pino-pretty'` in the development branch, so it is not imported, not visible to the Nx dependency scan, and absent from the pruned production package. The image keeps `npm ci --omit=dev`; the `api-image` CI job exercises exactly that flow. `nestjs-pino` needs `pino` and `pino-http` as direct dependencies (peers), also exact-pinned.

### 7. Request logs vs Cloud Run's request log, and one error entry

Cloud Run already writes one request log per request (status, latency, trace, no cost beyond the log volume). Keeping pino-http's completion line is a deliberate, small duplication: Cloud Run's entry does not know our `requestId` and cannot carry application fields, while the pino-http line gives local development its only access log and gives production a per-request record bound to the `requestId`. Volume is low (the web caches 24 h; Cloud Logging's free allotment is 50 GiB per project per month) and `LOG_LEVEL=warn` is the lever that removes the info lines without a deploy of code. The startup probe is excluded because it fires every 2 seconds during startup and says nothing.

For errors, the filter is the only place that logs an exception with a stack. The one other 5xx that skips the filter, the dependencies check (`DependenciesHealthController` answers its own 503), is already logged once at `ERROR` by Terminus through the Nest `Logger`, hence through pino (covered by an integration test), so it needs no extra log call. pino-http would add a second `request errored` entry for every 5xx, with a synthetic `Error` whose stack points inside pino-http, which Error Reporting would group as a separate bogus error. The level function therefore returns `silent` for 5xx. 4xx are `warn` completion lines only (the filter does not log them).

### 8. Filter and Sentry readiness

`AllExceptionsFilter` keeps its `new Logger(AllExceptionsFilter.name)` and its structure; the change is the log call: `this.logger.error({ status, method, path, ...extra }, message)` where `message = exception.stack` for an `Error` with a stack, else `${name}: ${errorMessage}`. A small private helper keeps the two branches (provider 502 and generic 5xx) identical. A thrown non-Error value (a string, say) has no name or stack, so its message is `Non-error thrown: <value>`. Future Sentry change (note only, nothing to implement now): add `@SentryExceptionCaptured()` to `AllExceptionsFilter` (or call `Sentry.captureException` in the same helper); because every exception already flows through this one place, logging and capture stay in lockstep and no call site changes. A `SentryModule` import and `instrument.ts` are that change's work.

### 9. Bootstrap failure

`console.error` in the `main.ts` catch is replaced by `process.stderr.write(JSON.stringify({ severity: 'ERROR', message: stack ?? String(err) }) + '\n')` then `process.exit(1)` (stderr writes to a pipe are synchronous on Linux, so the line is not lost). No DI logger exists before `NestFactory.create` resolves, and Cloud Logging parses JSON on stderr like stdout.

That catch is not reached today by the most likely boot crash. With Nest's default `abortOnError: true`, an error during module initialization (an invalid env var rejected by the Joi schema, a DI failure) is printed as text by Nest's `ExceptionHandler` and the process exits inside `NestFactory.create` (verified in `@nestjs/core` 12.5.1, `nest-factory.js` and `errors/exceptions-zone.js`). `main.ts` therefore passes `abortOnError: false`, which makes `create` reject instead, so the catch writes the JSON entry with the stack that Error Reporting groups. Nest still prints its own text line first; that duplicate is accepted. This also removes the last `eslint-disable no-console` in the API.

### 10. Web side

`bffFetch.ts` generates `traceparent` per attempt with `node:crypto` (`randomBytes(16)` and `randomBytes(8)` as hex for the trace and span ids, flags `00`). `readWithRetry` collects the trace ids; `logFailure` appends them to its single `console.error`. The Vercel log line and the API `requestId` then share the id.

## File structure changes

```
apps/api/src/common/logging/
  app-logging.module.ts      # LoggerModule.forRootAsync wrapper
  logger-options.ts          # buildLoggerParams(config, destination?)
  severity.ts                # levelToSeverity, the formatters.level function
  request-id.ts              # REQUEST_ID_HEADER, isSafeRequestId, resolveRequestId
  trace-context.ts           # parseTraceContext, buildTraceFields
  redact-paths.ts            # REDACT_PATHS (uses INTERNAL_KEY_HEADER)
  health-probe.ts            # isHealthProbe(req)
apps/api/__tests__/common/logging/   # mirrors the above plus request-id integration
```

Modified: `main.ts`, `app.module.ts`, `all-exceptions.filter.ts`, `env-validation.schema.ts`, `app-config.service.ts`, `apps/api/package.json`, `.github/workflows/deploy-api.yml`, `apps/web/src/lib/bffFetch.ts`, docs.

## Alternatives considered

- **Keep Nest's built-in `ConsoleLogger` with `json: true`.** No new dependencies, but no request-scoped child loggers, no redaction, no request id binding, no level formatting for Cloud; we would rebuild half of pino-http. Rejected.
- **`@google-cloud/logging-winston` or the Logging client library.** Calls the Logging API (network, credentials, cost) instead of the free stdout agent. Rejected.
- **Project id from the metadata server.** Async startup dependency and a local fallback for no gain over an env var already held as a GitHub variable. Rejected.
- **`stack_trace` field instead of stack in `message`.** Documented as the fallback; `message` keeps the log readable in Logs Explorer and in Jest captured output with one field.
- **Disable pino-http auto logging in production.** Would leave per-request context only in Cloud Run's log, which lacks `requestId`. Kept with the cost lever described in decision 7.
- **Pretty output by piping `nx serve api` through pino-pretty.** Changes the serve and E2E wrapper flows. Rejected; the in-process transport is local to the logger factory.

## Risks and mitigations

- **Client-supplied trace headers.** A `traceparent` or `X-Cloud-Trace-Context` sent by a client sets the trace field and `requestId` of that request's own log lines. Impact is limited to log correlation; accepted.
- **Data Cache key regression** if a later change adds a per-request header to `bffFetch`. Mitigation: the spec requires `traceparent` only and forbids `X-Request-ID`; the bffFetch test asserts no `X-Request-ID`.
- **Next stops stripping `traceparent` from the cache key.** It is an implementation detail verified on 16.4.6. Mitigation: the manual check in the tasks (second render does not hit the BFF) is repeated on Next upgrades; the fallback is to drop the web header, keeping the API-generated id.
- **pino-pretty missing in production by mistake.** Mitigation: only used when `NODE_ENV=development`; Cloud Run sets `NODE_ENV=production` and the Dockerfile sets it too; the options test asserts no transport otherwise; the `api-image` job builds from the pruned lockfile.
- **Webpack and pino worker transports.** Only the development transport uses a worker; with externals it resolves `pino-pretty` from `node_modules` at runtime. Mitigation: task to run `nx serve api` locally and confirm pretty output.
- **nestjs-pino contract drift** (context and message argument handling). Mitigation: the filter integration tests assert the exact captured JSON (`message` contains the stack, one entry, `context` present).
- **Error Reporting noise from provider outages.** A `ProviderError` 502 with no snapshot is a real error and is grouped once per distinct stack; stale snapshot responses are `200` and not errors. Notification setup is optional and rate-limited by Google (20 per hour per project).
- **Log volume.** Low traffic, 24 h web cache, health excluded, `LOG_LEVEL` lever.
- **Epoch vs ISO time.** `time` as ISO string is parsed by Cloud Logging; if not, ingestion time is used with no functional loss. Verified in the post-deploy check.

## Post-deploy verification (manual, documented in the runbook)

1. In Logs Explorer for `eco-metrics-api-dev`, a category request shows `severity`, `message`, `requestId` and the application lines nested under the Cloud Run request entry (trace correlation).
2. The response carries `X-Request-ID`; the `requestId` in the logs matches.
3. A category page rendered on a Vercel preview logs nothing on success; for a forced BFF failure, the trace id in the Vercel `console.error` matches the `requestId` and the trace of the Cloud Run request entry. If Cloud Run replaced the incoming trace id, the correlation still works through `requestId`, and this note is updated.
4. A forced 5xx on the dev service (for example by temporarily pointing `OWID_API_BASE_URL` at an unreachable host with no snapshot) appears once in Error Reporting.

## Resolved decisions

- The web sends `traceparent`, not `X-Request-ID` (decision 4): approved.
- pino-http completion lines stay on in production (decision 7), with `LOG_LEVEL=warn` as the lever: approved.
