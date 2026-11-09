# Spec Delta

## MODIFIED Requirements

### Requirement: CI and release workflows use Node.js 24

The CI and release workflows (`.github/workflows/ci.yml` and `.github/workflows/release.yml`) SHALL use Node.js 24 in their `Setup Node.js` steps.

#### Scenario: CI workflow uses Node 24

- **GIVEN** a push triggers the `ci.yml` workflow
- **WHEN** the `Setup Node.js` step runs
- **THEN** the runner environment has Node.js 24 available
- **AND** no "Node.js 20 actions are deprecated" warning appears in the job log

#### Scenario: Release workflow uses Node 24

- **GIVEN** a push to `main` triggers the `release.yml` workflow
- **WHEN** the `Setup Node.js` step runs
- **THEN** the runner environment has Node.js 24 available
- **AND** no "Node.js 20 actions are deprecated" warning appears in the job log
