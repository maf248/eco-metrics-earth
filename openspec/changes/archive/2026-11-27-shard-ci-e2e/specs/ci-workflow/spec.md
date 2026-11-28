## MODIFIED Requirements

### Requirement: The CI job name is a stable contract

The CI workflow (`.github/workflows/ci.yml`) SHALL keep exactly one job named `Format, Lint, Typecheck, Build & Test`, with job id `ci`. It is the gate job: it does no verification of its own, and it concludes from the verification jobs `checks` and `e2e` (see "The gate job concludes from the verification jobs"). That name is consumed by the Vercel Deployment Check (see capability `web-production-deploy-gate`), by the deploy jobs' `needs` and by the docs-only E2E detector. It SHALL NOT be renamed without updating the Vercel setting in the same change. The workflow SHALL carry a YAML comment next to the job name stating this contract. No other job in any workflow SHALL reuse that name, and job names SHALL be unique across workflows, because Vercel identifies checks by job name. The verification jobs SHALL have their own distinct names.

#### Scenario: Contract is visible where it can be broken

- **WHEN** a developer opens `ci.yml` to edit the CI job
- **THEN** a comment adjacent to `name: Format, Lint, Typecheck, Build & Test` states that Vercel Deployment Checks and the deploy gate depend on the name

#### Scenario: Job names are unique

- **WHEN** all job names across `.github/workflows/*.yml` (and the jobs of called workflows) are listed
- **THEN** `Format, Lint, Typecheck, Build & Test` appears once and no two workflows define a job with the same name
- **AND** each E2E shard reports a distinct name that contains its shard index

### Requirement: CI concurrency is scoped to the CI job

The CI workflow SHALL NOT declare a workflow-level `concurrency` block. Each verification job SHALL declare its own job-level `concurrency` with `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`:

- `checks`: group `${{ github.workflow }}-${{ github.ref }}`.
- each `e2e` shard: group `${{ github.workflow }}-e2e-${{ matrix.shard }}-${{ github.ref }}`. The shard index is in the key, so the shards of one run never cancel each other.

A newer push to the same non-`main` ref therefore supersedes the running verification jobs, and runs on `main` are never cancelled. The gate job `ci` and the jobs downstream of it (the API deploys) SHALL NOT be subject to these cancellation groups, so a newer push can never cancel a deploy that is already running.

#### Scenario: Superseded CI run is cancelled

- **GIVEN** a CI run in progress on `feature/x`
- **WHEN** a newer push to `feature/x` starts another run
- **THEN** the older run's `checks` job and E2E shards are cancelled
- **AND** the older run's gate job is skipped, not failed

#### Scenario: Main is never cancelled

- **GIVEN** a CI run in progress on `main`
- **WHEN** a newer push to `main` starts another run
- **THEN** both runs' verification jobs and gate jobs run to completion

#### Scenario: A running deploy survives a newer push

- **GIVEN** the deploy job of a run for commit A is executing on `develop`
- **WHEN** commit B is pushed to `develop` and its CI jobs start
- **THEN** the deploy job for A is not cancelled
- **AND** B's deploy job waits in the `deploy-api-development` group after A finishes

### Requirement: CI verifies that the API production install is reproducible

After the `Build` step and before `Test`, the `checks` job SHALL run `npx nx run api:prune`, then `npm ci --omit=dev --ignore-scripts --dry-run` inside `apps/api/dist`, each in a step whose name states its purpose.

- A pruned lockfile that does not satisfy the pruned `package.json` (for example `lock file's rxjs@7.8.1 does not satisfy rxjs@7.8.2`) SHALL fail the `checks` job and therefore the gate job. The inconsistency then blocks the pull request and the deploy instead of surfacing during the Docker build.
- The step SHALL use the Nx cache normally: the prune targets are keyed on the root lockfile and the API sources, so a cache hit is a valid result.
- The step SHALL NOT install anything or modify tracked files.

#### Scenario: Consistent lockfile passes

