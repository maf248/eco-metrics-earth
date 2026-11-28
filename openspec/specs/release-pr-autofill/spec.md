# release-pr-autofill Specification

## Purpose

Fill the title and description of every release PR (`develop` into `main`) with the expected releases, deploys and commits, predicted from the real semantic-release configs.

## Requirements

### Requirement: Trigger and scope

The system SHALL provide `.github/workflows/release-pr-autofill.yml`, triggered by `pull_request` (never `pull_request_target`) with types `opened` and `reopened` and base branch `main`. It SHALL act only when the head ref is `develop` and the head repository is this repository; in every other case it SHALL do nothing. It SHALL NOT use the `synchronize` type.

#### Scenario: Release PR from develop is processed

- GIVEN a PR from `develop` of this repository into `main`
- WHEN the PR is opened or reopened
- THEN the workflow computes the title and description and overwrites both on the PR, whatever their current content

#### Scenario: Other PRs are ignored

- GIVEN a PR into `main` from a fork, or from a branch other than `develop`
- WHEN it is opened or reopened
- THEN no step that reads commits or edits the PR runs

#### Scenario: New commits do not re-trigger it

- GIVEN an open release PR already filled
- WHEN a commit is pushed to `develop`
- THEN the workflow does not run and the PR is left as it is

### Requirement: Least privilege and isolation

The workflow SHALL declare `permissions` of exactly `contents: read` and `pull-requests: write`, set `timeout-minutes` on its job, and use a concurrency group per PR. It SHALL NOT deploy, push, create tags or run as a required check. Commit messages are untrusted text: they SHALL NOT be interpolated through `${{ }}` into `run:` scripts; they SHALL reach the generator only through the git history read by the script, and the result SHALL reach GitHub only through files.

#### Scenario: Workflow permissions and expressions

- GIVEN `release-pr-autofill.yml`
- WHEN it is inspected
- THEN `permissions` holds only `contents` (`read`) and `pull-requests` (`write`), the job has `timeout-minutes`, and no `run:` block contains a `${{ }}` expression that reads commit, title or body data

### Requirement: Token scope

The token and the PR number SHALL be given only to the step that edits the PR, and the checkout SHALL NOT persist credentials, so `npm ci` and the script never see the token.

#### Scenario: Only the apply step holds the token

- GIVEN `release-pr-autofill.yml`
- WHEN it is inspected
- THEN `GH_TOKEN` and `PR_NUMBER` appear only in the `env:` of the step that edits the PR, and the checkout sets `persist-credentials: false`

### Requirement: Commit set

The system SHALL take the commits of `origin/main..HEAD` of the release PR head, excluding merge commits, from a checkout with full history and tags (`fetch-depth: 0`). Release commits and lockfile syncs already on `main` through the back-merge SHALL therefore not appear.

#### Scenario: Merge commits are excluded

- GIVEN `develop` with two non-merge commits and a merge commit not on `main`
- WHEN the commit set is read
- THEN it contains the two non-merge commits only

#### Scenario: Commits already on main are excluded

- GIVEN a commit reachable from both `develop` and `main`
- WHEN the commit set is read
- THEN that commit is not in the set

### Requirement: Release prediction reuses the real configs

For each stream (`.releaserc.mjs`, `apps/web/.releaserc.mjs`, `apps/api/.releaserc.mjs`) the system SHALL take the config of its `@semantic-release/commit-analyzer` plugin and call `analyzeCommits` from `@semantic-release/commit-analyzer` with the commit set. It SHALL NOT duplicate release rules. A stream whose analysis returns `null` has no release.

#### Scenario: Scope exclusions of the app streams apply

- GIVEN the commit set holds only `fix(web): ...` and `feat(tooling): ...`, and the last tags are `v3.1.0`, `web-v2.4.0`, `api-v1.2.0`
- WHEN the prediction runs
- THEN root is a minor release to `3.2.0`, web a patch release to `2.4.1`, and api has no release

#### Scenario: Breaking commit

- GIVEN a commit whose message has a `BREAKING CHANGE:` footer and last root tag `v3.1.0`
- WHEN the prediction runs
- THEN root is a major release to `4.0.0`

### Requirement: Last and next version

The last version of a stream SHALL be the highest semver tag matching that config's `tagFormat` reachable from `origin/main`; the next version SHALL be that version bumped by the returned release type.

#### Scenario: Tags not reachable from main are ignored

- GIVEN a higher `v` tag that is not reachable from `origin/main`
- WHEN the last version is resolved
- THEN that tag is not used

### Requirement: Title

The title SHALL be `Release v<next root version>: <topics>`. Topics are the commit scopes (a comma-separated scope is split), lowercased and deduplicated, ordered by frequency descending and then by first appearance; commits without scope add no topic. With no root release the title is `Release: <topics>`; with no topics it is `Release v<version>` or `Release`.

#### Scenario: Title with version and ordered topics

