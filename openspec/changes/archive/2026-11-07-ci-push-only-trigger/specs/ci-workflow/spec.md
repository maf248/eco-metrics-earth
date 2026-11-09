# Spec Delta

## ADDED Requirements

### Requirement: CI runs once per push

The CI workflow (`.github/workflows/ci.yml`) SHALL be triggered only by `push` events, on every branch; each push runs it once, for its head commit. It SHALL NOT declare a `pull_request` trigger, so a pull request never starts a second run for a commit that its push already tested. A pull request SHALL show the checks of the push run on its head commit.

#### Scenario: Opening a develop to main pull request starts no extra run

- **GIVEN** the tip of `develop` was pushed and its CI run started
- **WHEN** a pull request from `develop` to `main` is opened or updated
- **THEN** no additional CI workflow run starts for that pull request
- **AND** the pull request shows the `Format, Lint, Typecheck, Build & Test` and `Build API image (no push)` checks of the push run on its head commit

#### Scenario: Merging to main runs the full CI before production

- **GIVEN** a pull request from `develop` to `main`
- **WHEN** it is merged
- **THEN** the resulting push to `main` runs the full CI workflow, E2E included unless the docs-only gate skips it
- **AND** the production deploys wait for that run as before

## MODIFIED Requirements

### Requirement: CI builds the API image without publishing it

`.github/workflows/ci.yml` SHALL define a job with id `api-image` and name `Build API image (no push)` that runs on `ubuntu-latest` (not inside the Playwright container). The job SHALL use `permissions: contents: read`, its own job-level `concurrency` (group scoped to the workflow, the job and `github.ref`; `cancel-in-progress` true except on `main`) and a `timeout-minutes`. It SHALL run on every `push` that triggers the workflow. The job SHALL build the root `Dockerfile` with `docker/build-push-action` using `push: false`, and SHALL NOT log in to any registry, push any image, or start a container from the image. The job SHALL conclude `success` when the image builds, or when no image input changed (the build steps are skipped by step-level conditions, never by a job-level `if`).

#### Scenario: Image input change triggers a build that does not publish

- **GIVEN** a push whose diff touches `Dockerfile`
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

The `api-image` job SHALL decide whether to build with `scripts/detect-api-image-changes.sh`, which diffs `BASE_SHA` and `HEAD_SHA` and matches the changed paths against the pattern in `scripts/api-image-inputs.pattern` plus these CI-only entries: `.github/workflows/ci.yml`, `scripts/api-image-inputs.pattern` and `scripts/detect-api-image-changes.sh`. `BASE_SHA` SHALL be `github.event.before`; `HEAD_SHA` SHALL be `github.sha`. The checkout SHALL use `fetch-depth: 0`. The script SHALL decide `build=true` whenever it cannot prove that no input changed: empty or all-zero base SHA, base SHA not present in the clone, or `git diff` failure. It SHALL write the decision to `GITHUB_OUTPUT` and a summary (base, head, matched files, decision and reason) to the log and to `GITHUB_STEP_SUMMARY`.

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

### Requirement: The E2E step is skipped for docs-only changes on a green base

The `ci` job SHALL run a detection step after checkout and before the `E2E` step. The `E2E` step SHALL be gated by a step-level `if:` on the detection step's output, never by a job-level `if` and never by `paths-ignore`. The E2E step SHALL be skipped only when BOTH conditions hold: (a) every path changed between `BASE_SHA` and `HEAD_SHA` matches the docs-only pattern, and (b) the CI check named `Format, Lint, Typecheck, Build & Test` has at least one latest check run on `BASE_SHA` and every latest check run has conclusion `success`. `BASE_SHA` SHALL be `github.event.before`; `HEAD_SHA` SHALL be `github.sha`. The job itself SHALL always run and report its own conclusion; Format check, lint, typecheck, build, the API prune checks and unit tests SHALL run regardless of the decision.

#### Scenario: Docs-only push on a green base skips E2E

- **GIVEN** a push whose diff `BASE_SHA..HEAD_SHA` contains only `*.md` and `openspec/` paths
- **AND** the CI check on `BASE_SHA` concluded `success`
- **WHEN** the `ci` job runs
- **THEN** the `E2E` step is skipped
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
- **WHEN** the push run of the head commit runs the `ci` job
- **THEN** the `E2E` step is skipped and the job still reports
- **AND** the pull request shows that push run as its CI check

#### Scenario: Unit tests, build and lint always run on docs-only changes

- **GIVEN** a docs-only change on a green base
- **WHEN** the `ci` job runs
- **THEN** the format check, lint, typecheck, build, API prune checks and unit tests all execute
- **AND** only the `E2E` step is skipped
