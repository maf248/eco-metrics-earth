## 1. Script

- [x] 1.1 Create `scripts/release-pr-autofill.mjs` with the pure functions `parseCommit`, `collectTopics`, `bump`, `buildTitle`, `deployTargets`, `sanitizeSubject`, `buildBody`, exported and free of I/O, and `scripts/release-pr-autofill.d.mts` with their types. (Title, Description requirements)
- [x] 1.2 Add the I/O layer: read non-merge commits of `<base>..<head>` with full messages via `spawnSync` argument arrays, the changed files via `git diff --name-only --no-renames -z <base>...<head>`, and the last tag per stream via `git tag --merged <base> --list`. (Commit set, release prediction requirements)
- [x] 1.3 Predict each stream by importing its `.releaserc.mjs`, taking the `@semantic-release/commit-analyzer` plugin config and calling `analyzeCommits` with a no-op logger. Add no release rules of its own. (Release prediction reuses the real configs)
- [x] 1.4 Add the entry point (`--base`, `--head`, `--out-dir`, guarded so importing has no effect): write the title (no trailing newline) and body files; exit non-zero with no files written on any error. (Application of the result)

## 2. Tests

- [x] 2.1 Create `apps/api/__tests__/scripts/release-pr-autofill.test.ts` (`it(...)`, in `describe` blocks): pure-function scenarios for title (order, no-root fallback, 72-char bound, breaking keywords in any case and with a newline), deploy detection (web only, API only, shared, docs only), body grouping, marker, mention/autolink/backtick neutralization and the length cap.
- [x] 2.2 Add an integration test that builds a temporary git repository (`main` with tags `v3.1.0`, `web-v2.4.0`, `api-v1.2.0`; `develop` with a non-merge `fix(web)`, a `feat(tooling)`, a merge commit, and a tag not reachable from `main`), runs the script with `node`, and checks the Prediction, Commit set, Failure and rename (a file moved out of `apps/api/` still deploys the API) scenarios (root minor `3.2.0`, web patch `2.4.1`, api none; unknown base exits non-zero and writes nothing).
- [x] 2.3 In `apps/api/package.json`, add to `nx.targets.test.inputs` the script, its `.d.mts`, the workflow file and the three `.releaserc.mjs` files, keeping the existing entries.
- [x] 2.4 Add a workflow test: `release-pr-autofill.yml` has the `pull_request` trigger with only `opened` and `reopened`, base `main`, no `pull_request_target`, permissions exactly `contents: read` and `pull-requests: write`, `timeout-minutes`, the head-ref and head-repo condition, and no `${{` at all inside any `run:` block (stricter than the spec, which forbids only commit, title or body data). (Trigger and scope, Least privilege)

## 3. Workflow

- [x] 3.1 Create `.github/workflows/release-pr-autofill.yml` as in the design: job `if`, checkout of the PR head SHA with `fetch-depth: 0`, fetch of `origin/main`, setup-node with `.nvmrc` and the npm cache, `npm ci --ignore-scripts`, script run, `gh api --method PATCH` with `-F title=@` and `-F body=@`. `PR_NUMBER` and `GH_TOKEN` through the apply step's `env:` only; checkout with `persist-credentials: false`.

## 4. Docs

- [x] 4.1 `AGENTS.md`, CI/CD gates: add one bullet next to the `waste-data-check.yml` one (trigger and condition, what it overwrites, `contents: read` and `pull-requests: write` only, not a required check, never deploys or pushes, the script and its prediction through the real releaserc files).

## 5. Validation

- [x] 5.1 Gates: `npm run lint`, `npm run build`, `npm run test` (no E2E needed). Run `npx openspec validate autofill-release-pr --strict`.

## 6. Close

- [x] 6.1 Remove the roadmap entry for this change from `ROADMAP.md` and renumber the following IDs as `AGENTS.md` requires.
- [x] 6.2 Archive with `npx openspec archive autofill-release-pr --yes` before the commit.

## Post-merge verification (manual, for the user; not a coder task)

- Open the next `develop` to `main` PR and check the title, the description (releases, deploys, groups, marker), that no one is mentioned, and that the run took only `contents: read` and `pull-requests: write`. Reopen it to confirm the content is overwritten again. The PR that carries this change already runs it: for `pull_request` events GitHub reads the workflow from the PR merge ref.
