## ADDED Requirements

### Requirement: The CI job runs in the official Playwright container

The CI job `Format, Lint, Typecheck, Build & Test` SHALL run with `container.image` set to `mcr.microsoft.com/playwright:v<version>-noble`, where `<version>` equals the pinned `@playwright/test` version. The job SHALL NOT run `playwright install` or install OS packages with `apt`. The job name, its `needs` relationships and the `timeout-minutes` of the job SHALL remain unchanged. The job SHALL set `HOME=/root` (Playwright's CI guidance for Firefox in containers) and pass `--init --ipc=host` as container options. The `E2E` step SHALL declare its own `timeout-minutes`. No step of the CI job SHALL require a Docker daemon.

#### Scenario: No apt or browser download in CI

- **GIVEN** a CI run on any branch
- **WHEN** the job log is inspected
- **THEN** there is no `Install Playwright browsers` step and no `apt` or `playwright install` output
- **AND** the `E2E` step runs the chromium, firefox and webkit projects successfully

#### Scenario: Gate behavior is preserved

- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** the job is still named `Format, Lint, Typecheck, Build & Test` with the contract comment
- **AND** `deploy-api-production` and `deploy-api-development` still declare `needs: ci`

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