- **GIVEN** a root lockfile with a single `rxjs` 7.8.2
- **WHEN** the `checks` job reaches the guard step
- **THEN** the dry-run succeeds and the job continues

#### Scenario: Inconsistent lockfile fails CI

- **GIVEN** a root lockfile in which a hoisted dependency does not satisfy the version `apps/api` declares (e.g. root `rxjs` 7.8.1 with `apps/api` declaring 7.8.2)
- **WHEN** the `checks` job reaches the guard step
- **THEN** `npm ci --dry-run` exits non-zero with an `Invalid: lock file's ... does not satisfy ...` error and the job fails before `Test`

#### Scenario: Guard is reproducible locally

- **WHEN** a developer runs `npx nx run api:prune` followed by `npm ci --omit=dev --ignore-scripts --dry-run` in `apps/api/dist`
- **THEN** the result matches what CI reports

### Requirement: The CI job runs in the official Playwright container

The verification jobs `checks` and `e2e` SHALL run with `container.image` set to `mcr.microsoft.com/playwright:v<version>-noble`, where `<version>` equals the pinned `@playwright/test` version, and with `--init --ipc=host` as container options.

- The container SHALL be declared once, as a YAML anchor on the `checks` job (`container: &playwright-container`), and reused by `e2e` through an alias (`container: *playwright-container`). The image tag is then a single literal.
- Neither job SHALL run `playwright install` or install OS packages with `apt`.
- Both jobs SHALL set `HOME=/root` (Playwright's CI guidance for Firefox in containers) and declare a job `timeout-minutes`. The `E2E` step SHALL also declare its own `timeout-minutes`.
- No step of these jobs SHALL require a Docker daemon; the API image is built by the separate `api-image` job.
- The gate job `ci` SHALL run on `ubuntu-latest` without a container.

#### Scenario: No apt or browser download in CI

- **GIVEN** a CI run on any branch
- **WHEN** the job logs are inspected
- **THEN** there is no `Install Playwright browsers` step and no `apt` or `playwright install` output
- **AND** the E2E shards together run the chromium, firefox and webkit projects successfully

#### Scenario: Gate behavior is preserved

- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** the job `ci` is still named `Format, Lint, Typecheck, Build & Test` with the contract comment
- **AND** the `needs` of `deploy-api-production` and `deploy-api-development` still include `ci` (they additionally include `api-image`)

#### Scenario: Existing CI steps work inside the container

- **WHEN** the verification jobs run in the container
- **THEN** in `checks`, checkout (with `fetch-depth: 0`), `npm ci`, the format check, lint, typecheck, build, the API prune and `npm ci --dry-run` guard, and the unit tests all pass
- **AND** in each shard, checkout, `npm ci` and E2E all pass

### Requirement: CI guards against Playwright image and package drift

Because `jobs.<id>.container.image` cannot read workflow-level `env`, the image tag SHALL be a single literal in `ci.yml`, shared by every job that uses the container through a YAML anchor.

- Right after dependencies are installed, the `checks` job SHALL run `node scripts/check-playwright-image.mjs`. The script reads the tag from the `image:` line of `.github/workflows/ci.yml` and compares its version with the installed `@playwright/test` version.
- On mismatch, the script SHALL exit non-zero with a message that names the exact image tag to use (e.g. `mcr.microsoft.com/playwright:v1.64.0-noble`) and says that `ci.yml` must be updated.

#### Scenario: Versions match

- **GIVEN** `@playwright/test` is `1.63.0` and the image tag is `v1.63.0-noble`
- **WHEN** the guard step runs
- **THEN** it exits 0

#### Scenario: Playwright was bumped without the image

- **GIVEN** `@playwright/test` is `1.64.0` and the image tag is `v1.63.0-noble`
- **WHEN** the guard step runs
- **THEN** it exits non-zero before Build, and the message says to use `mcr.microsoft.com/playwright:v1.64.0-noble`

#### Scenario: Guard is reproducible locally

- **WHEN** a developer runs `node scripts/check-playwright-image.mjs` after `npm ci`
- **THEN** the result matches what CI reports

### Requirement: The E2E step is skipped for docs-only changes on a green base

Each E2E shard SHALL run a detection step after checkout and before `Install dependencies`. The shard's `Install dependencies` and `E2E` steps SHALL be gated by a step-level `if:` on the detection step's output, never by a job-level `if` and never by `paths-ignore`.

The steps SHALL be skipped only when BOTH conditions hold:

- (a) every path changed between `BASE_SHA` and `HEAD_SHA` matches the docs-only pattern;
- (b) the CI check named `Format, Lint, Typecheck, Build & Test` has at least one latest check run on `BASE_SHA`, and every latest check run has conclusion `success`.

`BASE_SHA` SHALL be `github.event.before`; `HEAD_SHA` SHALL be `github.sha`.

Each shard SHALL always run and report its own conclusion. The `checks` job SHALL have no step-level `if`: the format check, lint, typecheck, build, the API prune checks and the unit tests SHALL run regardless of the decision.

#### Scenario: Docs-only push on a green base skips E2E

- **GIVEN** a push whose diff `BASE_SHA..HEAD_SHA` contains only `*.md` and `openspec/` paths
- **AND** the CI check on `BASE_SHA` concluded `success`
- **WHEN** the E2E shards run
- **THEN** each shard skips its `Install dependencies` and `E2E` steps and concludes `success`
- **AND** the job `Format, Lint, Typecheck, Build & Test` still runs and concludes `success`

#### Scenario: Push containing code runs E2E

- **GIVEN** a push whose diff contains at least one path that is not `*.md` and not under `openspec/`
- **WHEN** the detection step runs
- **THEN** it decides to run E2E and lists the non-docs files

#### Scenario: Multi-commit push containing code runs E2E

- **GIVEN** a push of three commits (code, code, docs) whose `BASE_SHA` is the tip before the push
- **WHEN** the detection step diffs `BASE_SHA..HEAD_SHA`
- **THEN** the diff includes the code files
- **AND** E2E runs even though the last commit is docs-only

#### Scenario: Docs-only pull request on a green base skips E2E

- **GIVEN** a pull request whose head commit was pushed with a diff against `github.event.before` that is docs-only
- **AND** the CI check on that base SHA concluded `success`
- **WHEN** the push run of the head commit runs the E2E shards
- **THEN** their `E2E` steps are skipped and the jobs still report
- **AND** the pull request shows that push run as its CI check

#### Scenario: Unit tests, build and lint always run on docs-only changes

- **GIVEN** a docs-only change on a green base
- **WHEN** the `checks` job runs
- **THEN** the format check, lint, typecheck, build, API prune checks and unit tests all execute
- **AND** only the shards' `Install dependencies` and `E2E` steps are skipped

### Requirement: A skip requires a green base CI check

The detector SHALL query the GitHub REST API with native `fetch`, a short timeout and the automatic `GITHUB_TOKEN`:

`GET /repos/{owner}/{repo}/commits/{BASE_SHA}/check-runs?check_name=<name>&filter=latest&app_id=15368`

- `15368` is the GitHub Actions app, so a check of the same name created by another app is ignored.
- `<name>` comes from the environment variable `CI_CHECK_NAME`, set in each shard's detection step to the gate job's name. It is not hard-coded in the script.
- The base counts as green only when the response contains at least one check run and every returned check run has conclusion `success`.
  - With `filter=latest`, only the most recent attempt per check suite is returned, so a successful re-run after a failure counts as green.
  - A gate job that was skipped or failed is not green.
  - A response whose `total_count` exceeds the number of returned check runs SHALL be treated as a doubt.
- The `e2e` job SHALL declare `permissions` with `contents: read` and `checks: read`. The `checks` job SHALL declare only `contents: read`, and the gate job SHALL declare no permissions.
- No secret, PAT or repository setting SHALL be required.

#### Scenario: Base check failed

- **GIVEN** a docs-only diff
- **AND** the only check run on `BASE_SHA` has conclusion `failure`
- **WHEN** the detector decides
- **THEN** E2E runs and the reason mentions the base conclusion

#### Scenario: Base check cancelled or in progress

- **GIVEN** a docs-only diff
- **AND** the check run on `BASE_SHA` has conclusion `cancelled` or `skipped`, or is `in_progress` with a null conclusion
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: Base check re-run succeeded

- **GIVEN** a docs-only diff
- **AND** a failed check run on `BASE_SHA` was re-run in the same check suite and the latest attempt concluded `success`
- **WHEN** the detector decides
- **THEN** the base counts as green and E2E is skipped

#### Scenario: Push run failed while the pull request run passed

- **GIVEN** a docs-only diff
- **AND** the latest check runs on `BASE_SHA` are a `failure` from the `push` event and a `success` from the `pull_request` event (which tested a merge tree)
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: Base has no matching check run

- **GIVEN** a docs-only diff
- **AND** `BASE_SHA` has no check run with the CI job name (for example a `chore(release)` commit pushed with `[skip ci]`, or the job was renamed)
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: GitHub API failure runs E2E

- **GIVEN** a docs-only diff
- **AND** the API call times out, rejects, answers non-2xx, or returns an unparsable body
- **WHEN** the detector decides
- **THEN** E2E runs and the reason states the API failure
- **AND** the detector exits 0

## ADDED Requirements

### Requirement: E2E runs in parallel shards

The `e2e` job SHALL be a matrix over `shard: [1, 2, 3, 4]` with `fail-fast: false`.

- Each shard SHALL run `npm run e2e -- --shard=${{ matrix.shard }}/${{ strategy.job-total }}`, so the shard count is defined only by the matrix.
- Each shard SHALL be named `E2E (shard <n>/<total>)`.
- The `e2e` job SHALL NOT `need` the `checks` job, so the two start in parallel.
- No shard SHALL upload artifacts or reports.

#### Scenario: Shards cover the whole suite

- **WHEN** `npx playwright test --list --shard=<n>/4` is run for `n` from 1 to 4
- **THEN** the union of the four lists equals `npx playwright test --list` and no test appears twice

#### Scenario: One failing shard does not hide the others

- **GIVEN** a push in which a test of shard 2 fails
- **WHEN** the run proceeds
- **THEN** shards 1, 3 and 4 still run to completion and report
- **AND** the gate job fails

#### Scenario: Verification jobs start together

- **WHEN** a push starts the CI workflow
- **THEN** `checks` and all four E2E shards start without waiting for each other

### Requirement: The gate job concludes from the verification jobs

The gate job `ci` SHALL declare `needs: [checks, e2e]`. Its condition SHALL be:

```yaml
if: ${{ always() && (github.ref == 'refs/heads/main' || !contains(needs.*.result, 'cancelled')) }}
```

- The job SHALL have a single step. That step fails unless both `needs.checks.result` and `needs.e2e.result` are `success`, and it prints each result.
- The results SHALL be passed to the step through `env`, never interpolated into the script.
- The job SHALL NOT check out the repository.

#### Scenario: All verification jobs pass

- **GIVEN** `checks` and every shard concluded `success`
- **WHEN** the gate job runs
- **THEN** it concludes `success` and the deploy jobs that `need` it may start

#### Scenario: A verification job fails

- **GIVEN** the unit tests in `checks` fail, or a shard fails
- **WHEN** the gate job runs
- **THEN** it concludes `failure` and names the failed job's result
- **AND** the deploy jobs are skipped and the Vercel production deployment stays held

#### Scenario: Superseded run off main

- **GIVEN** a run on `develop` whose verification jobs were cancelled by a newer push
- **WHEN** the gate job is evaluated
- **THEN** it is `skipped`, and so are the deploy jobs of that run

#### Scenario: Cancelled run on main

- **GIVEN** a run on `main` whose verification jobs were cancelled by hand
- **WHEN** the gate job is evaluated
- **THEN** it runs and concludes `failure`, so production is not promoted