- GIVEN root releases `3.2.0` and commits scoped `web` (3), `api` (1), `tooling` (2)
- WHEN the title is built
- THEN it is `Release v3.2.0: web, tooling, api`

#### Scenario: Title without a root release

- GIVEN no root release and commits scoped `docs`
- WHEN the title is built
- THEN it is `Release: docs`

### Requirement: Title bounds and safety

The title SHALL be one line of at most 72 characters: topics that do not fit are dropped from the end and replaced by `+N more`; if the first topic alone does not fit it is truncated with `…`. The title SHALL NOT contain `BREAKING CHANGE` or `BREAKING CHANGES` in any letter case (a topic containing them is removed), because the title ends up in the merge commit body on `main` and would make semantic-release cut a major release.

#### Scenario: Long topic list is bounded

- GIVEN more topics than fit in 72 characters
- WHEN the title is built
- THEN its length is at most 72 and it ends with `, +N more` where N counts the dropped topics

#### Scenario: Breaking keywords never reach the title

- GIVEN a commit scope `breaking change`, or a scope in a different letter case such as `Breaking-Changes`
- WHEN the title is built
- THEN the title matches neither `/breaking[\s_-]*changes?/i` nor spans more than one line

### Requirement: Description

The description SHALL be in English, start with the hidden marker `<!-- release-pr-autofill -->`, state that it is what is expected if the PR is merged as it is, and contain, in order:

1. **Releases**: one line per stream (root `v`, web `web-v`, api `api-v`) with bump type and next version, or "no release".
2. **Deploys**: API, web, both or neither, as defined in "Deploy detection".
3. **Commits**, grouped as defined in "Commit groups".

#### Scenario: Marker present

- GIVEN any commit set, including an empty one
- WHEN the description is built
- THEN it starts with `<!-- release-pr-autofill -->`

### Requirement: Commit groups

The commits SHALL be listed under the headings Features (`feat`), Fixes (`fix`), Performance (`perf`), Refactors (`refactor`), Docs (`docs`), Tests (`test`), Chores/Tooling (`chore`, `build`, `ci`, `style`) and Other (anything else, including non-conventional messages), in that order, empty groups omitted, each entry being the 7-character hash and the subject.

#### Scenario: Commits grouped by type

- GIVEN commits `feat(web): a`, `fix(api): b`, `update stuff`
- WHEN the description is built
- THEN they appear under Features, Fixes and Other respectively, each prefixed by its short hash, and no other heading appears

### Requirement: Deploy detection

The API SHALL be reported as deploying when a changed file is under `apps/api/` or `packages/shared/`, and the web when one is under `apps/web/` or `packages/shared/`. Changed files are those of `git diff --name-only --no-renames origin/main...HEAD`, so both sides of a move count. When both deploy, one line SHALL state that the web production deploy waits for the API production deploy.

#### Scenario: Web-only change

- GIVEN changed files only under `apps/web/`
- WHEN the description is built
- THEN Deploys says web only, with no line about waiting for the API

#### Scenario: Shared change deploys both

- GIVEN a changed file under `packages/shared/`
- WHEN the description is built
- THEN Deploys says API and web, plus a line that web production waits for the API production deploy

#### Scenario: A file moved out of an app counts for that app

- GIVEN the only change moves a file from `apps/api/` to `docs/`
- WHEN the description is built
- THEN Deploys says API only

#### Scenario: Docs-only change deploys nothing

- GIVEN changed files only under `docs/` and `openspec/`
- WHEN the description is built
- THEN Deploys says neither API nor web

### Requirement: Description text safety

Each subject SHALL be inside an inline code span, with backticks inside it replaced by `'`, so that it neither notifies anyone through `@mentions` nor autolinks. The body SHALL stay under 60000 characters; when the commit list would exceed it, the remaining commits are replaced by `+N more`.

#### Scenario: Mentions and autolinks are neutralized

- GIVEN a subject `fix(api): thanks @someone for #12 and `code``
- WHEN the description is built
- THEN the subject is emitted as one code span containing `@someone` and `#12` and no inner backtick

### Requirement: Application of the result

The workflow SHALL run the script, which writes the title and the description to files, and then SHALL apply both with the GitHub REST API (`gh api --method PATCH` on the PR with `-F title=@<file>` and `-F body=@<file>`), authenticated with `GITHUB_TOKEN`. The script SHALL exit non-zero on any error, so the workflow fails visibly instead of writing a partial result.

#### Scenario: Script writes files and does not call GitHub

- GIVEN a temporary git repository with `main`, a `develop` branch, and tags
- WHEN `node scripts/release-pr-autofill.mjs` is run with the base, head and output paths
- THEN it writes the title and description files, makes no network call, and exits 0

#### Scenario: Failure is not masked

- GIVEN the base ref does not exist
- WHEN the script runs
- THEN it exits non-zero and writes no file
