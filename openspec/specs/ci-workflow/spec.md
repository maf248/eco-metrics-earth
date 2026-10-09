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

The CI workflow SHALL NOT declare a workflow-level `concurrency` block. The CI job SHALL declare job-level `concurrency` with group `${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — the same semantics as before: a newer push to the same non-`main` ref supersedes the running CI job, and runs on `main` are never cancelled. Jobs downstream of the CI job (the API deploy) SHALL NOT be subject to the CI job's cancellation group, so a newer push can never cancel a deploy that is already running.

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
- **AND** B's deploy job waits in the `deploy-api` group after A finishes

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
