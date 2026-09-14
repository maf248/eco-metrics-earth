# Spec: Pre-push quality gate (new capability)

The `.husky/pre-push` hook was added incrementally via commits `b259183` (affected tests), `4c389b9` (main-branch block), and `b31401b` (the `npx nx e2e web` line, bolted on inside an unrelated E2E fix commit) — never through an OpenSpec proposal. This change specs the capability for the first time, in its post-change shape: a fast, deterministic pre-flight gate, with change validation primarily guaranteed by the SDD flow and the E2E safety net provided by CI.

## ADDED

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

Removing E2E from the local hook SHALL NOT reduce E2E coverage of pushed code: the CI workflow (`.github/workflows/ci.yml`) runs the full Playwright suite (`npm run e2e`) on every push to every branch (`on: push: branches: ['**']`) and on every pull request to `main`. This requirement records the safety-net contract the slimmed hook relies on — if CI's E2E step is ever removed or made conditional, this requirement is violated and the hook design must be revisited.

#### Scenario: A push to develop triggers full E2E in CI

- **GIVEN** a commit pushed to `develop` (or any branch)
- **WHEN** the CI workflow triggered by that push completes
- **THEN** the run included lint, typecheck, build, unit tests, and the full E2E suite — a broken E2E fails CI within minutes of the push

#### Scenario: A PR from develop to main is gated by CI including E2E

- **GIVEN** a pull request from `develop` to `main`
- **WHEN** CI runs on the PR
- **THEN** the full E2E suite is part of the required checks before the PR can merge

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

## File Changes

### MODIFIED: `.husky/pre-push`

Remove the `npx nx e2e web` line; keep the main-branch block and the `npx nx affected --target=test --base=origin/develop` line; add a brief comment pointing to CI (`.github/workflows/ci.yml`) as the E2E net and to `npm run e2e` for local runs.

### MODIFIED: `AGENTS.md`

Validate step names the gate (lint + build + unit tests, plus E2E when the change warrants it per the spec); the pre-PR checklist adds `npm run e2e`; the "Push workflow" playbook is rewritten condensed (~4 lines) to match the slimmed hook — the obsolete items (E2E in the hook, SSH timeout during the long hook, I17 workaround, run-gates-in-parts) are removed.

### MODIFIED: `CLAUDE.md`

Step 5 "Validation" gains the same one-line gate. Nothing else.

### MODIFIED: `.opencode/agents/tester.md`

Workflow step 5 "Verify": run the tests to surface failures — `npm run test` always, plus `npm run e2e` when the change warrants it. The "Run the tests or provide the exact command to run them" escape hatch is removed.

### MODIFIED: `.opencode/agents/spec-writer.md`

The `tasks.md` section gains one bullet: E2E tasks are discretionary by change type (user-facing / behavioral / significant → include; small or no-behavior → skip; when in doubt, ask the user).

### NOT MODIFIED (explicitly)

`.github/workflows/ci.yml` (the safety net already exists and must keep working as-is), `.husky/pre-commit` / `commit-msg` / `post-merge` / `post-checkout` (untouched), root `package.json` scripts, `opencode.json` and every other `.opencode/**` file (only `tester.md` and `spec-writer.md` change).
