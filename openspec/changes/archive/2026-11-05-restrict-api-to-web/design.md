# Design: restrict-api-to-web

## Decisions

1. **Guard, not throttler, enforces the key.** New global `InternalKeyGuard` (`apps/api/src/common/internal-key/`) reuses `isValidInternalKey` (constant-time). Key unset (only possible outside production) -> allow; `@AllowKeyless()` metadata -> allow; valid key -> allow; else `UnauthorizedException`. `@AllowKeyless()` is applied only to `HealthController.check()` (the Cloud Run startup probe sends no key). Unknown paths without a key also get `401`.
2. **Two named throttlers**, `ttl 60_000`, tracked by `req.ip`: `default` 300 (skipIf request is anonymous) and `anonymous` 30 (skipIf request is keyed). `classifyRequest` = keyed if the key is valid OR no key is configured (keeps local dev open); otherwise anonymous. Replaces `createInternalKeyBypass`. 300 is 5x the old limit (real traffic is a few dozen requests/day) and caps a leaked key or looping bug; 30 costs nothing because anonymous traffic is meant to be rejected anyway.
3. **Throttle first, then 401** (`ThrottlerGuard` registered before `InternalKeyGuard`): keeps the anonymous tier meaningful and caps key-guessing rate. Both rejections are O(1) and equally billed.
4. **Health**: `@SkipThrottle({ default: true, anonymous: true })` (bare `@SkipThrottle()` only skips `default`).
5. **Startup**: Joi requires `INTERNAL_API_KEY` (min 32) when `NODE_ENV=production`; both Cloud Run services already set `NODE_ENV=production` and mount the secret. Optional otherwise.
6. **Instance caps**: `max_instances` resolved in the existing target `case` of `deploy-api.yml` (production 2, development 1) and passed as `--max-instances`. Two in production so a rolling deploy or cold-start retry does not hit the cap; the web serves from its 24 h ISR cache (stale-if-error) if the API saturates. Excess load degrades to `429`/`503` instead of scaling.
7. **URL removal**: drop the production `addServer` in `main.ts` (Swagger is disabled in production); replace the literal URL in README, ROADMAP and `docs/deploy/cloud-run.md` with `https://<service>-<hash>-<region-code>.a.run.app`-style placeholders. The README stops presenting a public API base URL. The real URL lives only in Vercel `API_BASE_URL`.

## Rollout

Vercel Production/Preview already hold `INTERNAL_API_KEY`; verify, merge to `develop` first (dev service), check a preview renders and keyless `curl` returns `401`, then merge to `main`.

## Risks

- Direct API calls in E2E specs would get `401`: add a shared `apiHeaders()` helper and update them.
- Per-throttler `skipIf` semantics in `@nestjs/throttler` 6.7.1 must be verified (fallback: `ThrottlerGuard` subclass).
- Instance cap only bounds the burn rate, not a monthly total.

## Alternatives (one line each)

Cloud Run IAM + ID tokens (stronger, but out of scope by decision); fail closed when key unset in dev (breaks local dev, production cannot boot without it anyway).
