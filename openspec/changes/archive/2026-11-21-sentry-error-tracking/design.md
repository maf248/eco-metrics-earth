# Design: Sentry error tracking

## Facts verified in the repo (not from memory)

- Installed: Next 16.4.6, React 19.3.1, NestJS 12.5.1, Node 24. `apps/web/next.config.ts` has `cacheComponents`, `trailingSlash: true`, a CSP with `connect-src 'self'` and `withBundleAnalyzer`. There is no middleware/proxy and no edge route. `vercel.json` builds with `npx nx build web --prod` (Turbopack is the Next 16 default).
- Next's docs in `node_modules/next/dist/docs` confirm `instrumentation.ts` (`register`, `onRequestError`), `instrumentation-client.ts` (runs before hydration, no exports needed) and `global-error.tsx` (must render its own `<html>`/`<body>`).
- `apps/web/src/app/error.tsx` exists and only calls `console.error`. `bffFetch.ts` throws after two failed attempts (so the page falls to `error.tsx`) and returns `provider-unavailable` (no throw) for a provider `502`; that case therefore never raises a web error.
- API: `AllExceptionsFilter` is registered with `app.useGlobalFilters(new AllExceptionsFilter())` (no DI), logs one `ERROR` per 5xx and maps `ProviderError` to `502`. The build is webpack through `NxAppWebpackPlugin` (`target: node`, tsc, `sourceMap: true`, `generatePackageJson: true`, all `node_modules` external), so dependencies stay real `require`s at runtime and the pruned `npm ci --omit=dev` image installs whatever the generated `package.json` lists.
- Package versions (npm registry, today 2026-11-21): `@sentry/nextjs` and `@sentry/nestjs` `latest` is 11.16.0 (2026-11-20). Pinned: **11.11.0** (2026-11-05, 16 days old; 11.12 to 11.16 are under 2 weeks). `@sentry/nextjs@11.11.0` peers on `next ^14 || ^15 || ^16`; `@sentry/nestjs@11.11.0` peers on `@nestjs/core|common ^8 to ^12`; both require Node >=20.19. `legacy-peer-deps=true` stays as is.
- Inspected `@sentry/nestjs@11.11.0` sources: its Nest integration only wraps scheduled/event handlers; HTTP exceptions are captured only by `SentryGlobalFilter` or `@SentryExceptionCaptured`. Not registering either means there is no automatic double capture, and our explicit call is the only one.
- Inspected `@sentry/nextjs@11.11.0` types: Turbopack builds are supported (Next 16), source maps upload runs after the production compile (`useRunAfterProductionCompileHook`, default on for Turbopack), `sourcemaps.deleteSourcemapsAfterUpload` defaults to `true`, `tunnelRoute` exists, and `suppressOnRouterTransitionStartWarning` exists. `@sentry/browser@11.11.0` default integrations include `BrowserSession`.
- API build: `apps/api/webpack.config.js` has `sourceMap: true` and `optimization: false`; the Dockerfile copies the whole `apps/api/dist` (including `main.js.map`) into the runtime image and runs `node main.js`.
- Public site constants (not secrets): org `eco-metrics-earth`, EU host `de.sentry.io`, projects `eco-metrics-web` and `eco-metrics-api`.

## Technical approach

### Configuration and secrets

| Name                                                 | Where                              | Kind              | Used by                                             |
| ---------------------------------------------------- | ---------------------------------- | ----------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`                             | Vercel env, Production + Preview   | variable (public) | web build (inlined), CSP, browser + server SDK      |
| `SENTRY_DSN_API`                                     | GitHub repository variable         | variable (public) | `deploy-api.yml`, becomes Cloud Run `SENTRY_DSN`    |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | Cloud Run env, set by the workflow | env               | `apps/api`                                          |
| `SENTRY_AUTH_TOKEN`                                  | Vercel sensitive env only          | secret            | web source map upload only (the API needs no token) |

DSNs are public by design, but they are **variables, not constants in the repo**: the repository is public, and a committed DSN would let forks and local runs of any contributor send events into our 5k quota. Unset means disabled. The org slug, project slugs and `https://de.sentry.io` are not secrets and live as constants in `next.config.ts` and `deploy-api.yml`; they only change if the Sentry org is recreated.

### API

