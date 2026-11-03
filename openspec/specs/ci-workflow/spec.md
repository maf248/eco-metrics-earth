# ci-workflow Specification

## Purpose

Defines the contracts of the GitHub Actions CI workflow that other systems depend on: the stable CI job name consumed by Vercel Deployment Checks and by the API deploy gate, job-scoped concurrency that never cancels a running deploy, and the guard that keeps the API production install reproducible.

## Requirements

### Requirement: The CI job name is a stable contract

The CI workflow (`.github/workflows/ci.yml`) SHALL keep exactly one verification job named `Format, Lint, Typecheck, Build & Test`. That name is consumed by the Vercel Deployment Check (see capability `web-production-deploy-gate`) and by the deploy job's `needs`; it SHALL NOT be renamed without updating the Vercel setting in the same change. The workflow SHALL carry a YAML comment next to the job name stating this contract. No other job in any workflow SHALL reuse that name, and job names SHALL be unique across workflows (Vercel identifies checks by job name).

#### Scenario: Contract is visible where it can be broken

- **WHEN** a developer opens `ci.yml` to edit the CI job
- **THEN** a comment adjacent to `name: Format, Lint, Typecheck, Build & Test` states that Vercel Deployment Checks and the deploy gate depend on the name

#### Scenario: Job names are unique

- **WHEN** all job names across `.github/workflows/*.yml` (and the jobs of called workflows) are listed
- **THEN** `Format, Lint, Typecheck, Build & Test` appears once and no two workflows define a job with the same name

### Requirement: CI concurrency is scoped to the CI job

The CI workflow SHALL NOT declare a workflow-level `concurrency` block. The CI job SHALL declare job-level `concurrency` with group `${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — the same semantics as before: a newer push to the same non-`main` ref supersedes the running CI job, and runs on `main` are never cancelled. Jobs downstream of the CI job (the API deploys) SHALL NOT be subject to the CI job's cancellation group, so a newer push can never cancel a deploy that is already running.

#### Scenario: Superseded CI run is cancelled

- **GIVEN** a CI run in progress on `feature/x`
- **WHEN** a newer push to `feature/x` starts another run
- **THEN** the older run's CI job is cancelled

#### Scenario: Main is never cancelled

- **GIVEN** a CI run in progress on `main`
- **WHEN** a newer push to `main` starts another run
- **THEN** both CI jobs run to completion

#### Scenario: A running deploy survives a newer push

- **GIVEN** the deploy job of a run for commit A is executing on `develop`
- **WHEN** commit B is pushed to `develop` and its CI job starts
- **THEN** the deploy job for A is not cancelled
- **AND** B's deploy job waits in the `deploy-api-development` group after A finishes

### Requirement: CI verifies that the API production install is reproducible

After the `Build` step and before `Test`, the CI job SHALL run `npx nx run api:prune` and then `npm ci --omit=dev --ignore-scripts --dry-run` inside `apps/api/dist`, with a step name that states its purpose. A pruned lockfile that does not satisfy the pruned `package.json` (for example `lock file's rxjs@7.8.1 does not satisfy rxjs@7.8.2`) SHALL fail the CI job, so the inconsistency blocks the pull request and the deploy instead of surfacing during the Docker build. The step SHALL use the NX cache normally (the prune targets are keyed on the root lockfile and the API sources, so a cache hit is a valid result) and SHALL NOT install anything or modify tracked files.

#### Scenario: Consistent lockfile passes

- **GIVEN** a root lockfile with a single `rxjs` 7.8.2
- **WHEN** the CI job reaches the guard step
- **THEN** the dry-run succeeds and the job continues

#### Scenario: Inconsistent lockfile fails CI

- **GIVEN** a root lockfile in which a hoisted dependency does not satisfy the version `apps/api` declares (e.g. root `rxjs` 7.8.1 with `apps/api` declaring 7.8.2)
- **WHEN** the CI job reaches the guard step
- **THEN** `npm ci --dry-run` exits non-zero with an `Invalid: lock file's ... does not satisfy ...` error and the job fails before `Test`

#### Scenario: Guard is reproducible locally

- **WHEN** a developer runs `npx nx run api:prune` followed by `npm ci --omit=dev --ignore-scripts --dry-run` in `apps/api/dist`
- **THEN** the result matches what CI reports

### Requirement: The CI job runs in the official Playwright container

