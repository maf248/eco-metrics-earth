# Proposal: Fix preset/writer compatibility for release-notes rendering

## Why

The first real semantic-release run on `main` after the upgrade-release-tooling change (archived 2026-09-22, merged as PR #40) **failed in production** at the `generateNotes` step of `@semantic-release/release-notes-generator` (rng) 14.1.1:

```
Error: Missing helper: "conventional-changelog-conventionalcommits requires conventional-changelog-writer@9 or newer (conventional-changelog@8 or newer). Your changelog tooling loaded an older writer which cannot render this preset. Update the tooling or use an older major version of the preset."
```

Root cause (verified with `npm ls` and `npm view`): the upgrade pinned `conventional-changelog-conventionalcommits` (ccc) at **10.4.0**, but ccc@10's `preset().writer` templates use the new render-function format that requires `conventional-changelog-writer@9+` (the June 2026 conventional-changelog release train: ccc@10 ↔ writer@9 ↔ conventional-changelog@8). The entire stable @semantic-release ecosystem is still on writer@8 — rng 14.1.1 (the latest stable; only 15.0.0-betas exist beyond it) and `@semantic-release/commit-analyzer` 13.0.1 both declare `conventional-changelog-writer: ^8.0.0`, and the tree resolves writer 8.4.0. ccc@10 therefore cannot render through rng 14.1.1 — with or without custom `writerOpts` (the default `preset: 'conventionalcommits'` path loads the same ccc@10 templates). ccc@10's own error message prescribes the remedy for older tooling: "use an older major version of the preset".

Two important facts from the failure:

- **The releaseRules fix worked perfectly in production.** The CI log shows commit-analyzer analyzed the 9 commits since v2.5.0, only `fix(release)` triggered a patch ("The next release version is 2.5.1"), and all other commits correctly "should not trigger a release". Analyzer behavior and scope filtering are validated end-to-end in production; only the notes rendering broke. The failed run wrote nothing — no `v2.5.1` tag exists on origin.
- **A validation gap in the original change:** its dry-run exited early ("The local branch main is behind the remote one") BEFORE reaching `generateNotes`, so the render path was never exercised. This change's verification tasks close that gap.

## What Changes

- **One dependency pin**: root `package.json` devDependencies `conventional-changelog-conventionalcommits` `10.4.0` → **`9.3.1`** (latest v9), plus lockfile regeneration. Nothing else — no config files, no workflows, no hooks, no docs, no app code.
- **Dual-major ccc tree (intentional)**: `@commitlint/config-conventional@21.2.3` declares ccc `^10.0.0`, so npm installs ccc 10.4.0 nested under it. Each consumer resolves its supported major: our `.releaserc.mjs` imports resolve root's 9.3.1; commitlint resolves its nested 10.4.0 (parser-only usage — no rendering, unaffected).
- **Proven combination**: ccc 9.3.1 + rng 14.1.1 + writer 8.4.0 is the exact combination that produced every historical release of this repo including v2.5.0 (2026-09-22). The `.releaserc.mjs` ESM configs are compatible with ccc@9 (verified: the import works), and the releaseRules semantics are preset-major-independent (analyzer logic, already validated in production).
- **`npm audit` stays at 0 vulnerabilities** with ccc@9.3.1 (verified in a scratch install with the exact target tree).

## Capabilities

### Modified Capabilities

- `release-tooling`: the exact-pin list moves `conventional-changelog-conventionalcommits` to 9.3.1 (all other pins unchanged) and documents the expected nested ccc@10 under `@commitlint/config-conventional`; a new requirement pins preset/writer compatibility for release-notes rendering (the ccc major SHALL render through the writer major shipped by the installed rng, with a re-upgrade guard tied to rng depending on writer ^9+).

### New Capabilities

- None.

## Non-Goals

- **No config file changes** — the three `.releaserc.mjs` files are untouched (verified compatible with ccc@9).
- **No workflow, hook, or CI changes** — `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `.husky/*` need zero edits.
- **No docs changes** — `ROADMAP.md`, `README.md`, `AGENTS.md` untouched. The ccc re-upgrade outlook is recorded in this change's design.md as a future follow-up note; a roadmap entry may track it in a future change, not this one.
- **No app code changes** — `apps/**/src/`, `packages/shared/**` untouched.
- **No rng 15 beta** — 15.0.0 is beta-only; the repo does not ship beta release tooling on protected release paths.
- **No writer@9 override hack** — forcing writer@9 via `npm overrides` would pair rng 14.1.1 with a writer major outside its declared `^8.0.0` range; the repo's `overrides` are security pins, not compatibility hacks.
- **No re-litigating the rest of the D1 upgrade** — semantic-release 25.0.9, commitlint 21, lint-staged 17, the ESM configs, and the releaseRules fix all work (the production CI log validates the analyzer end-to-end); only the ccc major was wrong.

## Impact

| Area | Change |
|------|--------|
| Root `package.json` | Exactly one devDependency line: `conventional-changelog-conventionalcommits` `10.4.0` → `9.3.1` |
| `package-lock.json` | Regenerated — dual-major ccc tree (root 9.3.1; nested 10.4.0 under `@commitlint/config-conventional`); writer 8.4.0 shared |
| Release behavior | `generateNotes` renders again — the next run on `main` releases the pending v2.5.1 patch |
| `npm audit` | Stays at 0 vulnerabilities |

**Explicitly untouched:** the three `.releaserc.mjs` files, `.github/workflows/*`, `.husky/*`, `commitlint.config.js`, `ROADMAP.md`, `README.md`, `AGENTS.md`, `docs/`, `apps/**/src/`, `packages/shared/**`, `.npmrc`, `nx.json`, the `overrides` section, all three `CHANGELOG.md` files (existing content). The Cloud Run image rebuild triggered by the lockfile change is expected and harmless (runtime installs only api prod deps).
