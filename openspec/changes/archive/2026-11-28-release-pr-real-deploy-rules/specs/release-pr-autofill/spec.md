## MODIFIED Requirements

### Requirement: Deploy detection

The system SHALL decide what deploys with the real rules, not with rules of its own. Changed files are those of `git diff --name-only --no-renames base...head`, so both sides of a move count.

The API SHALL be reported as deploying when any changed file matches the extended regular expression in `scripts/api-image-inputs.pattern`, evaluated as `deploy-api.yml` does: `grep -E` with the content of that file as the pattern and the changed files as input. A `grep` status of 0 means a match, 1 means none, and any other status or spawn error SHALL make the script fail.

The web SHALL be reported as deploying when `bash scripts/vercel-ignore.sh`, run in the repository under analysis with `VERCEL_GIT_PREVIOUS_SHA` set to the merge base of base and head, `VERCEL_GIT_COMMIT_SHA` to the resolved head SHA and `VERCEL_GIT_COMMIT_MESSAGE` to a non-release message, exits with status 1 (build). Status 0 means no build; any other status or spawn error SHALL make the script fail. `scripts/vercel-ignore.sh` SHALL NOT be modified by this change.

Both the pattern file and `vercel-ignore.sh` SHALL be read from the workspace root, as the releaserc files are. No deploy rule SHALL remain duplicated in `scripts/release-pr-autofill.mjs`, and the checks SHALL add no install step and no network call. When both deploy, one line SHALL state that the web production deploy waits for the API production deploy. The wording of the lines is "API only.", "Web only.", "API and web." plus the waiting line, and "Neither API nor web.".

#### Scenario: Web-only change

- GIVEN changed files only under `apps/web/`
- WHEN the description is built
- THEN Deploys says web only, with no line about waiting for the API

#### Scenario: Shared change deploys both

- GIVEN a changed file under `packages/shared/`
- WHEN the description is built
- THEN Deploys says API and web, plus a line that web production waits for the API production deploy

#### Scenario: A file moved out of an app counts for that app

- GIVEN the only change moves a file from `apps/api/` to `docs/` with a `.md` name
- WHEN the description is built
- THEN Deploys says API only

#### Scenario: Docs-only change deploys nothing

- GIVEN changed files only under `openspec/` and `.md` files under `docs/`
- WHEN the description is built
- THEN Deploys says neither API nor web

#### Scenario: Scripts change with an API file deploys both

- GIVEN changed files `scripts/foo.mjs` and `apps/api/x.ts`
- WHEN the description is built
- THEN Deploys says API and web, plus the line that web production waits for the API production deploy

#### Scenario: Scripts-only change deploys the web only

- GIVEN the only changed file is `scripts/foo.mjs`
- WHEN the description is built
- THEN Deploys says web only

#### Scenario: Root manifest change deploys both

- GIVEN the only changed file is the root `package.json`
- WHEN the description is built
- THEN Deploys says API and web

#### Scenario: API-only change

- GIVEN changed files only under `apps/api/`
- WHEN the description is built
- THEN Deploys says API only

#### Scenario: A failing check is not masked

- GIVEN `grep` or `vercel-ignore.sh` ends with an unexpected status or cannot be spawned
- WHEN the script runs
- THEN it exits non-zero and writes no file
