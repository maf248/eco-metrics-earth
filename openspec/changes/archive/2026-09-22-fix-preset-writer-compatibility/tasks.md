# Tasks: Fix preset/writer compatibility for release-notes rendering

> A one-pin fix: `package.json` + `package-lock.json` only. Do not commit anything without explicit user authorization — the commit suggestion at the end lists the intended atomic commit only.
>
> Suggested working branch: `feature/fix-preset-writer-compatibility` off `develop`.
>
> Tooling-only change with no user-facing behavior, but the AGENTS.md pre-PR checklist (lint / build / test / e2e) is blanket — E2E is included in verification.

---

## Task Group 1 — Implementation (the one-pin fix)

### [x] 1.1 Change the ccc pin in root `package.json`

- In root `package.json` devDependencies, change exactly one line: `"conventional-changelog-conventionalcommits": "10.4.0"` → `"conventional-changelog-conventionalcommits": "9.3.1"`.
- Nothing else in the file changes — no other pins, no scripts, no `overrides`, no `lint-staged` block.

**Verification:** `git diff package.json` shows exactly one changed line (the ccc pin, `10.4.0` → `9.3.1`); every other toolchain pin reads unchanged: `semantic-release` 25.0.9, `@commitlint/cli` 21.2.3, `@commitlint/config-conventional` 21.2.3, `lint-staged` 17.5.1, `concurrently` 10.0.5, `@semantic-release/changelog` 7.0.0, `@semantic-release/git` 11.0.1, `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, `husky` 9.1.7.

### [x] 1.2 Regenerate the lockfile (dual-major ccc tree)

- Run `npm install` (the repo `.npmrc` with `legacy-peer-deps=true` applies) so `package-lock.json` is regenerated with the dual-major tree: root ccc 9.3.1; ccc 10.4.0 nested under `@commitlint/config-conventional@21.2.3` (which declares `^10.0.0`); `conventional-changelog-writer` 8.4.0 shared.

**Verification:** `npm ls conventional-changelog-conventionalcommits conventional-changelog-writer` shows root ccc **9.3.1**, nested ccc **10.4.0** under `@commitlint/config-conventional`, and writer **8.4.0**; `npm audit` prints `found 0 vulnerabilities`; a second `npm install` changes nothing (idempotent).

---

## Task Group 2 — Verification (closes the original change's generateNotes validation gap)

### [x] 2.1 The three `.releaserc.mjs` configs still import cleanly

- For each config (root, `apps/web`, `apps/api`) run the Node ESM import check from the repo root (e.g. `node --input-type=module -e "const c = await import('<path>'); ..."`).
- Confirm the five plugins initialize in order and the `writerOpts` shapes are intact: root passthrough (`preset().writer`); app configs' destructured transform + `ALLOWED_SCOPES`.

**Verification:** Each import resolves without error; each prints the five plugin names in order; the app configs' custom `transform` is present; the `releaseRules` shapes are unchanged (root: 1 rule; web/api: 6 rules, no `type` entries).

### [x] 2.2 generateNotes harness — real rng 14.1.1 rendering with each config shape

- Build a throwaway ESM harness in `/tmp/opencode` (not committed) that calls the **real** `generateNotes` of `@semantic-release/release-notes-generator` 14.1.1 with each config shape against synthetic commits:
  - root: `writerOpts` passthrough
  - web: transform + `ALLOWED_SCOPES = ['web', 'shared']`
  - api: transform + `ALLOWED_SCOPES = ['api', 'shared']`
- Harness context (orchestrator-verified shape): `context.commits` (raw `{ hash, message }` entries), `context.options.repositoryUrl`, `context.lastRelease.gitTag`, `context.nextRelease.{ version, gitTag }`, and a silent logger.

**Verification:** Root notes render as Markdown with the fix commit and a compare link, and exclude chore/docs commits; web notes include `fix(web)` and exclude `fix(release)`; api notes include `fix(api)` and exclude `fix(web)`; **no "Missing helper" / writer-version error in any run**.

### [x] 2.3 Root dry-run that reaches generateNotes (the step that failed in production)

- `git fetch origin` → `git worktree add --detach /tmp/opencode/sr-dryrun-fix origin/main` (CURRENT `origin/main` has the 9 unreleased commits → a patch is pending).
- Into the worktree, copy: the root `.releaserc.mjs`, the updated root `package.json`, `package-lock.json`, and the app `package.json`s needed to satisfy the lockfile (as learned in the previous change's dry-run).
- `HUSKY=0 npm ci`, then `HUSKY=0 npx semantic-release --dry-run` from the worktree root.
- **Read-only: NO commits, NO pushes, no writes to the real working repo.** Clean up with `git worktree remove --force /tmp/opencode/sr-dryrun-fix` afterwards.
- Also confirm no `v2.5.1` tag exists on origin (the failed production run wrote nothing).

**Verification:** The dry-run analyzes the 9 commits since v2.5.0, computes **v2.5.1** (only `fix(release)` triggers the patch), and **COMPLETES the `generateNotes` step, printing the rendered notes** — the exact step that failed in production; the run must get past it. `git ls-remote --tags origin` shows no `v2.5.1`. The worktree is removed afterwards.

### [x] 2.4 Analyzer matrix spot-check (12 cases, same expected results)

- Re-run the analyzer harness from the previous change against the ccc@9 tree — the `releaseRules` semantics are preset-major-independent, but re-verify all 12 cases:
  1. `fix(tooling): ...` + web rules → **no release**
  2. `fix(tooling): ...` + api rules → **no release**
  3. `fix(tooling): ...` + root rules → **patch**
  4. `fix(api): ...` + web rules → **no release**
  5. `fix(api): ...` + api rules → **patch**
  6. `fix(web): ...` + web rules → **patch**
  7. `fix(web): ...` + api rules → **no release**
  8. `feat(web): ...` + web rules → **minor**
  9. `fix: ...` (no scope) + web rules → **patch**
  10. commit with a `BREAKING CHANGE` footer + root rules → **major**
  11. commit with a `BREAKING CHANGE` footer + web rules → **major**
  12. commit with a `BREAKING CHANGE` footer + api rules → **major**

**Verification:** All 12 cases match the expected results. Any deviation is a failure.

### [x] 2.5 Standard gates (pre-PR checklist, blanket per AGENTS.md)

- `npm run lint` — zero errors, zero warnings.
- `npm run build` — all three projects.
- `npm run test` — all unit tests pass, zero errors, zero warnings.
- `npm run e2e` — full Playwright suite green.

**Verification:** All four commands exit 0. No snapshot changes are expected (no app code touched) — if snapshots diff, investigate before proceeding.

### [x] 2.6 Husky hooks still function

- commitlint: `printf 'invalid message' > /tmp/opencode/msg-bad && npx --no -- commitlint --edit /tmp/opencode/msg-bad` → exit 1; `printf 'fix(api): correct health check response' > /tmp/opencode/msg-ok && npx --no -- commitlint --edit /tmp/opencode/msg-ok` → exit 0.
- lint-staged: create a scratch file in the repo with fixable formatting issues (e.g. double quotes instead of single), `git add` it, run `npx lint-staged`, confirm it is auto-formatted and re-staged, then `git restore --staged` the file and delete it (leave the tree clean).

**Verification:** Invalid message exits 1, valid exits 0; lint-staged rewrites and re-stages the scratch file; `git status` is clean afterwards.

### [x] 2.7 No repo file touched beyond `package.json` + `package-lock.json`

- Inspect the working tree at the end of implementation.

**Verification:** `git status --porcelain` (ignoring this change's `openspec/changes/fix-preset-writer-compatibility/` folder) shows only `package.json` and `package-lock.json` modified; `git diff --stat` confirms no other file changed.

---

## Task Group 3 — Commits (requires explicit user authorization)

No commits until the user explicitly approves at the final checkpoint. Suggested single atomic commit (Commitizen format):

1. `fix(release): pin conventionalcommits preset to v9 for writer compatibility` — `package.json`, `package-lock.json`

Note: under the current releaseRules, `fix(release)` triggers only a **root patch** on merge to `main` (the `release` scope is excluded from both app streams) — correct behavior, not an accident. That patch will release the pending v2.5.1 (the 9 unreleased commits plus this fix).

**Verification:** `git log --oneline` shows the approved commit; its file set is exactly `package.json` + `package-lock.json`; all gates pass on the final state.

---

## Definition of Done

- [x] `conventional-changelog-conventionalcommits` pinned at 9.3.1 in root `package.json` — the only change in that file
- [x] Lockfile regenerated with the dual-major tree: root ccc 9.3.1, nested ccc 10.4.0 under `@commitlint/config-conventional`, writer 8.4.0 shared
- [x] `npm audit` → 0 vulnerabilities
- [x] All three `.releaserc.mjs` configs import cleanly with plugins initialized (zero config file changes)
- [x] generateNotes harness: all three config shapes render notes with compare links and correct scope filtering; zero "Missing helper" errors
- [x] Root dry-run reaches and completes `generateNotes`, computing v2.5.1 from the 9 unreleased commits; no `v2.5.1` tag on origin; worktree cleaned up
- [x] Analyzer matrix: 12/12 cases match
- [x] `npm run lint`, `npm run build`, `npm run test`, `npm run e2e` — all green, zero warnings
- [x] Husky hooks verified (commitlint 1/0 exit codes; lint-staged round-trip)
- [x] No repo file touched beyond `package.json` + `package-lock.json` (plus this change's openspec artifacts)
- [x] Commits created only after explicit user authorization
