## Context

The project already enforces Conventional Commits via Commitizen + commitlint. This design adds the automation layer on top: **semantic-release** reads those commits, determines the next SemVer version, generates a CHANGELOG, and commits everything back to the repo — all triggered by GitHub Actions on every push to `main`.

The monorepo has two independently deployable apps (`apps/web`, `apps/api`). Each must have its own version history and CHANGELOG so that a hotfix on the API does not force a version bump on the frontend.

There are no existing git tags in the repo. The first release run will analyze the full commit history and produce `web@1.0.0` and `api@1.0.0`.

## Goals / Non-Goals

**Goals:**
- Fully automated semantic versioning per app triggered on push to `main`
- Per-app CHANGELOG.md committed back to the repo
- Per-app git tags using monorepo convention (`web-v1.0.0`, `api-v1.0.0`)
- Retroactive `v1.0.0` generation from full commit history on first run
- Zero manual steps after the initial setup

**Non-Goals:**
- GitHub Releases (no UI release on github.com)
- npm publishing (both apps are private)
- Global/root versioning
- Versioning for `packages/shared`
- Deployment automation (handled natively by Vercel and Railway)

## Decisions

### 1. `semantic-release-monorepo` over `@jscutlery/semver`

**Decision:** Use `semantic-release` + `semantic-release-monorepo` (not `@jscutlery/semver`).

**Rationale:** `semantic-release` is the industry-standard tool with the broadest ecosystem and is transferable knowledge to other repos. `semantic-release-monorepo` is a thin adapter that overrides the tag and commit scoping to work correctly inside a subdirectory — it requires no NX-specific knowledge and works with any monorepo structure.

`@jscutlery/semver` is NX-native but less portable and adds an NX generator dependency that is harder to reason about outside of this workspace.

**Alternative considered:** `release-please` (Google) — creates a PR per release, which adds a required human step. We want fully automatic.

---

### 2. Scope-based commit filtering per app

**Decision:** Each app's `.releaserc.json` configures `tagFormat` and `branches` to run from its own directory (via `semantic-release-monorepo`). Commits without a scope OR with the app's own scope (`web` or `api`) affect that app's version. Commits with the other app's scope are ignored.

**Rationale:** This is the standard filtering approach for `semantic-release-monorepo`. It avoids cross-app version bumps for unrelated changes.

**Scope mapping:**
- Scope `(web)` or no scope → affects `web`
- Scope `(api)` or no scope → affects `api`
- Scope `(shared)` → affects both (shared types affect both apps)
- Scope `(web)` in API release → ignored; scope `(api)` in web release → ignored

---

### 3. GitHub Actions over local CLI

**Decision:** Run semantic-release exclusively via GitHub Actions, not as a local npm script.

**Rationale:** The tool requires a clean checkout of the full git history (`fetch-depth: 0`) and a valid `GITHUB_TOKEN` to push tags and commit back the CHANGELOG. Running this locally is fragile — the developer's environment may have dirty state, wrong credentials, or partial history. CI provides a clean, reproducible environment every time.

The `GITHUB_TOKEN` is automatically injected by GitHub Actions with no secrets configuration required.

---

### 4. Sequential release (web → api) in one workflow job

**Decision:** One workflow job runs `semantic-release` for web first, then for api, sequentially.

**Rationale:** Parallel runs could cause git push conflicts (both would try to push a commit updating CHANGELOG and package.json at the same time). Sequential execution is safe. The added latency (~1–2 min) is acceptable.

---

### 5. Plugin chain (no GitHub, no npm publish)

**Decision:** Use exactly these plugins in order:
1. `@semantic-release/commit-analyzer` — determines version bump type
2. `@semantic-release/release-notes-generator` — generates markdown release notes
3. `@semantic-release/changelog` — writes/prepends to `CHANGELOG.md`
4. `@semantic-release/git` — commits `CHANGELOG.md` + `package.json` back to repo

No `@semantic-release/github` (GitHub releases not needed).  
No `@semantic-release/npm` (apps are not published to npm; version is bumped directly by `@semantic-release/git`).

---

### 6. Preset: `conventionalcommits`

**Decision:** Use `conventional-changelog-conventionalcommits` as the commit analyzer preset.

**Rationale:** This project uses the Angular-style Conventional Commits format enforced by commitlint. The `conventionalcommits` preset maps exactly to this format and correctly handles `feat!`/`fix!` shorthand for breaking changes in addition to the `BREAKING CHANGE:` footer.

## Risks / Trade-offs

- **[Risk] Bot commit triggers another workflow run** → Mitigation: add `[skip ci]` to the git commit message in `@semantic-release/git` config, or filter the workflow to ignore commits from the release bot.
- **[Risk] No release if all commits are `chore:` or `docs:`** → Expected behavior. semantic-release correctly skips a release when no releasable commits exist. Not a risk — this is by design.
- **[Risk] First run creates a huge CHANGELOG** → Acceptable trade-off for retroactive history. The CHANGELOG will group all past commits under `1.0.0`.
- **[Risk] Scope filtering misses commits** → Commits with typo scopes (e.g., `(Web)` vs `(web)`) will not be filtered correctly. Mitigated by commitlint already enforcing lowercase scopes.
- **[Risk] `fetch-depth: 0` slows down CI** → Necessary for semantic-release to read full tag history. Acceptable cost for a repo of this size.

## Migration Plan

1. Install all devDependencies at root
2. Add `.releaserc.json` to each app
3. Add the GitHub Actions workflow file
4. Push to `main` → first CI run generates `web@1.0.0` + `api@1.0.0`
5. Verify tags and CHANGELOG files appear in the repo after the workflow completes

**Rollback:** Delete the generated tags (`git tag -d web-v1.0.0 api-v1.0.0`) and remove the workflow file. No app code is affected.

## Open Questions

*(none — all decisions resolved)*
