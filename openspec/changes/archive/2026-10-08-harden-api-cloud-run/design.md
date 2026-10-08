# Design: harden-api-cloud-run

## Verified facts (from code, not assumptions)

- `@nestjs/throttler` installed: **6.7.1**. Extension points actually present in `dist/throttler.guard.js`:
  - `ThrottlerGuard.canActivate` first calls `protected shouldSkip(context): Promise<boolean>`, then, per throttler, checks `@SkipThrottle()` metadata and `skipIf(context)` (from the throttler entry or the module-level `skipIf`).
  - `ThrottlerModuleOptions` (object form) accepts `throttlers`, `skipIf`, `getTracker`, `generateKey`, `ignoreUserAgents`, `setHeaders`, `ipv6SubnetPrefix`. The array form (`forRoot([{...}])`, used today) has no module-level options.
  - Default tracker is `normalizeIp(req.ip, ipv6SubnetPrefix)`; it relies purely on Express `req.ip`.
- `apps/api` uses `@nestjs/platform-express`; `trust proxy` is an Express setting reachable via `NestExpressApplication.set(...)`.
- The OWID cache is `CacheModule.registerAsync` with only a `ttl` -> default in-memory Keyv `Map`. Keyv 5.6 in-memory store has lazy expiry and no interval/timer. `OutboundHttpClient` uses `setTimeout` only for transient 500/1000 ms retry delays inside an awaited request.
- E2E lives in `apps/web/e2e/` (not a root `e2e/`), orchestrated by `apps/web/e2e/run-dev-servers.ts` which adopts or spawns `npx nx serve api` and then `npx nx dev web`, with `API_HEALTH_URL` as the readiness gate.
- `Dockerfile` is at the repo root: `node:24-alpine`, `USER node`, `CMD ["node", "main.js"]`.
- `server-only` is not installed in the workspace.

## Architecture decisions

### 1. Client IP: configurable trusted hops

