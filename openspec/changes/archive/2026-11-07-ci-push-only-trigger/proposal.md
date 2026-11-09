# Proposal

## Why

Every `develop` → `main` pull request runs the full CI workflow twice for the same head commit:
once for the `push` to `develop` and once for the `pull_request` event (and again when the pull
request is reopened or edited). The extra run repeats the whole job (container, `npm ci`, build,
unit tests and the E2E suite; ~13.6 min on average over the last 10 such runs) and the API image
build. It tests nothing the push run did not, but it queues runner time and doubles the checks on
every release pull request. The repository is public, so this is about wait time and noise, not
billed minutes.

## What Changes

- Remove the `pull_request` trigger from `.github/workflows/ci.yml`; CI runs on `push` to any
  branch only. A `develop` → `main` pull request shows the checks of the push run on its head
  commit, and merging it pushes to `main`, which runs the full CI before any production deploy.
- Simplify the `BASE_SHA` of the E2E gate step and of the API image detection step to
  `github.event.before`, since `pull_request` events no longer reach the workflow.
- Update the docs that describe the CI triggers (`README.md`).
- **Trade-off (accepted):** CI no longer tests the merge tree of `develop` into `main` before
  the merge. The push to `main` still gates production, and `release.yml` back-merges `main`
  into `develop`, so `develop` normally already contains `main`.

## Non-Goals

- No E2E sharding or other CI speed-up beyond removing the duplicate run.
- No change to the deploy jobs, the Vercel Deployment Check, the job name contract, the
  concurrency policy or the E2E skip rules other than where `BASE_SHA` comes from.
- No change to the detector script (`scripts/detect-e2e-skip.cjs`) or its rule that every
  latest check run on the base must be green (older commits keep their `pull_request` runs).
- No branch ruleset changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ci-workflow`: CI triggers on push only (new requirement); the API image job and the E2E
  skip gate no longer mention `pull_request` events or `github.event.pull_request.base.sha`.
- `pre-push-quality-gate`: the safety-net requirement says CI runs on every push (not on pull
  requests), and the `develop` → `main` scenario relies on the head commit's push run.
- `ci-node-version`: the CI scenario is triggered by a push, not "a push or pull request".

## Impact

- `.github/workflows/ci.yml` (trigger and two `BASE_SHA` expressions).
- `README.md` (CI section).
- GitHub Actions usage: one CI run fewer per `develop` → `main` pull request.
- No application code, API contract or dependency changes.
