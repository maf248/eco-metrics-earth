# ci-node-version Specification

## Purpose

The CI pipeline runs on Node.js 24 without deprecation warnings, and the local dev environment pins to the same version.

## Requirements

### Requirement: CI and release workflows use Node.js 24

#### Scenario: CI workflow uses Node 24

- **GIVEN** a push or pull request triggers the `ci.yml` workflow
- **WHEN** the `Setup Node.js` step runs
- **THEN** the runner environment has Node.js 24 available
- **AND** no "Node.js 20 actions are deprecated" warning appears in the job log

#### Scenario: Release workflow uses Node 24

- **GIVEN** a push to `main` triggers the `release.yml` workflow
- **WHEN** the `Setup Node.js` step runs
- **THEN** the runner environment has Node.js 24 available
- **AND** no "Node.js 20 actions are deprecated" warning appears in the job log

### Requirement: Local development pins to Node.js 24

#### Scenario: Local dev pins to Node 24

- **GIVEN** a developer runs `nvm use` in the repo root
- **WHEN** nvm reads `.nvmrc`
- **THEN** it activates Node.js 24

### Requirement: TypeScript types match the runtime

#### Scenario: TypeScript types match the runtime

- **GIVEN** the project runs on Node.js 24
- **WHEN** TypeScript resolves `@types/node`
- **THEN** the installed version is `24.19.0`
- **AND** `npm run typecheck` exits with code 0