The CI job `Format, Lint, Typecheck, Build & Test` SHALL run with `container.image` set to `mcr.microsoft.com/playwright:v<version>-noble`, where `<version>` equals the pinned `@playwright/test` version. The job SHALL NOT run `playwright install` or install OS packages with `apt`. The job name, its `needs` relationships and the `timeout-minutes` of the job SHALL remain unchanged. The job SHALL set `HOME=/root` (Playwright's CI guidance for Firefox in containers) and pass `--init --ipc=host` as container options. The `E2E` step SHALL declare its own `timeout-minutes`. No step of this job SHALL require a Docker daemon (the API image is built by the separate `api-image` job).

#### Scenario: No apt or browser download in CI

- **GIVEN** a CI run on any branch
- **WHEN** the job log is inspected
- **THEN** there is no `Install Playwright browsers` step and no `apt` or `playwright install` output
- **AND** the `E2E` step runs the chromium, firefox and webkit projects successfully

#### Scenario: Gate behavior is preserved

- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** the job is still named `Format, Lint, Typecheck, Build & Test` with the contract comment
- **AND** the `needs` of `deploy-api-production` and `deploy-api-development` still include `ci` (they additionally include `api-image`)

#### Scenario: Existing CI steps work inside the container

- **WHEN** the CI job runs in the container
- **THEN** checkout (with `fetch-depth: 0`), `npm ci`, format check, lint, typecheck, build, the API prune and `npm ci --dry-run` guard, unit tests and E2E all pass

### Requirement: CI guards against Playwright image and package drift

Because `jobs.<id>.container.image` cannot read workflow-level `env`, the image tag SHALL be a single literal in `ci.yml`. Right after dependencies are installed, the CI job SHALL run `node scripts/check-playwright-image.mjs`, which reads the tag from the `image:` line of `.github/workflows/ci.yml` and compares its version with the installed `@playwright/test` version. On mismatch the script SHALL exit non-zero with a message that names the exact image tag to use (e.g. `mcr.microsoft.com/playwright:v1.64.0-noble`) and states that `ci.yml` must be updated.

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

### Requirement: CI builds the API image without publishing it

`.github/workflows/ci.yml` SHALL define a job with id `api-image` and name `Build API image (no push)` that runs on `ubuntu-latest` (not inside the Playwright container). The job SHALL use `permissions: contents: read`, its own job-level `concurrency` (group scoped to the workflow, the job and `github.ref`; `cancel-in-progress` true except on `main`) and a `timeout-minutes`. It SHALL run on every `push` and on every `pull_request` that triggers the workflow. The job SHALL build the root `Dockerfile` with `docker/build-push-action` using `push: false`, and SHALL NOT log in to any registry, push any image, or start a container from the image. The job SHALL conclude `success` when the image builds, or when no image input changed (the build steps are skipped by step-level conditions, never by a job-level `if`).

#### Scenario: Image input change triggers a build that does not publish

- **GIVEN** a push or pull request whose diff touches `Dockerfile`
- **WHEN** the `api-image` job runs
- **THEN** the image is built from the repository `Dockerfile`
- **AND** no registry login, push or container run happens
- **AND** the job fails if the build fails

#### Scenario: Unrelated change skips the build but the job succeeds

- **GIVEN** a push whose diff touches only `docs/` and `apps/web/`
- **WHEN** the `api-image` job runs
- **THEN** the Buildx and build steps are skipped
- **AND** the job conclusion is `success`, not `skipped`
- **AND** the job summary states that no image inputs changed

#### Scenario: Broken base image fails on the branch

- **GIVEN** a Dependabot branch that bumps the `node:24-alpine` digest to one that cannot be pulled or breaks the build
- **WHEN** CI runs for that branch
- **THEN** the `api-image` job fails on the branch
- **AND** the failure is visible before any merge to `develop`

#### Scenario: Runs are superseded without touching deploys

- **GIVEN** an `api-image` run is in progress on a feature branch
- **WHEN** a newer push to the same ref starts a new run
- **THEN** the older `api-image` run is cancelled
- **AND** on `main` it is never cancelled
- **AND** a running `deploy-api-*` job is never cancelled by the newer push

### Requirement: Image build detection uses the shared input list with a fail-safe to build

The `api-image` job SHALL decide whether to build with `scripts/detect-api-image-changes.sh`, which diffs `BASE_SHA` and `HEAD_SHA` and matches the changed paths against the pattern in `scripts/api-image-inputs.pattern` plus these CI-only entries: `.github/workflows/ci.yml`, `scripts/api-image-inputs.pattern` and `scripts/detect-api-image-changes.sh`. For `push`, `BASE_SHA` SHALL be `github.event.before`; for `pull_request`, the pull request base SHA; `HEAD_SHA` SHALL be `github.sha`. The checkout SHALL use `fetch-depth: 0`. The script SHALL decide `build=true` whenever it cannot prove that no input changed: empty or all-zero base SHA, base SHA not present in the clone, or `git diff` failure. It SHALL write the decision to `GITHUB_OUTPUT` and a summary (base, head, matched files, decision and reason) to the log and to `GITHUB_STEP_SUMMARY`.

#### Scenario: Shared input path triggers a build

- **GIVEN** a diff containing one of `apps/api/...`, `packages/shared/...`, `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json` or `.github/workflows/deploy-api.yml`
- **WHEN** the detection script runs
- **THEN** it outputs `build=true` and lists the matched files

#### Scenario: CI-only entries trigger a build

- **GIVEN** a diff containing `.github/workflows/ci.yml`, `scripts/api-image-inputs.pattern` or `scripts/detect-api-image-changes.sh`
- **WHEN** the detection script runs
- **THEN** it outputs `build=true`

#### Scenario: Non-input paths do not trigger a build

- **GIVEN** a diff containing only paths such as `apps/web/src/...`, `docs/...`, `README.md` or `openspec/...`
- **WHEN** the detection script runs
- **THEN** it outputs `build=false`

#### Scenario: New branch builds

- **GIVEN** `BASE_SHA` is empty or `0000000000000000000000000000000000000000`
- **WHEN** the detection script runs
- **THEN** it outputs `build=true` with the reason in the summary

#### Scenario: Force push builds

- **GIVEN** `BASE_SHA` is not a commit present in the clone
- **WHEN** the detection script runs
- **THEN** it outputs `build=true`

#### Scenario: Diff failure builds

- **GIVEN** `git diff --name-only` exits non-zero
- **WHEN** the detection script runs
- **THEN** it outputs `build=true`

### Requirement: Image build uses the GitHub Actions layer cache

The build step SHALL set `cache-from: type=gha,scope=api-image` and `cache-to: type=gha,mode=max,scope=api-image`, preceded by a `docker/setup-buildx-action` step. The Docker actions SHALL be pinned to a major version (`@vN`), like the other actions in the workflow.

#### Scenario: Second build reuses layers

- **GIVEN** a successful `api-image` build on a branch
- **WHEN** a later run builds the same `Dockerfile` with an unchanged lockfile
- **THEN** the dependency-install layers are restored from the cache and reported as `CACHED` in the build log
