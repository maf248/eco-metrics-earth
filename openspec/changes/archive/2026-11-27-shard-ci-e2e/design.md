## Context

Measured on the merge to `main` of 2026-11-27 (local time; run 46086771862):

| Phase                                                   | Time     |
| ------------------------------------------------------- | -------- |
| Container init + checkout + Node + `npm ci`             | ~60 s    |
| Format, lint, typecheck, build, prune guard, unit tests | ~95 s    |
| E2E: servers up                                         | ~15 s    |
| E2E: 615 tests, 2 workers                               | 10.3 min |
| Whole job                                               | ~13 min  |

The E2E time is spent in the tests themselves: the sum of the test durations is 1174 s, and that divided by 2 workers is the 10 min. The per-project totals are:

- chromium: 555 s
- webkit: 195 s
- mobile-safari: 186 s
- firefox: 145 s
- mobile-chrome: 92 s

Constraints:

- **Vercel check name.** The name `Format, Lint, Typecheck, Build & Test` is the Vercel Deployment Check.
- **Deploys.** The deploy jobs `need` the CI job, and no newer push may cancel a running deploy.
- **Docs-only gate.** The gate is step-level and reads the base commit's check of that name.
- **Cost.** Standard runners are free and unlimited on public repositories, with 20 concurrent jobs on the Free plan.

## Goals / Non-Goals

**Goals**

- Cut the CI wall time to roughly the slowest shard.
- Keep every contract unchanged: check name, deploy `needs`, gate semantics and the single image literal.
- Add no cost and no repository or Vercel setting.

**Non-Goals**

- Running E2E against a production build (`next build` + `next start`) instead of `next dev`. It would remove the on-demand compilation, but it changes caching semantics under test, so it is a separate decision.
- Merging Playwright reports. The `list` output of each shard's log is enough, and uploading blobs would use artifact storage.
- Increasing workers per runner.

## Decisions

### 1. Three jobs: `checks`, `e2e` (matrix) and `ci` (gate)

- **`checks`** (`name: Checks: format, lint, typecheck, build & unit tests`) keeps every non-E2E step, in the same order.
- **`e2e`** (`name: E2E (shard <n>/<total>)`) runs a matrix `shard: [1, 2, 3, 4]` with `fail-fast: false`, so one failing shard does not hide the failures of the others. Each shard runs `npm run e2e -- --shard=${{ matrix.shard }}/${{ strategy.job-total }}`, so the shard count lives only in the matrix.
- **`ci`** keeps the job id and the contract name, so `deploy-api-*` keep `needs: [ci, api-image]` and Vercel keeps its check. It has `needs: [checks, e2e]`, runs on `ubuntu-latest` with no container and no checkout, declares `permissions: {}`, and has one step. That step fails unless both results are `success`. It reads `needs.*.result` through `env`, never interpolated into the script.

`checks` and `e2e` do not depend on each other, so they start together.

- **Alternative: E2E `needs: checks`.** This saves runner time on a lint failure, but adds ~2.5 min to every green run. Rejected.
- **Alternative: one job per browser project.** The projects are unbalanced (chromium is 47% of the time). Rejected.

### 2. Four shards

Playwright splits by test count (`fullyParallel: true` from the Nx preset). Applying the last run's durations to `--shard=i/N --list`, the test seconds per shard are:

| N   | Test seconds per shard | Slowest shard on 2 workers |
| --- | ---------------------- | -------------------------- |
| 2   | 515 / 659              | ~5.5 min                   |
| 3   | 400 / 294 / 480        | ~4 min                     |
| 4   | 340 / 176 / 324 / 335  | ~2.8 min                   |

Each shard also pays ~1.5 min of fixed overhead:

- container init, `npm ci` and server start;
- `next dev` compiling, from scratch in each shard, the pages that shard visits.

With four shards that gives ~4.5–5 min per shard. A run uses 6 jobs (checks, 4 shards, `api-image`), 7 with the gate, so even two simultaneous runs stay under the 20-job limit, and jobs over the limit only queue.

Weighted sharding exists only through the internal `PWTEST_SHARD_WEIGHTS` variable, which is not a public API. It is not used.

### 3. Container shared through a YAML anchor

`checks` declares `container: &playwright-container` (image, `--init --ipc=host`) and `e2e` uses `container: *playwright-container`. GitHub Actions supports anchors and aliases since September 2025; merge keys are not supported and are not needed. The image tag stays one literal, so `scripts/check-playwright-image.mjs` needs no change. Both jobs set `HOME: /root`.

### 4. Concurrency per job and per shard

- `checks`: group `${{ github.workflow }}-${{ github.ref }}`, which was the old CI job's group.
- `e2e`: group `${{ github.workflow }}-e2e-${{ matrix.shard }}-${{ github.ref }}`. The shard is in the key, because a shared group would make the shards of one run cancel each other.

Both use `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`. The gate and the deploys have no shared group, so a newer push never cancels a running deploy.

### 5. Gate conclusion: superseded runs are skipped off `main`

When a newer push supersedes a run, its `checks` and `e2e` jobs are cancelled, but the run is not. A plain `if: always()` gate would then report `failure` for the older commit. The gate therefore runs with:

```yaml
if: ${{ always() && (github.ref == 'refs/heads/main' || !contains(needs.*.result, 'cancelled')) }}
```

- **Off `main`, a cancelled need:** the gate is `skipped`, which keeps the old grey state for superseded commits.
- **On `main`:** the gate always runs, even when the run is cancelled by hand, and fails unless both needs succeeded. A Vercel production deployment is therefore never released by a skipped check, since it is not documented how Vercel treats one. `main` runs are never superseded anyway.
- **The docs-only detector** reads only a `success` conclusion as green, so a skipped or failed base check makes the next push run E2E, as before.

### 6. Docs-only gate in each shard

Each shard checks out with `fetch-depth: 0` and marks the workspace as a git `safe.directory`. It then sets up Node and runs `Decide whether E2E can be skipped` (`node scripts/detect-e2e-skip.cjs`, which has no dependencies), with `CI_CHECK_NAME` equal to the gate's name. `Install dependencies` and `E2E` are gated on `steps.e2e_gate.outputs.skip_e2e != 'true'`, so a docs-only push costs each shard only the container and checkout.

The `e2e` job declares `permissions: contents: read, checks: read`. `checks` keeps only `contents: read` and has no step-level `if` at all. It drops the `safe.directory` step: that step was added only for the gate's git calls, and no other step reads git in the workspace (the script tests use temporary repositories).

### 7. Timeouts

- `checks`: 20 min.
- Each shard: 20 min, with the E2E step at 15 min.
- The gate: 5 min.

## Risks / Trade-offs

- **[Imbalance grows as tests are added]** Count-based shards drift as new tests land. The shard count is one matrix line; revisit it when the slowest shard passes ~6 min.
- **[More runner minutes per push]** About 4 × 1.5 min of repeated setup per push. It is free on a public repository. If the repository ever became private, these minutes would count against the plan; that is stated in the workflow comment.
- **[First CI run of this change]** CI cannot be run locally. Mitigations:
  - the workflow is linted with `actionlint`;
  - the structure tests read the workflow;
  - each shard was run locally with `CI=1` and 2 workers;
  - the first push to `develop` is the real check, and Vercel previews are ungated.
