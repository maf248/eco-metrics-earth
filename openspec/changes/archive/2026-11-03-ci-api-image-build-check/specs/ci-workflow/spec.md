## ADDED Requirements

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

## MODIFIED Requirements

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