`TRUST_PROXY_HOPS` (Joi `number().integer().min(0).default(0)`; Joi converts the env string, rejects `1.5`, `-1`, `abc`). `AppConfigService.trustProxyHops` returns the number. `main.ts`:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);
...
app.set('trust proxy', appConfig.trustProxyHops);
```

Placed right after `app.get(AppConfigService)`. Never `true` (trusts the whole chain -> attacker controls `req.ip` and can mint unlimited buckets). With hops=N Express takes the Nth entry from the right of `X-Forwarded-For`, so client-supplied leftmost entries are ignored; this is exactly what the spoof tests assert. Default 0 keeps local dev unchanged (loopback bucket).

Cloud Run (no external LB) appends the client address to `X-Forwarded-For`, so one hop is the documented value. The user's verification step (spoofed XFF + logs) confirms it post-deploy; if wrong only the env var changes (`gcloud run services update ... --update-env-vars TRUST_PROXY_HOPS=<n>` or edit the workflow value).

### 2. Trusted web traffic bypass

- **Header name `X-Internal-Api-Key`.** Clear intent, conventional `X-` custom header, does not collide with `Authorization` (this is not auth and must not be mistaken for it, nor trigger CORS/auth-middleware semantics), and "Internal" signals first-party-only.
- **Extension point: module-level `skipIf` via `ThrottlerModule.forRootAsync`** rather than subclassing `ThrottlerGuard.shouldSkip`. Rationale: subclassing requires re-declaring the base constructor with the throttler `@Inject*` tokens to add `AppConfigService` (fragile across throttler upgrades), while `forRootAsync({ inject: [AppConfigService], useFactory })` is the documented, typed way to feed config and a `skipIf(context)` callback. `ThrottlerGuard` stays the plain `APP_GUARD`. `skipIf` is synchronous, which suits a header compare.
- Factory returns `{ throttlers: [{ ttl: 60_000, limit: 60 }], skipIf: createInternalKeyBypass(appConfig.internalApiKey) }`.
- Helper `apps/api/src/common/throttler/internal-key-bypass.ts` exports `createInternalKeyBypass(secret?: string): (ctx: ExecutionContext) => boolean` and a pure `isValidInternalKey(provided, secret)`:
  - `secret` undefined/empty -> always `false`.
  - read `req.headers['x-internal-api-key']` (Node lowercases header names); only a single string value counts (array -> `false`).
  - compare `Buffer.from(provided)` vs `Buffer.from(secret)`: if lengths differ return `false` (`timingSafeEqual` throws on unequal lengths; length leakage is acceptable because the key length is fixed and public in the Joi `min(32)` contract; alternatively hash both with SHA-256 and compare digests, which equalizes lengths — chosen: **hash both with SHA-256 then `timingSafeEqual`**, removing the length branch entirely).
- Joi: `INTERNAL_API_KEY: Joi.string().min(32).optional().allow('')`; getter maps empty -> `undefined`. Joi error messages must not echo the value (use `.messages()` without `{{#value}}`; also `abortEarly` prints labels only, but the custom message is set explicitly).
- No 401/403: a failed check just falls through to normal throttling.
- Health continues to use `@SkipThrottle()` unchanged.

### 3. Storage stays in-memory (per-instance limit)

Redis is out of scope. Consequences accepted and documented: the effective per-client limit is `60 x instances`, and counters reset on cold start/scale-to-zero. Rationale: scale-to-zero with a small instance count, public static dataset, the first-party consumer bypasses the limit, and the guard's purpose is abuse dampening, not a quota. Redis would add an always-on paid dependency and a new failure mode on the request path.

### 4. Graceful shutdown

`app.enableShutdownHooks()` is added in `main.ts` before `listen`. Nest registers `SIGTERM`/`SIGINT` listeners, which defeats the PID-1 "ignore SIGTERM" behavior; on signal `app.close()` stops the HTTP server (in-flight requests drain) and runs lifecycle hooks, then Nest removes its listeners and re-raises the signal (verified in `@nestjs/core` 12.1.2 `nest-application-context.js`), so the process ends terminated by `SIGTERM` (status 143 / signal -15), not with exit code 0. Measured locally: ~15 ms when idle.

- **OWID cache / OwidModule: no `onApplicationShutdown`.** The Keyv in-memory store has no timers or handles; there is nothing to release. Adding an empty hook would be dead code. Revisit only if a persistent/remote cache store is adopted.
- **Init process (tini / `docker --init`): not warranted.** The only PID-1 problems are signal default-handling and zombie reaping. The first is solved by Node's explicit `SIGTERM` handler (installed by Nest); the second is irrelevant because the app spawns no child processes. Cloud Run does not support `docker run --init` flags anyway; `tini` would mean installing a package in the Alpine image and changing `ENTRYPOINT`, expanding the blast radius of a Dockerfile that has its own spec. `CMD ["node", "main.js"]` is kept (exec form, so Node is PID 1 and receives the signal directly; a shell-form CMD would have been the real bug).
- Cloud Run's default grace period (10 s) is retained. Request timeouts in the app (OWID timeout 10 s max + retries) can exceed it for pathological cases; those would be cut by SIGKILL as today. Not changed here (non-goal).
- Test strategy: the existing `bootstrap.test.ts` duplicates bootstrapping rather than exercising `main.ts`. `main.ts` calls `bootstrap()` at import, so for the unit test mock `NestFactory.create` with a fake app (`jest.mock('@nestjs/core')`, `jest.isolateModules`) and assert call order (`set('trust proxy', n)`, `enableShutdownHooks`, `listen`). A real-signal check (spawn built `main.js`, send `SIGTERM`, expect exit 0) is performed manually in the verify task rather than in Jest (needs a build, slow, flaky in CI).

### 5. Web side

- New `apps/web/src/lib/internalApiHeaders.ts` with `import 'server-only'`; returns `Record<string, string>`. `waterFootprint.ts` spreads it into `fetch` `headers`.
- `server-only` (exact-pinned in `apps/web/package.json`) is adopted because `process.env.INTERNAL_API_KEY` without the `NEXT_PUBLIC_` prefix is already not inlined into client bundles, but a Client Component importing the helper would silently get `undefined`; `server-only` converts that mistake into a build error. Cost: one tiny dependency and a Jest `moduleNameMapper` entry (`'^server-only$': '<rootDir>/__mocks__/server-only.ts'` empty module) - documented in the tasks. A grep of `.next/static` for a sentinel value validates no leak.
- Next's fetch data cache keys include request headers; the header value is constant per deployment, so cache behavior (ISR 86400) is unchanged.
- `API_BASE_URL` stays as is.

### 6. E2E approach

- `run-dev-servers.ts` spawns the API with `env: { ...process.env, TRUST_PROXY_HOPS: '1', INTERNAL_API_KEY: E2E_INTERNAL_API_KEY }` and the web server with `INTERNAL_API_KEY`. `apps/api/.env` is read by `ConfigModule` with lower priority than `process.env`, so spawned values win. The key is a committed, non-secret constant in `apps/web/e2e/utils/api-env.ts` (>= 32 chars) shared with the spec.
- Readiness gate untouched (health is exempt).
- **Isolation**: with hops=1 the existing specs (no `X-Forwarded-For`) still land in the loopback bucket exactly as today. The new spec gives every test its own RFC 5737 IP via the rightmost XFF entry, so it cannot exhaust the shared bucket. Throttler keys include class+handler, so the tests use `GET /demo-validation` and do not interact with water-footprint buckets.
- **Adopted API caveat**: if the wrapper adopts a manually started API, the env cannot be injected. A `beforeAll` probe sends two requests with different XFF IPs to a throttled route and compares `X-RateLimit-Remaining`; if they share a counter the spec throws an actionable message (fail, not skip, so CI cannot silently lose coverage). CI always spawns (`reuseExistingServer` false).
- Runs in `chromium-desktop` only (not `@smoke`) to avoid multiplying 60+ request bursts across five projects and keep suite time low. Uses `request` fixture with a sequential loop of 61 requests (~ms each locally).

### 7. Deploy

`deploy-api.yml`: add `TRUST_PROXY_HOPS=1` to `env_vars`; add `secrets: |  INTERNAL_API_KEY=internal-api-key:latest` to the `deploy-cloudrun@v3` step (input name verified against the action's `action.yml` by the coder before editing). `:latest` is chosen so rotation needs a redeploy only (Cloud Run resolves `latest` at revision start). No new GitHub variables; pre-flight unchanged. The secret name is fixed (`internal-api-key`) and documented.

## Alternatives considered

- **`trust proxy: true`**: rejected, spoofable.
- **Custom `getTracker` parsing `X-Forwarded-For`**: rejected; reimplements Express logic and would be easy to get wrong. Express `trust proxy` + default tracker is the idiomatic path.
- **Subclass `ThrottlerGuard` overriding `shouldSkip`**: viable and equally correct, rejected for constructor re-declaration coupling (see 2). `getTracker` override to return a constant for internal traffic was rejected: it would still count against a bucket.
- **IP allowlisting Vercel egress**: Vercel has no stable egress ranges on standard plans.
- **Cloud Run IAM / authenticated invocation for the web**: stronger, but changes the public contract (`--allow-unauthenticated`), needs ID tokens from Vercel, and is auth (explicit non-goal).
- **Redis storage**: rejected (see 3).
- **tini / `--init`**: rejected (see 4).
- **`server-only` skipped**: rejected; cheap guard against a silent leak/misconfiguration.
- **Raising limits instead of a bypass**: contradicts the decision to keep 60/60.

## Risk assessment

| Risk                                                                                                              | Mitigation                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong hop count in production: too low -> shared bucket again (status quo); too high -> clients can spoof via XFF | Default 0, deploy sets 1 per documented behavior, mandatory manual post-deploy verification, only an env var changes to fix it          |
| `INTERNAL_API_KEY` leak lets anyone skip throttling                                                               | It is only a throttle bypass (no data access); Secret Manager + server-only env; documented rotation; never logged; Joi min length 32   |
| Deploy fails if the secret/IAM grant is missing                                                                   | Revision fails to start, previous revision keeps serving; runbook orders manual steps before the first deploy that includes this change |
| Merging code before the secret exists: web sends no header/API has no key                                         | Both sides are optional; behavior degrades to per-IP limiting (with real IPs), no outage                                                |
| Vercel build/cache poisoned by header                                                                             | Header constant per deployment; no cache-key churn                                                                                      |
| E2E bucket pollution/flakiness                                                                                    | Unique RFC 5737 IP per test, dedicated route, health exempt, precondition probe                                                         |
| Adopted API without env breaks the new spec locally                                                               | Actionable failure message; documented in `apps/api/README.md`                                                                          |
| Per-instance limit weaker than it appears                                                                         | Explicit documentation and spec requirement; accepted                                                                                   |
| `main.ts` test brittleness (module-level `bootstrap()` call)                                                      | `jest.isolateModules` + mocked `NestFactory`; assert order only                                                                         |
| `server-only` breaks Jest imports                                                                                 | Jest `moduleNameMapper` to an empty stub (tasks)                                                                                        |
| 10 s grace period shorter than worst-case OWID retry chain                                                        | Unchanged from today; noted, out of scope                                                                                               |

## File structure changes

```
apps/api/src/common/throttler/internal-key-bypass.ts      (new)
apps/api/src/config/env-validation.schema.ts               (+TRUST_PROXY_HOPS, +INTERNAL_API_KEY)
apps/api/src/config/app-config.service.ts                  (+trustProxyHops, +internalApiKey)
apps/api/src/app/app.module.ts                             (ThrottlerModule.forRootAsync)
apps/api/src/main.ts                                       (NestExpressApplication, trust proxy, shutdown hooks)
apps/api/__tests__/common/throttler/internal-key-bypass.test.ts (new)
apps/api/__tests__/app/throttler-client-ip.test.ts         (new, supertest)
apps/api/__tests__/app/main.test.ts                        (new, mocked bootstrap)
apps/api/__tests__/config/*.test.ts                        (extended)
apps/web/src/lib/internalApiHeaders.ts                     (new)
apps/web/src/lib/waterFootprint.ts                         (headers)
apps/web/__tests__/lib/*                                   (new/extended), apps/web/__mocks__/server-only.ts, jest.config.cjs
apps/web/e2e/run-dev-servers.ts, e2e/utils/api-env.ts, e2e/rate-limit.spec.ts
.github/workflows/deploy-api.yml, docs/deploy/cloud-run.md, apps/api/README.md, both .env.example, ROADMAP.md
```
