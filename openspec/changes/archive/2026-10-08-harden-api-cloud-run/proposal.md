# Proposal: harden-api-cloud-run (ROADMAP P3)

## Why

Two production defects exist in the Cloud Run deployment of `apps/api`:

1. **Rate limiting is almost certainly one shared bucket.** `ThrottlerGuard` (global `APP_GUARD`, 60 req / 60 s) keys on `req.ip`, and `main.ts` never sets Express `trust proxy`. Behind Cloud Run's front end, `req.ip` is the Google proxy address, so every caller shares a single bucket: one aggressive client can lock out everyone, including the Vercel server that renders the pages.
2. **No graceful shutdown.** `main.ts` never calls `app.enableShutdownHooks()`. The container runs `node main.js` as PID 1 (`USER node`); Node as PID 1 ignores `SIGTERM` unless a handler is registered, so Cloud Run waits out its grace period and sends `SIGKILL`, cutting in-flight requests.

Traffic reality (verified in code): the browser never calls the API. The only consumer is `apps/web/src/lib/waterFootprint.ts`, executed server-side by `apps/web/src/app/[category]/page.tsx` (ISR, `revalidate: 86400`) on Vercel. API traffic is therefore Vercel server egress plus anyone hitting the public `*.run.app` URL directly. Fixing the client identity alone would still rate-limit Vercel's egress IP pool against itself, hence the trusted-web-traffic bypass below.

## Goals

- Make the throttler key the **real client IP** on Cloud Run, via a configurable, exact number of trusted proxy hops (`TRUST_PROXY_HOPS`, applied as `app.set('trust proxy', <n>)`), so a forged `X-Forwarded-For` cannot evade or poison the limit.
- Let the Next.js server (trusted first-party consumer) skip throttling by presenting a shared secret header (`X-Internal-Api-Key`), compared in constant time against `INTERNAL_API_KEY`. This is a throttle bypass, not authentication.
- Keep throttler storage in-memory and the limit at 60 req / 60 s; state explicitly that the limit is **per instance**.
- Handle `SIGTERM` gracefully (`app.enableShutdownHooks()`), covered by a bootstrap test.
- Prove client identification and bypass with supertest tests AND a Playwright E2E scenario against the locally started API.
- Provide manual, documented steps (GCP secret, IAM, Vercel env, post-deploy hop-count verification) for the user.
- Update `api-security-hardening`, `api-cloud-run-deploy`, `e2e-server-readiness` and add `api-graceful-shutdown`, `web-api-client`, `e2e-api-rate-limiting` capabilities; update README/runbook/`.env.example` files; close P3 in `ROADMAP.md`.

## Non-Goals

- No Redis or any shared/distributed throttler storage. No cross-instance limit accuracy.
- No change to the limit (stays 60 req / 60 s) or TTL, no per-route limits, no block-duration tuning.
- No authentication or authorization. A missing/wrong `X-Internal-Api-Key` is never a 401/403; it just means normal per-IP limiting.
- No removal of the demo/scaffold endpoint (roadmap I12).
- No `trust proxy: true`, no custom `X-Forwarded-For` parsing, no `ipv6SubnetPrefix` tuning.
- No Cloud Run ingress restriction, Cloud Armor, or load balancer introduction.
- No init process (`tini` / `docker --init`) and no Dockerfile `CMD` change (see design).
- No browser-side API calls and no CORS change.
- No automated rotation of `INTERNAL_API_KEY`; rotation is a documented manual procedure only.
- No `onApplicationShutdown` hook for the OWID cache (it holds no handles; see design).

## Impact

- **apps/api**: new env vars `TRUST_PROXY_HOPS`, `INTERNAL_API_KEY` (Joi + `AppConfigService`); `main.ts` (`NestExpressApplication`, `trust proxy`, `enableShutdownHooks`); `app.module.ts` (`ThrottlerModule.forRootAsync` with `skipIf`); new `common/throttler/` helper; new tests under `apps/api/__tests__/`.
- **apps/web**: new server-only helper adding the header to BFF fetches; `waterFootprint.ts` uses it; `server-only` dependency (exact pin) plus Jest mapping; tests; `.env.example`.
- **apps/web/e2e**: `run-dev-servers.ts` passes env to spawned servers; new `rate-limit.spec.ts` (Playwright `test(...)`); shared E2E constants.
- **CI/CD**: `.github/workflows/deploy-api.yml` sets `TRUST_PROXY_HOPS=1` and mounts `INTERNAL_API_KEY` from Secret Manager (`secrets:` input).
- **Docs**: `apps/api/README.md`, `docs/deploy/cloud-run.md`, `apps/api/.env.example`, `apps/web/.env.example`, `ROADMAP.md`.
- **Manual user tasks** (cannot be done by the coder): create GCP secret, grant `secretAccessor`, set Vercel env var, post-deploy hop verification.
- **Behavior change in production**: per-client buckets replace the shared bucket; Vercel traffic with the key is unthrottled; the API now exits promptly on `SIGTERM`.
