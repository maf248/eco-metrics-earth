# Design

## Context

`ci.yml` declares `push: branches: ['**']` and `pull_request: branches: [main]`. Only `develop`
opens pull requests to `main`, and its tip is always pushed first, so each such pull request
gets two runs of both jobs (`ci` and `api-image`) for the same head commit. The `deploy-api-*`
jobs already run only on `push` (`if: github.event_name == 'push' && ...`), and the Vercel
Deployment Check gates production on the `ci` job of the push to `main`. No branch ruleset
requires status checks, so no required check is tied to the `pull_request` event.

## Goals / Non-Goals

**Goals:**

- One CI run per push; the `develop` → `main` pull request reuses it.
- Keep every gate that protects production unchanged.

**Non-Goals:**

- Changing the detector scripts, their tests or the deploy workflow.

## Decisions

- **Drop the trigger instead of filtering it.** Alternatives: keep `pull_request` and skip
  the jobs with a job-level `if` (forbidden by the CI spec, and the run would still report
  skipped checks), or use `concurrency` to cancel one of the two runs (the groups differ:
  `refs/heads/develop` vs `refs/pull/N/merge`, so they never collide). Removing the trigger
  is the only option that saves the run without new logic.
- **`BASE_SHA: ${{ github.event.before }}` in both jobs.** With only `push` events, the
  `pull_request` branch of the expression is dead code. The detectors already treat a missing
  or zero base as doubt (E2E runs, the image builds), so new branches stay safe.
- **The detector keeps reading every latest check run on the base.** Commits that were
  already tested by both events keep two check runs; the "all latest runs green" rule still
  applies to them, and to any manual re-run. No script change is needed. For the same reason
  the canonical scenario about a failed `push` run next to a green `pull_request` run on the
  base stays: it describes commits tested before this change.
- **Keep the deploy jobs' `github.event_name == 'push'` condition.** It is now always true,
  but the `api-cloud-run-deploy` spec mandates it and it keeps the deploys safe if a trigger
  is ever added back.

## Risks / Trade-offs

- [The merge tree of `develop` into `main` is no longer tested before the merge] → the push to
  `main` runs the full CI before Vercel promotes production or the API production deploy
  starts, and `release.yml` back-merges `main` into `develop`, so the trees normally match.
- [A future pull request from another branch to `main` would get no CI run of its own] → the
  branch strategy only allows `develop` → `main`, and any pushed branch already runs CI on push.

## Migration Plan

No migration. Rollback: restore the `pull_request` trigger and the conditional `BASE_SHA`
expressions with a revert commit.
