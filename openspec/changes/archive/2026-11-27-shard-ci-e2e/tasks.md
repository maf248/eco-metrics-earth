## 1. Workflow

- [x] 1.1 Split the `ci` job of `.github/workflows/ci.yml` into `checks`, `e2e` (4-shard matrix) and the gate job `ci`, which keeps its name and contract comment. The container is shared through a YAML anchor.
- [x] 1.2 Concurrency per verification job and per shard; the gate condition and its result step; permissions and timeouts as designed
- [x] 1.3 Validate the workflow: YAML parse with anchor resolution, the structure tests and the image guard (`actionlint` was not available locally; the first CI run on `develop` confirms GitHub accepts the file)

## 2. Tests

- [x] 2.1 Rewrite the `ci.yml` structure tests in `apps/web/__tests__/scripts/detect-e2e-skip.test.ts` for the new layout:
  - the shard gate and the gated steps;
  - no `if` in `checks`;
  - permissions, `CI_CHECK_NAME` equal to the gate name;
  - the anchor and alias;
  - the matrix, `fail-fast` and the shard argument;
  - the per-shard concurrency key;
  - the gate condition and needs.
- [x] 2.2 `apps/api/__tests__/scripts/deploy-api-check-name.test.ts`: the cancellation test reads the verification jobs; `scripts/check-playwright-image.mjs` passes unchanged
- [x] 2.3 Run every shard locally with `CI=1` and 2 workers; check that the shards' union equals the full list

## 3. Docs

- [x] 3.1 AGENTS.md (CI/CD gates, push workflow), README CI section, `docs/deploy/vercel.md` (job-name coupling, superseded row) (`docs/deploy/cloud-run.md` needed no change)
- [x] 3.2 ROADMAP: remove the E2E sharding item, renumber the following items and update the status table and the action plan

## 4. Close

- [x] 4.1 Gates: format, lint, typecheck, unit tests, build, `openspec validate`
- [x] 4.2 Reviewer audit
- [x] 4.3 Archive the change
