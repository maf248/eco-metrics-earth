## MODIFIED Requirements

### Requirement: Automatic API deploys are gated by the CI job on the same commit

The automatic API deploys SHALL run only as jobs of the CI workflow (`.github/workflows/ci.yml`) that call `./.github/workflows/deploy-api.yml` with `needs:` on the CI job `Format, Lint, Typecheck, Build & Test`. There SHALL be exactly two calling jobs: one with `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` passing `target: production`, and one with `if: github.event_name == 'push' && github.ref == 'refs/heads/develop'` passing `target: development`. Each calling job SHALL grant `permissions: contents: read, id-token: write`, and SHALL use `secrets: inherit` only if the called workflow requires secrets (it currently reads only `vars`, so it SHALL NOT). The image deployed SHALL be built from the same commit SHA that passed CI (image tag = `github.sha`). The CI job is the gate job of capability `ci-workflow`, which concludes from the verification jobs. If it fails, is cancelled or is skipped, the deploy job SHALL NOT run. Release commits pushed by `release.yml` carry `[skip ci]` and therefore never trigger a deploy on their own.

#### Scenario: Green CI on develop deploys

- **GIVEN** a push to `develop`
- **WHEN** the CI job completes successfully
- **THEN** the development deploy job starts, after the CI job, for the same commit SHA, targeting `eco-metrics-api-dev`
- **AND** the production deploy job is skipped

#### Scenario: Green CI on main deploys the production service

- **GIVEN** a push to `main` (the merge commit of a `develop` → `main` pull request)
- **WHEN** the CI job completes successfully
- **THEN** the production deploy job starts, after the CI job, for the same commit SHA, targeting `eco-metrics-api`
- **AND** the development deploy job is skipped

#### Scenario: Red CI never deploys

- **GIVEN** a push to `develop` or `main` where the CI job fails (format, lint, typecheck, build, test, E2E, or the lockfile guard)
- **WHEN** the workflow run finishes
- **THEN** both deploy jobs are skipped and no image is pushed and no revision is created

#### Scenario: Superseded CI run does not deploy

- **GIVEN** a push to `develop` whose verification jobs are cancelled because a newer push superseded it, so its CI gate job is skipped
- **WHEN** the superseded run finishes
- **THEN** its deploy job does not run (the newer push's pipeline decides)

#### Scenario: Other refs and pull requests never deploy

- **GIVEN** a push to a branch other than `develop` or `main`, or a pull request
- **WHEN** the CI workflow runs
- **THEN** both deploy jobs are skipped

#### Scenario: Repository variables resolve inside the called workflow

- **GIVEN** the required repository variables are set
- **WHEN** the deploy workflow runs as a called workflow
- **THEN** the pre-flight step finds all of them (if `vars` do not resolve in the called workflow, the deploy values are passed as `workflow_call` inputs instead — design.md risk R3 of the original deploy change)
