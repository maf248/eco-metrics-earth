## Why

The CI job `Format, Lint, Typecheck, Build & Test` takes ~13 min, ~10 of them in the E2E step (615 Playwright tests on 2 workers, the default for the 4-vCPU public-repo runner). Every merge to `main` waits for it before the web is promoted and the API is deployed, and each new category adds ~1.5–2 min. Standard GitHub-hosted runners are free and unlimited for public repositories (20 concurrent jobs on the Free plan), so running E2E in parallel shards on separate runners costs nothing.

## What Changes

- The single CI job is split into three jobs:
  - `checks`: format, lint, typecheck, build, the API prune guard and the unit tests.
  - `e2e`: a 4-shard matrix, `npm run e2e -- --shard=<n>/4`, each shard with its own docs-only gate.
  - `ci`: a light gate job that keeps the contract name `Format, Lint, Typecheck, Build & Test`. It succeeds only when `checks` and every shard succeeded.
- The jobs start in parallel, so the wall time becomes the slowest shard, ~5 min, instead of the sum, ~13 min.
- The deploy jobs keep `needs: [ci, api-image]`. The Vercel Deployment Check keeps the same job name, so nothing changes in Vercel.
- The Playwright container is declared once, with a YAML anchor, and reused by `checks` and `e2e`. The image tag stays a single literal, so the drift guard keeps reading one line.
- The docs-only gate moves into each shard and now also skips `npm ci` in that shard. The `checks` job always runs everything.
- A superseded run on a non-`main` branch shows the gate job as `skipped` instead of `failure`. On `main` the gate always runs, and a cancelled or failed job fails it.
- Docs (AGENTS.md, README, `docs/deploy/vercel.md`) and the roadmap are updated. `docs/deploy/cloud-run.md` already describes the deploys as waiting for the CI job and needs no change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-workflow`:
  - the job-name contract now sits on a gate job;
  - concurrency is per verification job and per shard;
  - the container is shared by two jobs;
  - the docs-only gate runs per shard;
  - new requirements cover E2E sharding and the gate job's conclusion.
- `api-cloud-run-deploy`: a superseded run skips the CI gate job instead of cancelling it; the deploys still do not run.

## Impact

- `.github/workflows/ci.yml`; structure tests in `apps/web/__tests__/scripts/detect-e2e-skip.test.ts`. `apps/api/__tests__/scripts/deploy-api-check-name.test.ts` keeps its check-name contract tests; its cancellation test now reads the verification jobs and asserts the gate has no cancellation group.
- No app code, no API contract, no dependency change. No Vercel or GitHub setting change.
- Runner usage: one checks job, four shards and the gate per push. All are free on a public repository, and nothing is uploaded as an artifact.
