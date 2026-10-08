## ADDED Requirements

### Requirement: Readiness wrapper injects the throttling environment into the servers it spawns

`apps/web/e2e/run-dev-servers.ts` SHALL pass an explicit `env` (merged over `process.env`) to the processes it spawns: the API receives `TRUST_PROXY_HOPS=1` and `INTERNAL_API_KEY=<E2E key>`; the web server receives the same `INTERNAL_API_KEY` so its server-side fetches bypass throttling. The E2E key is a non-secret constant (>= 32 chars) exported from `apps/web/e2e/utils/api-env.ts` and shared with `rate-limit.spec.ts`. An already-running API that is adopted keeps its own environment (the wrapper does not manage it). The readiness gate is unchanged: it still polls `GET /api/v1/health`, which remains throttler-exempt, and the api-first sequencing, adoption and cleanup guarantees continue to hold.

#### Scenario: Spawned API carries the E2E throttling env

- **GIVEN** `:3001` free
- **WHEN** the wrapper spawns `npx nx serve api`
- **THEN** the child environment contains `TRUST_PROXY_HOPS=1` and the E2E `INTERNAL_API_KEY`

#### Scenario: Readiness gate unaffected

- **WHEN** the readiness poll hits `/api/v1/health` many times during boot
- **THEN** it never receives `429` and the wrapper reaches the "both servers are up" state as before

#### Scenario: Adopted API is not modified

- **GIVEN** an API already answering on `:3001`
- **WHEN** the wrapper runs
- **THEN** it does not restart or reconfigure it (the rate-limit spec's precondition probe reports a mismatch if applicable)
