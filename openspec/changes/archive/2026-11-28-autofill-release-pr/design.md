## Technical approach

### Files

- `.github/workflows/release-pr-autofill.yml`
- `scripts/release-pr-autofill.mjs` (ESM, because it imports the `.releaserc.mjs` files and the ESM-only analyzer) and `scripts/release-pr-autofill.d.mts` (types for the Jest suite, as `scripts/lib/waste-recycling-*.d.mts` do).
- `apps/api/__tests__/scripts/release-pr-autofill.test.ts`, next to the other script tests. The API project already hosts them.

### Workflow

- `on: pull_request: { types: [opened, reopened], branches: [main] }`.
- Job `if: github.event.pull_request.head.ref == 'develop' && github.event.pull_request.head.repo.full_name == github.repository`. These are trusted values compared in a job-level `if`, never expanded into a script.
- `permissions: { contents: read, pull-requests: write }`, `timeout-minutes: 10`, `concurrency: release-pr-autofill-<PR number>` with `cancel-in-progress: true`.
- Steps: checkout of the PR head SHA with `fetch-depth: 0` (tags included) and `persist-credentials: false`; `git fetch origin main` so `origin/main` exists; `actions/setup-node` with `node-version-file: .nvmrc` and the npm cache; `npm ci --ignore-scripts`; run the script; apply with `gh api --method PATCH repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER -F title=@... -F body=@...`. `PR_NUMBER` and `GH_TOKEN` go through the `env:` of the apply step only, so `npm ci` and the script never see the token.
- Why `pull_request`: the token is read-only for forks, and the job is limited to same-repo `develop`, so no untrusted code ever runs with write access. Running the script from the PR head is safe because that head is `develop`.
- Why REST and not `gh pr edit`: `gh pr edit` goes through GraphQL and can fail with `GITHUB_TOKEN` on classic-project fields. The REST `PATCH` needs only `pull-requests: write`.

### Script

Pure functions are exported and have no I/O: `parseCommit(subject)`, `groupCommits`, `collectTopics`, `bump(version, type)`, `buildTitle`, `deployTargets(files)`, `buildBody`, `sanitizeSubject`. The functions that need git or the analyzer are in the I/O layer: reading commits, tags and changed files, loading releaserc files, and writing the files. The entry point (guarded by `import.meta.url` so importing it has no effect) reads `--base` (default `origin/main`), `--head` (default `HEAD`), `--out-dir`, and `--repo` (default the current directory).

- Two roots, kept apart: git commands run in `--repo` (the repository whose history is described; a temporary repository in the integration test), while the three `.releaserc.mjs` files are loaded from, and the analyzer's `context.cwd` is, the workspace root derived from the script's own location (`scripts/..`), where `node_modules` holds the preset. In the workflow both are the checkout.

- Commits: `git log --no-merges --format=%H%x1f%B%x1e <base>..<head>` (full message, so a `BREAKING CHANGE:` footer reaches the analyzer). Run through `spawnSync('git', [...])` with an argument array, never a shell.
- Changed files: `git diff --name-only --no-renames -z <base>...<head>` (three dots: since the merge base). `--no-renames` lists both sides of a move, so a file moved out of an app still counts for that app, as `scripts/detect-e2e-skip.cjs` does.
- Prediction: for each of the three releasercs, `await import(pathToFileURL(file))`, find the plugin entry named `@semantic-release/commit-analyzer`, and call `analyzeCommits(pluginConfig, { commits: [{ hash, message }], cwd, logger })`. Interface checked in `node_modules/@semantic-release/commit-analyzer/index.js` (v13): it reads `context.commits[].{message, hash}`, `context.cwd` (used to resolve the preset) and `context.logger.log`; it returns `'major' | 'minor' | 'patch' | null`. The logger is a no-op, to keep the Actions log free of commit text.
- Last version: `git tag --merged <base> --list '<prefix>*'`, where `<prefix>` is the part of `tagFormat` before `${version}`; keep tags whose rest matches `^\d+\.\d+\.\d+$` and take the highest numerically. With no tag the stream is treated as `0.0.0` and the line shows the first release.
- Commit set: `<base>..<head>` is used for all three streams, as decided. `release.yml` analyzes since each stream's own tag, but release commits are the only things on `main` after those tags and they trigger nothing.
- Bump: a minimal `bump(version, type)`. `semver` is only transitive, so it is not imported.
- Title and body as in the spec. The 72-character bound drops whole topics, then truncates the first one. Ordering by frequency puts the dominant areas first, and first appearance breaks ties so the result is deterministic.
- The title is sanitized last: newlines collapsed to spaces and every `/breaking[\s_-]*changes?/i` match removed, then the bound is applied again. This is a final guard, independent of how topics were built.
- The body is written with subjects inside code spans; the length cap leaves headroom under GitHub's 65536-character limit.

### Install cost

`npm ci --ignore-scripts` with the npm cache. A partial install (`npm i @semantic-release/commit-analyzer ...`) would skip the lockfile and let versions drift from the ones `release.yml` runs, which defeats the "reuse the real config" goal; the analyzer's transitive tree (parser, filter, preset, `import-from-esm`) is also not trivial to list by hand. `--ignore-scripts` avoids the Husky `prepare` and other lifecycle scripts. The job is small and runs once per release PR.

## Alternatives considered

- **`pull_request_target`**: gives write access to a fork-triggered run; rejected, the head repo check makes plain `pull_request` enough.
- **Re-implement the release rules in the script**: drifts from the `.releaserc.mjs` files; rejected.
- **Run `semantic-release --dry-run`**: needs write-capable credentials and a checked-out `main`, and it analyzes `main`, not the PR; rejected.
- **GitHub API for the commit list**: capped at 250 commits and has no tags; rejected for git with full history.
- **Squash and PR-title-only releases**: out of scope; the repository merges with merge commits.

## Risks

- **Title reaches `main` history and can cut a release**: the title guard and its tests. Subjects appear only in the body, which is not part of the merge commit message (`PR_TITLE` only).
- **Prediction differs from the real release** (for example commits on `main` after the tag that are not release commits): labeled "expected" in the body; the fallback is the real `release.yml`.
- **Reopen after new commits is needed**: accepted by the maintainer. The body says which head commit it was computed from (the short SHA of `HEAD`).
- **Importing the ESM analyzer from Jest (CommonJS)**: not attempted. Unit tests inject results into the pure functions, and one integration test runs the script with `node` in a child process on a temporary git repository, so the real analyzer and releaserc files are exercised. The integration test is the check that the real configs are reused.
- **Stale Nx cache**: the files the tests read are listed in the `test` inputs of `apps/api/package.json`.
