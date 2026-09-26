# pre-commit-quality-gate Specification

## Purpose

Defines the pre-commit hooks that enforce linting and formatting on staged files.

## Requirements

### Requirement: Pre-commit hook blocks lint errors

The system SHALL run ESLint with `--fix` on all staged `.ts`, `.tsx`, and `.js` files before a commit is accepted. If ESLint reports unfixable errors after auto-fix, the commit SHALL be rejected and the error output SHALL be shown to the developer.

#### Scenario: Commit with fixable lint warning

- **WHEN** a developer runs `git commit` with staged `.ts` files that have auto-fixable ESLint issues
- **THEN** lint-staged SHALL auto-fix the issues, re-stage the fixed files, and allow the commit to proceed

#### Scenario: Commit with unfixable lint error

- **WHEN** a developer runs `git commit` with staged `.ts` files that have unfixable ESLint errors
- **THEN** the commit SHALL be rejected with a non-zero exit code and ESLint error output SHALL be displayed

### Requirement: Pre-commit hook enforces formatting

The system SHALL run Prettier with `--write` on all staged `.ts`, `.tsx`, `.js`, and `.json` files before a commit is accepted. Prettier SHALL auto-format the files and re-stage them as part of the commit.

#### Scenario: Commit with unformatted file

- **WHEN** a developer runs `git commit` with staged files that are not formatted per `.prettierrc`
- **THEN** lint-staged SHALL auto-format the files, re-stage them, and allow the commit to proceed

### Requirement: Hook is installed automatically on npm install

The system SHALL install the Husky pre-commit hook automatically when a contributor runs `npm install`, via the `prepare` lifecycle script.

#### Scenario: Fresh clone and install

- **WHEN** a contributor clones the repository and runs `npm install`
- **THEN** the `.husky/pre-commit` hook SHALL be installed and active with no manual steps required

### Requirement: Hook is skipped in CI

The system SHALL NOT run the pre-commit hook in CI environments where `npm ci` is used (which skips the `prepare` script by default in production-like environments).

#### Scenario: CI install skips hook setup

- **WHEN** the CI pipeline runs `npm ci` with `NODE_ENV=production` or `HUSKY=0`
- **THEN** Husky SHALL NOT install hooks and the pipeline SHALL not be affected
