## Why

Release PRs (`develop` to `main`) are opened by hand on GitHub and keep the default title "Develop" with an empty description. The title also lands in `main`'s history: the repository merges with merge commits and `merge_commit_message = PR_TITLE`, so the merge commit reads `Merge pull request #N from maf248/develop` with the PR title as its body. A reviewer cannot tell from the PR what will be released or deployed.

## Goals

- When a release PR is opened or reopened, fill its title and description automatically:
  - a title naming the expected root version and the topics (commit scopes);
  - the expected release per stream (root, web, api) with bump type and next version;
  - what deploys (API, web, or both), decided by changed files;
  - the commits, grouped by conventional type.
- Predict releases with the real semantic-release configs, so the prediction cannot drift from what `release.yml` does.

## Non-Goals

- No `synchronize` trigger: when commits are added, the maintainer reopens the PR or opens a new one.
- No "only if default" check: title and description are always overwritten for matching PRs.
- No PRs from forks, no PRs from other branches, no base other than `main`.
- Not a required check, not a gate: it never blocks a merge, deploys or pushes.
- Not a changelog generator: `release.yml` and the release-notes plugin stay the source of the real notes.
- No change to `.releaserc.mjs` files, `ci.yml`, `release.yml` or Vercel settings.
- No labels, reviewers, assignees or comments; only title and body are edited.

## Impact

- New `.github/workflows/release-pr-autofill.yml` (triggered by `pull_request`, never `pull_request_target`).
- New `scripts/release-pr-autofill.mjs` (pure functions plus a thin I/O entry point) and `scripts/release-pr-autofill.d.mts`.
- New Jest suite in `apps/api/__tests__/scripts/` and the files it reads added to the `test` inputs of `apps/api/package.json`.
- `AGENTS.md` CI/CD gates gets one bullet.
- New capability spec `release-pr-autofill`; no existing capability changes (`release-tooling` covers the release configs themselves, not PRs).
