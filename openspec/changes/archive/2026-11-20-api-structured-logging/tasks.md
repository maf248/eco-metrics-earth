## 1. Dependencies

- [x] 1.1 Re-check versions with `npm view nestjs-pino version peerDependencies`, `npm view pino-http version`, `npm view pino version` and `npm view pino-pretty version`; confirm the peer ranges accept NestJS 12.5.1
- [x] 1.2 In `apps/api` install exact-pinned runtime dependencies: `npm install --save-exact -w apps/api nestjs-pino pino pino-http` (`pino` and `pino-http` are peers of `nestjs-pino` and are imported directly)
- [x] 1.3 In `apps/api` install `pino-pretty` as an exact-pinned devDependency (`npm install --save-exact --save-dev -w apps/api pino-pretty`); confirm no `^` or `~` in `apps/api/package.json` and that the root `package.json` is unchanged
- [x] 1.4 Run `npx nx run api:prune`, open `apps/api/dist/package.json` and confirm `nestjs-pino`, `pino` and `pino-http` are listed under `dependencies` and `pino-pretty` only under `devDependencies` (the pruned package keeps the devDependency list, `--omit=dev` leaves it out); in a scratch copy of `apps/api/dist` run `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` and confirm it succeeds (spec: pruned production dependencies exclude pino-pretty; the `api-image` CI job runs the same flow in Docker)

## 2. Config (LOG_LEVEL, GCP_PROJECT_ID)

- [x] 2.1 In `apps/api/src/config/env-validation.schema.ts` add optional `LOG_LEVEL` (`Joi.string().valid('fatal','error','warn','info','debug','trace','silent')` with a message naming `LOG_LEVEL`) and optional `GCP_PROJECT_ID` (`Joi.string().pattern(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/).optional().allow('')` with a message naming `GCP_PROJECT_ID`); no schema defaults
- [x] 2.2 In `AppConfigService` add `logLevel` (explicit value, else `info` for production, `debug` for development, `silent` for test) and `gcpProjectId` (string or `undefined` when unset or empty)
- [x] 2.3 Extend `__tests__/config/env-validation.schema.test.ts` and `app-config.service.test.ts` for: defaults per `NODE_ENV`, explicit `LOG_LEVEL=warn`, `LOG_LEVEL=verbose` rejected, valid and invalid `GCP_PROJECT_ID` (`Not A Project` rejected, empty accepted)

## 3. Logger module

- [x] 3.1 Create `apps/api/src/common/logging/severity.ts` exporting a pure `levelToSeverity(label)` (`trace|debug` DEBUG, `info` INFO, `warn` WARNING, `error` ERROR, `fatal` CRITICAL)
- [x] 3.2 Create `trace-context.ts` exporting `parseTraceContext(headers)` (`traceparent` first, then `X-Cloud-Trace-Context`, malformed or all-zero ignored, decimal span converted to 16 hex) and `buildTraceFields(projectId, headers)` returning `logging.googleapis.com/trace` and `logging.googleapis.com/spanId`, or `{}` without a project id or a valid context
- [x] 3.3 Create `redact-paths.ts` exporting `REDACT_PATHS` (`req.headers.authorization`, `req.headers.cookie`, `req.headers["x-api-key"]`, `` `req.headers["${INTERNAL_KEY_HEADER}"]` `` imported from `common/internal-key/internal-key.ts`, `res.headers["set-cookie"]`) and `health-probe.ts` exporting `isHealthProbe(req)` (`GET`, pathname of `req.originalUrl ?? req.url` without query and trailing slash equal to `/api/v1/health`; `originalUrl` because middleware mounted on a path can see a rewritten `req.url`)
- [x] 3.4 Create `logger-options.ts` exporting `buildLoggerParams({ logLevel, nodeEnv, gcpProjectId }, destination?)` returning the nestjs-pino `Params` shape from the design (messageKey `message`, `base: null`, ISO `time`, severity formatter, redact, `serializers` limited to method/url/statusCode, `customLogLevel` info/warn/`silent` for 5xx, `autoLogging.ignore`, `customProps`); in `development` use `transport: { target: 'pino-pretty', options: { singleLine: true, messageKey: 'message' } }` and no `formatters`, otherwise no transport; when `destination` is given use pino-http's `[options, destination]` tuple form
- [x] 3.5 Create `app-logging.module.ts` (`LoggerModule.forRootAsync({ inject: [AppConfigService], useFactory })`) and import it in `AppModule`
- [x] 3.6 In `main.ts` create the app with `{ bufferLogs: true, abortOnError: false }` (so module-initialization failures such as an invalid env var reject and reach the JSON catch instead of exiting inside Nest, design decision 9) and call `app.useLogger(app.get(Logger))` (from `nestjs-pino`) right after creation; replace the bootstrap `console.error` with one JSON line on `process.stderr` (`{ severity: 'ERROR', message: stack ?? String(err) }`) followed by `process.exit(1)`, and delete the `eslint-disable no-console` comment
- [x] 3.7 Verify with a quick local run that `customLogLevel` returning `'silent'` skips the completion line, that `nx serve api` prints pretty output in development, and that `NODE_ENV=production node` of the built bundle prints JSON with `severity` (pino-pretty not installed in the scratch dist)