- `apps/api/src/instrument.ts` (first import of `main.ts`, side-effect imports are not reordered by the lint config) reads `process.env` directly, because it runs before Nest's config module exists. This is the one documented exception to "read env through `AppConfigService`"; the Joi schema still validates the same variables at boot, so a malformed value fails the app with a clear message (the SDK itself would only warn and disable itself).
- `apps/api/src/common/sentry/sentry-options.ts` exports a pure `buildSentryOptions(env)`: `undefined` without a DSN, otherwise `{ dsn, environment, release, sendDefaultPii: false }`, and deliberately no `tracesSampleRate`, so tracing and profiling are off (in the v8+ SDKs tracing is opt-in by that option).
- `apps/api/src/common/sentry/sentry-throttle.ts` exports a small `SentryThrottle` with an injectable clock and an in-memory `Map<group, lastAdmittedAt>`. `admit(group, windowMs)` returns whether a capture may be sent and records it; entries older than their window are pruned on each call, so the map stays small.
- `AllExceptionsFilter` change (the only capture point): inside the existing `status >= 500` paths, after `logFailure`, ask the throttle (group `provider-unavailable` with a 6 h window for `ProviderError`, else `name: message` with a 5 min window), call `Sentry.captureException(exception, ...)` and `await Sentry.flush(2000)` only if admitted, all inside a `try/catch` that swallows Sentry failures, then respond. `catch` becomes `async`; it never rejects. `ProviderError` uses `fingerprint: ['provider-unavailable']`, `level: 'warning'` and tag `status=502`. The `request.url` is not attached (it can carry query strings); method and the route path pattern are not needed for triage.
- The Cloud Logging entry (`logFailure`) is untouched, so Error Reporting keeps working in parallel. Sentry is an additional view, not a replacement.
- Unhandled exceptions and rejections that kill the process are still captured by the SDK's default process-level integrations (rare, high value); that path is not the filter and cannot double count because those errors never reach the filter.

### Quota policy (5k errors per month)

What is sent: unexpected 5xx (rare), provider 502 (collapsed), client render errors, server render errors. What is never sent: any 4xx (the filter checks the status), validation errors, 404/401/429 noise, handled `provider-unavailable` pages on the web (they do not throw), and errors whose Next `digest` shows a server error already reported.

- **Provider outage.** If OWID is down with no stored snapshot, every request returns `502`, and each one would be an event. All `ProviderError`s share one fingerprint and one throttle group (one Sentry issue instead of one per category) admitted once per 6 hours per instance. Worst case with 2 production instances is about 8 events per day (about 240 per month), plus cold-start resets of the in-memory state. Cloud Logging and Error Reporting still record every one.
- **Everything else.** One per distinct `name: message` per 5 minutes. There is no global cap: a flood of distinct messages is bounded by the per-client-key rate limit below.
- **Server-side backstop.** The runbook sets a per-client-key rate limit (daily) on each project, so even a flood the throttle does not collapse cannot burn the quota; Sentry spike protection is on by default.
- **Web.** Server errors are bounded by Next's caching (`use cache`, 24 h Data Cache, ISR keeps the last good page), so a failing BFF yields few renders. Client noise is trimmed with `ignoreErrors`/`denyUrls`, and `BrowserSession` is removed. If the web ever floods, the daily rate limit and the inbound filters absorb it; revisit `sampleRate` then.

### Web

- `src/lib/sentryConfig.ts` (client-safe, no `server-only`): `buildSentryInitOptions(env)` (undefined without DSN; `dsn`, `environment`, `release`, `sendDefaultPii: false`, `ignoreErrors`, `denyUrls`, and an `integrations` callback that drops `BrowserSession`), and `sentryIngestOrigin(dsn)` returning `https://<host>` or `undefined` for a missing or invalid DSN.
- `src/instrumentation.ts`: `register()` initializes only when `NEXT_RUNTIME === 'nodejs'` and options exist; `export const onRequestError = Sentry.captureRequestError`.
- `src/instrumentation-client.ts`: `Sentry.init(options)` when options exist; no `browserTracingIntegration`, no replay, no feedback. It does not export `onRouterTransitionStart` (tracing is off), so `suppressOnRouterTransitionStartWarning: true` is set in `withSentryConfig`.
- Boundaries: `error.tsx` replaces its `console.error` with `Sentry.captureException(error)` when `error.digest` is undefined. A server error reaches the boundary as an error with a `digest` and was already reported by `onRequestError`, so checking the digest is the double-capture guard. `global-error.tsx` is new, minimal and unstyled (it replaces the root layout, has no tokens loaded, and must not use color classes), with the same digest rule. The roadmap text suggested a `Sentry.ErrorBoundary` in the root layout; Next's file conventions make that unnecessary and the layout stays a Server Component.
- `src/lib/contentSecurityPolicy.ts`: `buildContentSecurityPolicy({ isDev, sentryDsn })` extracted from `next.config.ts` so it can be unit tested; output is byte-identical to today's when no DSN is set.
- `next.config.ts`: `withSentryConfig(withBundleAnalyzer(baseConfig), { org, project, sentryUrl: 'https://de.sentry.io', authToken: process.env.SENTRY_AUTH_TOKEN, telemetry: false, silent: !process.env.CI, release: { name }, bundleSizeOptimizations (exclude tracing, debug statements, replay iframe/shadow DOM/worker), autoInstrumentServerFunctions/autoInstrumentAppDirectory off, sourcemaps: { disable: no token } })`. The coder verifies each option name against the installed `@sentry/nextjs` and `@sentry/bundler-plugins` types, not against this list. `baseConfig.env` inlines `NEXT_PUBLIC_SENTRY_ENVIRONMENT` (`VERCEL_ENV` or `development`) and `NEXT_PUBLIC_SENTRY_RELEASE` (`VERCEL_GIT_COMMIT_SHA`) at build time.
- `apps/web/package.json` `nx.targets.build.inputs` adds `{ "env": "NEXT_PUBLIC_SENTRY_DSN" }` (keeping `production` and `^production`) so a build cached with a different DSN is never reused.

