## MODIFIED Requirements

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