## 4. Request id

- [x] 4.1 Create `request-id.ts` exporting `REQUEST_ID_HEADER = 'X-Request-ID'`, `isSafeRequestId(value)` (`^[A-Za-z0-9._-]{8,64}$`, strings only) and `resolveRequestId(headers)` (safe `X-Request-ID`, else the trace id from `parseTraceContext`, else `randomUUID()`)
- [x] 4.2 Wire `genReqId` in `buildLoggerParams` to `resolveRequestId` and set the `X-Request-ID` response header there, so it is present on every response including `401`, `404` and `5xx`
- [x] 4.3 Bind `requestId` and the trace fields through `customProps` so every line of the request carries them (spec: every log line of the request)

## 5. Exception filter

- [x] 5.1 In `all-exceptions.filter.ts` add a private helper that logs once with `this.logger.error({ status, method, path, ...extra }, message)` where `message` is `exception.stack` for an `Error` with a stack, else `${name}: ${errorMessage}` for an `Error` without a stack, and `Non-error thrown: <value>` for a non-Error value (never `undefined`); use it for the `ProviderError` branch (keeping `errorName`, `errorMessage`, `causes`) and the generic 5xx branch; keep 4xx unlogged and the response bodies unchanged
- [x] 5.2 Update `__tests__/common/filters/all-exceptions.filter.test.ts` and `provider-error-mapping.test.ts` to the new call shape (they assert the log entry) with no console output

## 6. Web bffFetch

- [x] 6.1 In `apps/web/src/lib/bffFetch.ts` add a `newTraceparent()` helper (`00-<randomBytes(16) hex>-<randomBytes(8) hex>-00` from `node:crypto`) and send it as the `traceparent` header on every attempt next to `internalApiHeaders()`; do not add `X-Request-ID` (it would defeat the Next fetch Data Cache key, see design decision 4)
- [x] 6.2 Make `readWithRetry` collect the trace id of every attempt and `logFailure` include them in its single `console.error` (never headers or the key)
- [x] 6.3 Manual check in `nx dev web` against the local API: render a category page, restart `next dev` (this clears the in-memory `use cache`, which would otherwise hide the Data Cache), render it again and confirm the API log shows no new request for it; note the Next version it was verified on

## 7. Tests