### CSP: ingest host vs tunnel route

The CSP has `connect-src 'self'`, so the browser SDK would be blocked. Decision: add the exact ingest origin (derived from the DSN, for example `https://<org-id>.ingest.de.sentry.io`) to `connect-src`, only when a DSN is set. No wildcard (the roadmap suggested `*.sentry.io`; a single host is tighter and sufficient for the EU region).

`tunnelRoute` was rejected: every event would cost a Vercel function invocation, `trailingSlash: true` makes a POST route fragile (308 redirects drop POST bodies unless the SDK URL carries the slash), and the CSP would stay simple but the benefit (bypassing ad blockers) is not worth it for a 5k/month errors-only setup. The trade-off is that users with blockers will not report client errors; server errors, which are the majority of what matters here, are unaffected.

### Source maps

- **Web (Vercel).** Uploaded by the plugin during `next build` when `SENTRY_AUTH_TOKEN` is in the Vercel env. `deleteSourcemapsAfterUpload` removes them from `.next`, so they are not served. Without a token the plugin is disabled (no maps are generated for it), so local builds and CI are unaffected. A task verifies `find apps/web/.next/static -name '*.map'` is empty in both cases.
- **API (Cloud Run): Node source maps, no upload.** The shipped image already contains `main.js` and `main.js.map`. The Dockerfile `CMD` becomes `["node", "--enable-source-maps", "main.js"]`, and Node then rewrites `Error.stack` to TypeScript paths. Sentry parses that stack as is, and the stack in the Cloud Logging entry (the `message` Error Reporting groups on) gets readable too. No auth token, no upload, no CI plumbing for the API.
- **Why the flag in `CMD` and not a call in `instrument.ts`.** Verified in the production build: `process.setSourceMapsEnabled(true)` has no effect on an already-loaded single webpack bundle (`main.js` is compiled before `instrument.ts` runs), so stacks stayed on `main.js`; with `node --enable-source-maps` they map to `.ts`. The flag keeps the image self-contained and identical in any runtime. `Dockerfile` is an `api-image` input, so the `api-image` CI check builds it. The cost is only paid when an error stack is formatted (rare), plus the parsed map kept in memory (a few MB for the bundle). `nx serve` and plain `node dist/main.js` keep bundled stacks unless the flag is passed.
- Caveat: `main.js.map` must stay in the image. It is not public (the API serves no static files from `dist`). The task list includes a manual check that a stack from the production build shows `.ts` paths; a unit test of that is not cheap (it needs the webpack build), so the build-based check is manual and the cheap automated check asserts the `CMD` flag.

### Environments and release

API: `SENTRY_ENVIRONMENT` is the deploy target (`production` for `eco-metrics-api` from `main`, `development` for `eco-metrics-api-dev` from `develop`), both in the `eco-metrics-api` project; `SENTRY_RELEASE` is the commit SHA, passed by `deploy-api.yml` as `${{ github.sha }}`. Web: `production` or `preview` from `VERCEL_ENV` (previews consume the dev API), release `VERCEL_GIT_COMMIT_SHA`. Alerts filter on `production`.

### Alerts, uptime and runbook

