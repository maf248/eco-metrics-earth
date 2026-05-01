## Context

The project already has per-app semantic-release for `apps/web` and `apps/api` via `semantic-release-monorepo`, producing independent tags (`web-v*`, `api-v*`) and changelogs. The root `package.json` has no version field and there is no product-level changelog.

This change adds a third semantic-release run at the repository root that analyzes ALL commits across the entire repo and produces a global product version (`v1.0.0`, `v1.1.0`, etc.) and a root `CHANGELOG.md`. It is purely additive — no existing config is modified.

## Goals / Non-Goals

**Goals:**
- Add a global product version tracked in root `package.json`
- Generate root `CHANGELOG.md` covering all commits from all apps and shared packages
- Run root release before per-app releases in the CI workflow
- Zero interference with existing `web-v*` and `api-v*` versioning

**Non-Goals:**
- Modifying `apps/web/.releaserc.json` or `apps/api/.releaserc.json`
- Synchronizing root version with app versions
- Creating GitHub Releases
- Publishing root package to npm

## Decisions

### 1. Standard semantic-release at root (no `semantic-release-monorepo`)

**Decision:** The root `.releaserc.json` uses plain `semantic-release` without `semantic-release-monorepo`.

**Rationale:** `semantic-release-monorepo` restricts analysis to a subdirectory and uses a prefixed tag format. At the root we want the opposite — analyze everything and use the standard `v${version}` tag format. Running without the monorepo plugin is the correct setup for a root-level release.

---

### 2. Tag format `v${version}` (no prefix)

**Decision:** Root tags use the standard `v1.0.0` convention, not `root-v1.0.0`.

**Rationale:** The unprefixed `v*` tag is the universal convention for product releases. It's immediately recognizable, compatible with most tooling, and clearly distinct from the app-specific `web-v*` and `api-v*` tags already in place. No conflict is possible since the existing tags use explicit prefixes.

---

### 3. Root release runs first in the workflow (before web and api)

**Decision:** The `release-root` step is added as the first step in the release job, before `release-web` and `release-api`.

**Rationale:** The root changelog provides the authoritative product-level view. Running it first ensures the global `v*` tag is created before per-app tags, which is the natural dependency order (product version → app versions). It also means if the root release fails, the per-app releases don't run — a sensible fail-fast behavior.

---

### 4. Same plugin chain as per-app releases

**Decision:** Root `.releaserc.json` uses the identical plugin chain: `@semantic-release/npm` (npmPublish: false) → `commit-analyzer` → `release-notes-generator` → `changelog` → `git`.

**Rationale:** Consistency with the existing per-app setup. Same preset (`conventionalcommits`), same `[skip ci]` pattern in the commit message, same assets (`CHANGELOG.md`, `package.json`). No new dependencies needed.

## Risks / Trade-offs

- **[Risk] Root release commit triggers per-app re-evaluation** → Mitigated by `[skip ci]` in the root release commit message, which prevents a new workflow run.
- **[Risk] Root version diverges from app versions over time** → Expected and acceptable. The root version reflects product cadence; app versions reflect technical changes. They are intentionally independent.
- **[Risk] `v*` tag conflicts with a future tool that creates its own `v*` tags** → Low probability given current tooling. Documented in this design as a known constraint.

## Migration Plan

1. Add `"version": "1.0.0"` to root `package.json`
2. Create root `.releaserc.json`
3. Add `release-root` step as first step in `.github/workflows/release.yml`
4. Push to `main` → first CI run generates `v1.0.0` tag and root `CHANGELOG.md`

**Rollback:** Remove `.releaserc.json` from root, remove `version` from root `package.json`, delete the `release-root` step from the workflow, and delete the `v1.0.0` tag if already created.

## Open Questions

*(none)*
