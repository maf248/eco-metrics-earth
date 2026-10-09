## Purpose

Defines how web production deployments on Vercel are gated by the CI job (Vercel Deployment Checks), how automated release commits are kept out of that gate by `scripts/vercel-ignore.sh`, and that preview deployments stay ungated.

## ADDED Requirements

### Requirement: Web production deployments wait for the CI job

The Vercel project SHALL have a **Deployment Check** selecting the GitHub Actions job `Format, Lint, Typecheck, Build & Test` (the CI job-name contract in capability `ci-workflow`), with automatic production aliasing enabled, so that Vercel holds every production deployment (branch `main`) until that job has passed for the deployed commit before assigning the production domains. A failed check SHALL leave the previous production deployment serving. The setting is a user-executed dashboard step documented in `docs/deploy/vercel.md`; the repository cannot enforce it (branch protection and rulesets are unavailable on the current GitHub plan for a private repository), and the runbook SHALL say so. A "Force Promote" from the Vercel deployment page is the documented manual bypass.

#### Scenario: Production deploy waits for green CI

- **GIVEN** the Deployment Check is configured and a pull request is merged into `main`
- **WHEN** Vercel finishes building the production deployment while the CI job for the merge commit is still running
- **THEN** the deployment is not aliased to the production domains yet
- **AND** it is promoted automatically once the CI job succeeds

#### Scenario: Red CI never reaches production

- **GIVEN** the Deployment Check is configured and the CI job fails for a commit on `main`
- **WHEN** the check completes
- **THEN** the production deployment is not promoted and the previous production deployment keeps serving

#### Scenario: Previews are not gated

- **GIVEN** a push to `develop` or any non-production branch
- **WHEN** Vercel builds the preview deployment
- **THEN** it is available without waiting for CI (by design: previews are for early review, and the runbook documents this)

#### Scenario: Runbook documents the manual steps and the limitation

- **WHEN** the user opens `docs/deploy/vercel.md`
- **THEN** it lists enabling automatic production aliasing, adding the Deployment Check for the CI job, the job-name rename caveat, the Force Promote bypass, the previews-ungated note, and the fact that GitHub branch protection is unavailable on the current plan

### Requirement: Vercel skips builds of automated release commits

`scripts/vercel-ignore.sh` SHALL exit `0` (skip the build) when `VERCEL_GIT_COMMIT_MESSAGE` starts with `chore(release):`, before consulting any SHA or changed file. This covers the `chore(release): ... [skip ci]` and `chore(release): sync lockfile versions [skip ci]` commits that `release.yml` pushes to `main` and that never receive a CI run (CI is skipped by `[skip ci]`, and pushes made with `GITHUB_TOKEN` do not trigger workflows), so the Deployment Check would otherwise hold their deployments indefinitely. All other messages SHALL continue through the existing denylist logic unchanged: missing or unresolvable `VERCEL_GIT_PREVIOUS_SHA` → build; any changed file outside the denylist (`apps/api/`, `openspec/`, `*.md`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`) → build; otherwise skip. The back-merge commit `chore: back-merge main into develop [skip ci]` is not matched (it only produces an ungated preview of already-released content).

#### Scenario: Release commit is skipped

- **GIVEN** `VERCEL_GIT_COMMIT_MESSAGE="chore(release): 2.9.0 [skip ci]"` and a diff that touches `apps/web/package.json`
- **WHEN** the script runs
- **THEN** it exits `0` (build skipped)

#### Scenario: Lockfile sync commit is skipped

- **GIVEN** `VERCEL_GIT_COMMIT_MESSAGE="chore(release): sync lockfile versions [skip ci]"` and a diff that touches only `package-lock.json`
- **WHEN** the script runs
- **THEN** it exits `0`

#### Scenario: Release skip does not need SHAs

- **GIVEN** a release-commit message and no `VERCEL_GIT_PREVIOUS_SHA`
- **WHEN** the script runs
- **THEN** it exits `0` (the message check precedes the SHA guard)

#### Scenario: Non-release web change still builds

- **GIVEN** `VERCEL_GIT_COMMIT_MESSAGE="feat(web): add chart"` and a diff touching `apps/web/src/app/page.tsx`
- **WHEN** the script runs
- **THEN** it exits `1` (build)

#### Scenario: Similar-looking messages are not skipped

- **GIVEN** a message such as `chore: back-merge main into develop [skip ci]` or `fix: handle chore(release): text` and a diff touching `apps/web/**`
- **WHEN** the script runs
- **THEN** it exits `1` (only messages that start with `chore(release):` are skipped)

#### Scenario: Existing denylist behavior is preserved

- **GIVEN** a non-release message
- **WHEN** the diff touches only denylisted paths (e.g. `apps/api/src/main.ts`, `README.md`), or the previous SHA is missing or unresolvable, or the diff mixes denylisted and non-denylisted paths
- **THEN** the script exits `0`, `1`, and `1` respectively

### Requirement: The Vercel ignore script has automated tests

`scripts/vercel-ignore.sh` SHALL be covered by a Jest test at `apps/web/__tests__/scripts/vercel-ignore.test.ts` (Node test environment) that runs the real script with `bash` against a temporary git repository created per test, passing `VERCEL_GIT_COMMIT_MESSAGE`, `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA` through the environment and asserting the exit code. Tests SHALL use `it(...)`, produce no console output, and clean up the temporary repositories.

#### Scenario: Tests exercise the real script

- **WHEN** `npx nx test web` runs
- **THEN** the suite executes `scripts/vercel-ignore.sh` (not a reimplementation) and covers every scenario of the previous requirement
