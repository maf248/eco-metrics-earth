## Technical approach

All changes are in `scripts/release-pr-autofill.mjs` plus wiring.

- Remove `deployTargets(files)` prefix logic. Add a pure `deployLines`-compatible input `{ api, web }` (booleans), so `buildBody` keeps its `deploys` argument and unit tests of the body lines stay valid.
- New I/O function `readDeployTargets(repo, base, head, workspaceRoot)`:
  - `files = readChangedFiles(...)` (already `--no-renames`, `-z`); join with `\n` for grep stdin. A path containing a newline is not a realistic case; ignore.
  - API: `pattern = readFileSync(join(workspaceRoot, 'scripts/api-image-inputs.pattern'), 'utf8')`, stripping the trailing newline exactly as `$(cat ...)` does. Run `spawnSync('grep', ['-E', pattern], { input: files, encoding: 'utf8' })`. The pattern is passed as the argument right after `-E`, as in the workflow. Status 0 is true, 1 false, otherwise throw (including `result.error`). Empty file list: skip the grep and report false.
  - Web: `mergeBase = git merge-base base head`, `sha = git rev-parse head`. Run `spawnSync('bash', [join(workspaceRoot, 'scripts/vercel-ignore.sh')], { cwd: repo, env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: mergeBase, VERCEL_GIT_COMMIT_SHA: sha, VERCEL_GIT_COMMIT_MESSAGE: 'Merge pull request' } })`. Status 1 is true, 0 false, otherwise throw. The script runs `git` in `cwd`, so `--repo` is honored; it diffs two-dot from the merge base, which equals the three-dot diff used for grep.
- `run()` calls `readDeployTargets` instead of `deployTargets(files)`. Errors propagate to the existing catch, which sets a non-zero exit before any file is written (files are written last).
- `apps/api/package.json` test inputs add `{workspaceRoot}/scripts/api-image-inputs.pattern` and `{workspaceRoot}/scripts/vercel-ignore.sh`, so the Nx cache invalidates when the real rules change. Also keep `scripts/release-pr-autofill.d.mts` in sync with the changed exports (the type declaration lists `deployTargets`).
- AGENTS.md: in the release-pr-autofill workflow bullet, replace "reports what deploys from the changed files" with wording that it applies the real rules (`scripts/api-image-inputs.pattern` with `grep -E` for the API, `scripts/vercel-ignore.sh` for the web).

## Verification of existing scenarios under the real rules

- Web-only (`apps/web/x`): not in the pattern, outside the denylist, so web only.
- Shared (`packages/shared/x`): in the pattern, outside the denylist, so both.
- Moved `apps/api/a.ts` to `docs/a.md`: old path matches the pattern; both paths are denylisted for Vercel, so API only. The scenario now says a `.md` name, because a non-markdown file under `docs/` would build the web.
- Docs-only: `openspec/` and `*.md` are denylisted, so neither. The scenario now restricts `docs/` to `.md` files.

## Alternatives considered

- Keep prefix lists and sync them by hand: this is what drifted, rejected.
- Port the denylist to JS or move it to a shared data file used by both the shell script and JS: modifies `vercel-ignore.sh` (out of scope) and still needs two evaluators. Running the real script gives zero drift.
- Run `vercel-ignore.sh` through the Vercel CLI: needs install and network, rejected.

## Risks

- `vercel-ignore.sh` is a bash script requiring `git` and `grep` in the runner: both exist in `ubuntu-latest` and locally. Mitigated by failing loudly on any unexpected status.
- The script's guard `git cat-file -e` needs the merge base object: the workflow checks out with `fetch-depth: 0`.
- A future change to `vercel-ignore.sh` that adds new exit codes makes the autofill fail rather than mislead; acceptable and visible.
- The real Vercel decision also depends on the commit message of the deployed head (release commits skip); the PR head is not a release commit, so a fixed non-release message is correct.

## Known approximations

- **Previous revision.** The web check passes the merge base as `VERCEL_GIT_PREVIOUS_SHA`, and the API check diffs from the merge base, while Vercel and `deploy-api.yml` compare against the last deployed revision. After the usual back-merge both are the `main` tip. They differ only when the last production deploy is older than the `main` tip (a skipped, cancelled or failed deploy); then the real deploy can include `main`-only changes the prediction does not see. The body already says the result is expected, not guaranteed.
- **Failures inside `vercel-ignore.sh`.** The script exits 1 (build) when its own `git cat-file` or `git diff` fails, so such a failure reads as "web builds" rather than an error. The SHAs were just resolved by git in the same run, so the risk is low; only statuses other than 0 and 1, or a spawn error, fail loudly.
- **Stricter than the workflow.** `deploy-api.yml` runs `grep -E "$PATTERN" || true`, which hides grep status 2 (an invalid pattern); this script fails on it instead, by design.

## Workflow cleanup

The `Fetch main` step is dropped: the checkout with `fetch-depth: 0` already fetches every branch into `origin/*` and every tag (confirmed in the first run's log), so the extra fetch was redundant and was the only step that would need credentials if the repository ever became private.
