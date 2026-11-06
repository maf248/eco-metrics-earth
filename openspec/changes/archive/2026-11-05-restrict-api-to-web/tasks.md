# Tasks: restrict-api-to-web

Read `AGENTS.md` and `design.md` first. Jest uses `it(...)`, Playwright uses `test(...)`. English only. Do not commit.

## API

- [x] 1. Create `apps/api/src/common/internal-key/` with `AllowKeyless()` decorator and `InternalKeyGuard` (401 body never reveals missing vs wrong nor echoes values). (spec: API rejects requests without a valid internal key)
- [x] 2. Apply `@AllowKeyless()` and `@SkipThrottle({ default: true, anonymous: true })` to `HealthController.check()` only. (spec: Liveness probe stays reachable)
- [x] 3. Verify per-throttler `skipIf` behavior in `node_modules/@nestjs/throttler` 6.7.1; replace `createInternalKeyBypass` with `classifyRequest`; configure `default` 300 and `anonymous` 30 in `app.module.ts`; register `ThrottlerGuard` before `InternalKeyGuard`. (spec: Rate limiting has two tiers)
- [x] 4. Joi: `INTERNAL_API_KEY` required (min 32) when `NODE_ENV=production`. (spec: required at startup in production)
- [x] 5. Remove the production `addServer` from `apps/api/src/main.ts`.
- [x] 5b. Joi: `SWAGGER_ENABLED` must be `false` when `NODE_ENV=production` (Swagger bypasses global guards); unit tests. (spec: Swagger cannot be enabled in production)
- [x] 6. Unit tests (`it`): guard (no key, wrong key, different length, valid, allow-keyless, key unset), classification, two-tier behavior with small limits (401 then 429, independent tiers, forged `X-Forwarded-For`, health open, `/health/dependencies` and unknown path 401), `AppModule` throttler entries, Joi production rules, health metadata. Adapt existing throttler tests.

## E2E

- [x] 7. Add `apiHeaders()` to `apps/web/e2e/utils/api-env.ts`; use it for every direct API call in `apps/web/e2e` (`grep -rn API_BASE_URL apps/web/e2e`).
- [x] 8. Rewrite `rate-limit.spec.ts`: keyless 401, wrong key 401, anonymous 429 after 30, keyed not 429 at 70, keyed 429 at 301, health open without key. (spec: E2E proves access control and both tiers)

## Deploy and docs

- [x] 9. `deploy-api.yml`: add `max_instances` (production 2, development 1) to the target `case`, output it, add `--max-instances` to the deploy flags. (spec: Both services have a hard instance cap)
- [x] 10. Replace every occurrence of the production backend URL in `README.md`, `ROADMAP.md` (wording only, no ID changes), `docs/deploy/cloud-run.md` with generic placeholders; README no longer lists a public API base URL. (spec: Production URL is not in tracked files)
- [x] 11. Update `README.md`, `apps/api/README.md`, `apps/api/.env.example`, `docs/deploy/cloud-run.md` (curl examples send the key, tiers, instance caps, key required in production) and the `common/` line in `AGENTS.md`.

## Validation

- [x] 12. `grep -rnE "eco-metrics-api(-dev)?-[a-z0-9]+-[a-z]+\.a\.run\.app" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive --exclude-dir=.next --exclude-dir=.nx` returns nothing outside `openspec/changes/archive`.
- [x] 13. `npm run format:check`, `npm run lint`, `npm run build`, `npm run test`, `npm run e2e` green; `npx openspec validate restrict-api-to-web --strict` passes.

## Post-deploy check (manual, user)

After the dev deploy: keyless `curl` on `/api/v1/health` is 200, on any other route 401, with the key 200; a Vercel preview renders.