New `docs/deploy/sentry.md` (the existing `cloud-run.md` is API-only and `vercel.md` is about the CI gate) holds the manual steps with click paths, and is linked from both. Uptime target: **the production web URL**. A fully down site produces no errors, so only an uptime check can see it, while an API outage already shows as web server errors (BFF reads that throw) and as API 5xx events. The API liveness endpoint is also free of provider calls and so adds little signal. The free plan allows one monitor.

## Alternatives considered

- **Sentry's own Nest integration (`SentryModule` + `SentryGlobalFilter`).** Rejected: it would need a second filter or replace `AllExceptionsFilter`, whose provider mapping and log format are contractual, and it would capture every `HttpException` unless configured per status.
- **Uploading API source maps (Sentry CLI in the Docker build, the Sentry webpack plugin, or from CI).** Rejected: it needs a token in GitHub and BuildKit secret plumbing for no gain, because Node can map stacks itself from the `.map` already in the image.
- **Sampling (`sampleRate < 1`) instead of the throttle.** Rejected: it randomly drops rare real errors. The throttle drops only repeats.
- **`tunnelRoute`** and **`*.sentry.io` wildcard in CSP:** see above.
- **Sentry Vercel integration** (sets env vars and uploads maps): adds an OAuth app and hides configuration; explicit variables are consistent with the repo.
- **Using the latest 11.16.0 or the 10.x line.** 11.16.0 is under 2 weeks old; 10.78.0 is a maintained line but 11.x is current and supports Next 16 and Nest 12 by peer range.

## Risk assessment

| Risk                                                                                              | Mitigation                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quota exhaustion                                                                                  | Status check (no 4xx), one throttle group for provider outages (6 h), per-message throttle (5 min), daily client-key limit, spike protection; kill switch is unsetting the DSN.                                                                          |
| `withSentryConfig` conflicts with `cacheComponents` or changes the static output of pages         | Build-time instrumentation of routes is turned off; the task runs `nx build web` and compares the route table (static pages stay static) before and after.                                                                                               |
| New major (11.x) SDK, 16 days old                                                                 | Exact pins; the nest and next packages are pinned to the same version; tasks run the full gates. Roll back by removing the DSN.                                                                                                                          |
| `await flush` delays a 5xx response                                                               | Bounded by 2 s and only for admitted captures (a few per day).                                                                                                                                                                                           |
| API source map not found at runtime, so stacks stay bundled                                       | The map is copied with `dist`; a manual check and the `CMD` assertion test; events still arrive, only less readable.                                                                                                                                     |
| Web source maps leak publicly                                                                     | `deleteSourcemapsAfterUpload`; a build check lists `.map` files.                                                                                                                                                                                         |
| Token exposure                                                                                    | Vercel sensitive variable only; never in chat, a file or a commit; the API has none.                                                                                                                                                                     |
| CSP breaks the browser SDK or a DSN change leaves a stale CSP                                     | CSP is derived from the same DSN at build time; the build input includes the variable; a unit test pins the output.                                                                                                                                      |
| Vercel skips the build for changes under the ignore pattern, so a changed variable is not applied | Runbook says to redeploy after changing `NEXT_PUBLIC_SENTRY_DSN`.                                                                                                                                                                                        |
| The in-memory throttle resets on cold starts                                                      | Accepted; worst case is a few more events per day.                                                                                                                                                                                                       |
| Privacy                                                                                           | `sendDefaultPii: false`, EU region, no user context, no replay, no sessions. The default browser integrations stay on, so events also carry breadcrumbs (navigation, fetch, console, clicks) and browser/OS context; the runbook states this accurately. |

## Decisions on the former open questions

All taken with the recommendation.

1. **Uptime target:** the production web URL.
2. **Roadmap item:** closed by this change (block deleted, IDs renumbered, status row done).
3. **`global-error.tsx`:** added (minimal, unstyled fallback).
4. **Previews report to Sentry** with `environment=preview`; alerts filter on `production`.
5. **Org slug, project slugs and `de.sentry.io`:** constants in the repo.
6. **Token:** one Organization Auth Token, stored only as a sensitive Vercel variable (the API needs none).
7. **`await flush(2000)`** before responding to admitted 5xx: yes.
8. **API source maps:** `--enable-source-maps` in the Dockerfile `CMD` (the runtime `setSourceMapsEnabled` call was tried and does not work on the bundle), no upload.
9. **Throttle:** one in-memory throttle keyed by event group (6 h for `provider-unavailable`, 5 min otherwise), no global cap.