- [x] 7.1 `__tests__/common/logging/severity.test.ts`: all six levels (spec: every pino level maps to a severity)
- [x] 7.2 `__tests__/common/logging/request-id.test.ts`: accepted safe id; rejected too short, too long, space, non-ASCII, repeated (`a, b`); trace id fallback; UUID v4 generated and different per call
- [x] 7.3 `__tests__/common/logging/trace-context.test.ts`: `traceparent`, `X-Cloud-Trace-Context` with span conversion, malformed and all-zero ignored, `traceparent` wins when both are present, no project id yields `{}`
- [x] 7.4 `__tests__/common/logging/logger-options.test.ts` (output assertions use a test module with `LoggerModule.forRoot(buildLoggerParams({ logLevel: 'info', nodeEnv: 'production', gcpProjectId }, stream))` and `app.useLogger(app.get(Logger))`, see design decision 1, never `AppLoggingModule`, which is `silent` under test): production and test options have the formatter and no transport; development has the `pino-pretty` transport and no formatter; with a captured destination stream assert `severity`/`message`/`time`, no `level`/`pid`/`hostname`, redaction of the listed headers when an object with `req.headers` is logged, no markers from `Authorization`/`Cookie`/`X-Api-Key`/`X-Internal-Api-Key` in a served request's output, no body content, health probe (with and without query) not logged while `/api/v1/health/dependencies` is, `INFO` for 200, `WARNING` for 404, nothing from pino-http for 500, trace fields present with a project id and absent without
- [x] 7.5 `__tests__/common/logging/request-id.integration.test.ts`: build the app like `bootstrap.test.ts` (`NestFactory.create(AppModule, { logger: false })`, `applyGlobalPipeline`, global prefix) and assert `GET /api/v1/health` carries `X-Request-ID` (UUID), echoes a safe incoming id, replaces an unsafe one, and that a `401` from the key guard carries the header; use `it(...)` and keep the output free of console warnings and errors
- [x] 7.6 Filter logging integration (same captured-stream test module as 7.4): a controller throwing `Error('boom')` yields `500`, exactly one `ERROR` entry with a `message` containing `Error: boom` and `at `, `status`, `requestId`; `BadRequestException` yields `400` with no filter entry and one `WARNING` completion line; a thrown string still logs a non-empty `message`
- [x] 7.7 Extend `__tests__/app/main.test.ts`: fake app gains `useLogger`; assert `NestFactory.create` receives `bufferLogs: true` and `abortOnError: false` and `useLogger` is called once before `listen`; add a bootstrap-failure test (stderr write mocked, one JSON line with `severity: 'ERROR'` and the stack, exit code 1 via mocked `process.exit`)
- [x] 7.8 Web: extend `apps/web/__tests__/lib/bffFetch.test.ts` (and `bffFetchRetry.test.ts` if it fits better) with: every attempt sends a `traceparent` matching `^00-[0-9a-f]{32}-[0-9a-f]{16}-00$`, different trace ids per attempt, no `X-Request-ID`, the failure log contains both trace ids and not the key; mock `console.error` as the neighbouring tests do
- [x] 7.9 Run `npx nx test api`, `npx nx test web` and confirm zero console warnings or errors and that coverage thresholds still hold; E2E needs no new test (no user-visible behavior changes)
- [x] 7.10 In `apps/web/e2e/run-dev-servers.ts` add `LOG_LEVEL=warn` to the env of the spawned API: it runs `nx serve api` with `NODE_ENV` unset, so it would otherwise log every request at `debug` through pino-pretty into the E2E output; then run `npm run e2e` once to confirm the suite still passes and the API output is quiet

## 8. Deploy workflow

- [x] 8.1 In `.github/workflows/deploy-api.yml` add `GCP_PROJECT_ID=${{ vars.GCP_PROJECT_ID }}` to the `env_vars` of the `deploy-cloudrun` step; do not add any pre-flight variable check
- [x] 8.2 Check `__tests__/health/dependencies-health.test.ts` (the test that reads the workflow) and any workflow assertion still pass; add an assertion that `env_vars` contains `GCP_PROJECT_ID` if that test inspects `env_vars`

## 9. Docs

- [x] 9.1 `README.md` Environment Variables table and `apps/api/.env.example`: add `LOG_LEVEL` (optional; defaults `info` production, `debug` development, `silent` test; values) and `GCP_PROJECT_ID` (optional; enables Cloud Logging trace correlation; set by the deploy workflow), with identical wording and update the `.env.example` production notes
- [x] 9.2 `docs/deploy/cloud-run.md`: new section with the Logs Explorer filters for `eco-metrics-api` and `eco-metrics-api-dev` (by `resource.labels.service_name`, `severity`, `jsonPayload.requestId`), how request and application lines nest by trace, that Error Reporting groups 5xx errors with no setup and where to open it, `LOG_LEVEL` use, and optional manual setup of Error Reporting notifications (console step; sent for new error groups and regressions; maximum 20 per hour per project); add the post-deploy verification steps from the design
- [x] 9.3 `AGENTS.md`: add `logging/` to the `common/` entry of the Project Structure tree, add a convention (API code logs through the Nest `Logger` API, `new Logger(Context)`, never `console.*`; errors with stacks are logged only by `AllExceptionsFilter`), and mention `traceparent` (not `X-Request-ID`) in the Data Cache note for `bffFetch` correlation
- [x] 9.4 Update the roadmap item for monitoring and observability by content: mark the structured logging part done and leave the error tracking part (Sentry on web and API, alerts, uptime) pending; do not add or renumber IDs beyond what the roadmap maintenance rule in `AGENTS.md` requires

## 10. Gates

- [x] 10.1 `npm run lint`, `npm run build`, `npm run test` pass with zero warnings; `npx openspec validate api-structured-logging --strict` passes
