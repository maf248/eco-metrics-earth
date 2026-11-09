# Pre-push Quality Gate Specification

## Purpose

Defines the fast, deterministic local pre-push gate (`.husky/pre-push`): main-branch protection plus NX-cached affected unit tests. Change validation is primarily guaranteed by the SDD flow (`@tester` runs the gates, including E2E when the change warrants it), with CI providing the unconditional E2E safety net on every push and PR. Specs the hook for the first time (it was previously added incrementally via commits, never through an OpenSpec proposal).

## Requirements

### Requirement: Pre-push hook blocks direct pushes to main

The `.husky/pre-push` hook SHALL reject any push whose current branch is `main` with a non-zero exit code and a message directing the developer to open a PR. This preserves the existing branch-protection behavior (commit `4c389b9`) unchanged.

#### Scenario: Push attempt from main is rejected

- **GIVEN** the developer is on the `main` branch
- **WHEN** the pre-push hook runs (via a real push, `git push --dry-run`, or direct `sh .husky/pre-push` execution)
- **THEN** the hook prints the "Direct push to main is not allowed. Open a PR." message and exits non-zero before running any test target

#### Scenario: Push attempt from any other branch proceeds to the test gate

- **GIVEN** the developer is on `develop` or a `feature/*` branch
- **WHEN** the pre-push hook runs
- **THEN** the branch check passes and the affected-test step executes

### Requirement: Pre-push hook runs affected unit tests only

The `.husky/pre-push` hook SHALL run `npx nx affected --target=test --base=origin/develop` and SHALL NOT run the E2E suite (`npx nx e2e web` or any form of it). The hook's remaining steps are NX-cached and complete in seconds-to-low-minutes; no step in the hook spawns dev servers or a browser.

#### Scenario: Docs-only push skips test execution entirely

- **GIVEN** the only changed files since `origin/develop` are non-project files (e.g. `AGENTS.md`, `ROADMAP.md`)
- **WHEN** the hook runs `npx nx affected --target=test --base=origin/develop`
- **THEN** NX reports no affected projects, no test suite executes, and the hook exits 0 quickly

#### Scenario: Failing affected unit test blocks the push

- **GIVEN** a change in `apps/api` that breaks an API unit test
- **WHEN** the hook runs
- **THEN** `nx affected` executes the api test target, the failing test produces a non-zero exit, and the push is blocked

#### Scenario: The hook never runs the Playwright suite

- **WHEN** the contents of `.husky/pre-push` are inspected after this change
- **THEN** no line invokes `nx e2e`, `npm run e2e`, or Playwright, and a comment documents that E2E runs in CI on every push plus optionally locally via `npm run e2e`

### Requirement: E2E coverage on push is provided by CI, not the local hook

Removing E2E from the local hook SHALL NOT reduce E2E coverage of pushed code: the CI workflow (`.github/workflows/ci.yml`) runs the full Playwright suite (`npm run e2e`) on every push to every branch (`on: push: branches: ['**']`); a pull request shows the checks of the push run on its head commit. This requirement records the safety-net contract the slimmed hook relies on — if CI's E2E step is ever removed or made conditional, this requirement is violated and the hook design must be revisited.

#### Scenario: A push to develop triggers full E2E in CI

- **GIVEN** a commit pushed to `develop` (or any branch)
- **WHEN** the CI workflow triggered by that push completes
- **THEN** the run included lint, typecheck, build, unit tests, and the full E2E suite — a broken E2E fails CI within minutes of the push

#### Scenario: A PR from develop to main is gated by CI including E2E

- **GIVEN** a pull request from `develop` to `main`
- **WHEN** the CI run triggered by pushing its head commit completes
- **THEN** the pull request shows that run's checks, including the full E2E suite, before it is merged

### Requirement: Change validation is guaranteed by the SDD flow

With E2E out of the local hook, the primary validation guarantor SHALL be the SDD flow: the `@tester` Verify step runs the unit suites AND `npm run e2e` for changes that warrant E2E (user-facing / behavioral / significant, as encoded in the approved spec's tasks), and `@spec-writer` includes E2E tasks in `tasks.md` discretionally by the same change-type criterion (when in doubt, ask the user). CI remains the unconditional safety net; the hook is the fast gate. The contract is recorded in `AGENTS.md` (Validate step gate + pre-PR checklist with `npm run e2e`), `CLAUDE.md` (Validation step), `.opencode/agents/tester.md`, and `.opencode/agents/spec-writer.md`.

#### Scenario: A user-facing change is validated with E2E before closing

- **GIVEN** an approved change whose tasks include an E2E gate (user-facing / behavioral change)
- **WHEN** the SDD Validate step runs
- **THEN** @tester runs the unit suites and `npm run e2e`, and the change is not closed while an E2E failure is unresolved

#### Scenario: A no-behavior change skips E2E at validation

- **GIVEN** an approved change with no behavioral surface (e.g. docs-only or developer-tooling only)
- **WHEN** the SDD Validate step runs
- **THEN** lint + build + unit tests suffice for the gate, and E2E coverage remains provided by CI on push

### Requirement: The hook is validatable without a real push

The hook SHALL remain a plain `sh` script with no dependency on husky-injected environment variables or on git's stdin ref list, so that `sh .husky/pre-push` executed from the repo root is a faithful local validation. (`git push --dry-run` also runs pre-push hooks — empirically verified — while sending no updates; with E2E removed from the hook it is a fast secondary validation path.)

#### Scenario: Direct script execution reproduces hook behavior

- **GIVEN** the slimmed hook and a repo state with affected projects since `origin/develop`
- **WHEN** `sh .husky/pre-push` is executed from the repo root
- **THEN** the same branch check and `nx affected` run execute, with the same pass/fail outcome as a real push would produce

### Requirement: Pre-push hook validates OpenSpec canonical specs and archived changes

The `.husky/pre-push` hook SHALL run the two validations as separate fail-fast commands (`npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1`) after the main-branch guard and before the affected-test step, so an invalid OpenSpec state fails fast (~1.5–2 s) ahead of the NX test run. The gate SHALL cover only canonical specs (`--specs`) and archived changes (`--archived`): active/in-progress changes SHALL NOT be validated at push time so mid-spec pushes stay allowed. A non-zero exit of either validate command SHALL block the push.

#### Scenario: Invalid canonical spec blocks the push

- **GIVEN** a canonical spec (`openspec/specs/<capability>/spec.md`) that fails validation, such as a requirement without SHALL or MUST body text
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit non-zero and the push SHALL be blocked before the affected-test step runs

#### Scenario: Archived change with unchecked tasks blocks the push

- **GIVEN** an archived change whose `tasks.md` still has unchecked task boxes
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit non-zero and the push SHALL be blocked

#### Scenario: Valid specs and complete archives pass the gate

- **GIVEN** all canonical specs valid and all archived changes with fully checked tasks
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit 0 and the hook SHALL proceed to the affected-test step

#### Scenario: An active mid-spec change does not block the push

- **GIVEN** an active change in `openspec/changes/<name>/` with incomplete artifacts or unchecked tasks
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL NOT fail on account of that active change — it is out of the gate's scope — and the push SHALL NOT be blocked by it
