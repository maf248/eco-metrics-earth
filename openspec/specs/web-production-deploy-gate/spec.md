# web-production-deploy-gate Specification

## Purpose

Defines how web production deployments on Vercel are gated by the CI job (Vercel Deployment Checks), how automated release commits are kept out of that gate by `scripts/vercel-ignore.sh`, and that preview deployments stay ungated.

## Requirements

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

### Requirement: Web production deployments also wait for the API production deploy

The Vercel project SHALL have a second **Deployment Check** selecting the GitHub Actions check `Deploy API (production) / Build and deploy API to Cloud Run (production)`, in addition to the CI job check, so that Vercel holds every production deployment (branch `main`) until the production API deploy job of the same commit has succeeded. Because that job always runs on pushes to `main` once CI is green and skips its deploy steps internally when no API input changed, the check SHALL pass quickly for commits that do not touch the API and SHALL pass only after the new Cloud Run revision is serving traffic for commits that do. The setting is a user-executed dashboard step documented in `docs/deploy/vercel.md`; the check SHALL be added only after a run on `main` has reported that exact name (see "The API deploy check name is a two-file contract"). Vercel builds SHALL NOT be serialized behind the API deploy: only the assignment to the production domains waits. Previews are unaffected.

#### Scenario: Web waits for an API change to be live

- **GIVEN** both Deployment Checks are configured and a merge to `main` changes API inputs and web inputs
- **WHEN** Vercel finishes building the production deployment before the API deploy job has finished
- **THEN** the deployment is not assigned to the production domains yet and the previous production deployment keeps serving
- **AND** it is promoted automatically once both the CI check and the API deploy check have succeeded

#### Scenario: Web-only change is not delayed by an API deploy

- **GIVEN** a merge to `main` that changes only web inputs, whose CI job passes
- **WHEN** the production API deploy job runs
- **THEN** change detection finds no API input changed, the build, push and deploy steps are skipped, and the job finishes `success`
- **AND** the web deployment is promoted as soon as that job finishes, with no wait for an image build or a Cloud Run revision

#### Scenario: API deploy failure holds the web

- **GIVEN** both checks are configured and the production API deploy job fails for a commit on `main` (image build, push, Cloud Run deploy, or the post-deploy verification)
- **WHEN** the job concludes `failure`
- **THEN** the web production deployment of that commit is not promoted and the previous deployment keeps serving
- **AND** the recovery is a fix pushed to `main` through the normal flow (the next commit's deployment is gated on its own checks, and change detection retries the API deploy because it diffs against the serving SHA) or, deliberately, **Force Promote** of that deployment, which the runbook states is acceptable only when the web does not depend on the API change

#### Scenario: Failed CI leaves the API check unreported and the web held

- **GIVEN** both checks are configured and the CI job fails for a commit on `main`
- **WHEN** the production API deploy job is skipped because it `needs` the CI job
- **THEN** the web is held by the CI check as before, and the skipped deploy job is never treated as a pass
- **AND** the runbook records how Vercel treats a skipped or never-reported check, verified on the first gated merge

#### Scenario: A superseded pending deploy run holds that older commit's web

- **GIVEN** a production deploy running for commit A, a deploy run for commit B waiting in the `deploy-api-production` group, and then a run for commit C arriving
- **WHEN** C replaces the waiting run of B, which ends `cancelled`
- **THEN** the web deployment of B stays held and is never promoted
- **AND** this is acceptable because C is newer, includes B, and its deployment is promoted when its own checks pass; the runbook documents it

#### Scenario: Release commits are unaffected

- **GIVEN** a `chore(release): ...` commit pushed to `main` by `release.yml`
- **WHEN** Vercel evaluates it
- **THEN** `scripts/vercel-ignore.sh` skips the build, so no deployment exists to be held by the new check

#### Scenario: Develop previews accept a short mismatch window

- **GIVEN** a push to `develop` followed quickly by another push
- **WHEN** CI cancels the older run (`cancel-in-progress` on non-`main` refs) before `Deploy API (development)` starts
- **THEN** the preview of the older commit may talk to an older dev API, which is accepted and documented
- **AND** the window is bounded by one CI run: the next green run deploys every API change accumulated since the serving SHA, because change detection diffs against it

### Requirement: The API deploy check name is a two-file contract

The reported name of the API deploy check, `Deploy API (production) / Build and deploy API to Cloud Run (production)`, SHALL be treated as a contract with Vercel, built from two places: the caller job `name: Deploy API (production)` of `deploy-api-production` in `.github/workflows/ci.yml`, and the reusable job `name: Build and deploy API to Cloud Run (${{ inputs.target }})` in `.github/workflows/deploy-api.yml` with `target: production`. Both files SHALL carry a comment marking their part of the name as a contract with Vercel Deployment Checks and naming the other file. Changing either name, the `target` input value, or moving the job to another workflow SHALL be documented as silently breaking the gate: Vercel waits for a check that never reports, or stops enforcing it. `docs/deploy/vercel.md` SHALL have a section describing the full name, its two sources, the symptoms of a break and the procedure to rename (update the Vercel setting in the same change), and `docs/deploy/cloud-run.md` SHALL cross-reference it. The existing CI job name contract is unchanged.

#### Scenario: Contract comments exist in both files

- **WHEN** a contributor opens `.github/workflows/ci.yml` and `.github/workflows/deploy-api.yml`
- **THEN** the `deploy-api-production` job and the reusable `deploy` job each carry a comment stating that their name is part of the Vercel check name `Deploy API (production) / Build and deploy API to Cloud Run (production)` and pointing at `docs/deploy/vercel.md`
- **AND** a Jest test reads both files and fails if the two names, as composed, no longer produce the documented full name

#### Scenario: Runbook documents the contract and its failure modes

- **WHEN** the user opens `docs/deploy/vercel.md`
- **THEN** it lists the full check name and its two sources, what breaks if either changes (the production web waits forever or is no longer gated), the rename procedure, and the note that a manual `workflow_dispatch` run reports a different name and is not part of the gate

### Requirement: The runbook defines how to add and verify the API deploy check

`docs/deploy/vercel.md` SHALL state that the check is added in **Settings → Deployment Checks** only after a run on `main` has reported the job name (otherwise Vercel cannot select it), that the verification happens on the first gated merge (the production web domain keeps the previous deployment until the API deploy succeeds), the failure and recovery matrix (API deploy failed, CI failed, superseded run, Force Promote), the accepted develop-preview window and its bound, and the complementary practice of backward-compatible contracts (add the endpoint or field to the API first, consume it in the web in a later change). The contract practice SHALL be documented as guidance and SHALL NOT be enforced by tooling.

#### Scenario: Setup order is documented

- **WHEN** the user follows the runbook
- **THEN** the steps say to merge the change, wait for a run on `main` that reports `Deploy API (production) / Build and deploy API to Cloud Run (production)`, and only then add it as a Deployment Check

#### Scenario: Recovery paths are documented

- **WHEN** the production API deploy fails
- **THEN** the troubleshooting section states that the web stays held, how to fix and push, and when Force Promote is acceptable
