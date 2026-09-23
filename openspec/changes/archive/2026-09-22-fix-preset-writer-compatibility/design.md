# Design: Fix preset/writer compatibility for release-notes rendering

## Context

The upgrade-release-tooling change (archived 2026-09-22, pushed to `develop` and merged to `main` as PR #40) pinned `conventional-changelog-conventionalcommits` (ccc) at **10.4.0**. The first real semantic-release run on `main` (sr 25.0.9) **FAILED at the `generateNotes` step** of `@semantic-release/release-notes-generator` (rng) 14.1.1:

```
Error: Missing helper: "conventional-changelog-conventionalcommits requires conventional-changelog-writer@9 or newer (conventional-changelog@8 or newer). Your changelog tooling loaded an older writer which cannot render this preset. Update the tooling or use an older major version of the preset."
```

**Good news from the CI failure log — the releaseRules fix worked PERFECTLY in production.** Commit-analyzer analyzed the 9 commits since v2.5.0, only `fix(release)` triggered a patch ("The next release version is 2.5.1"), and all other commits correctly "should not trigger a release". The analyzer behavior and scope filtering are validated end-to-end in production; only the notes rendering broke. The failed run wrote nothing — no `v2.5.1` tag exists on origin.

**The failure also exposed a validation gap in the original change:** its dry-run validation exited early ("The local branch main is behind the remote one") BEFORE reaching `generateNotes`, so the render path was never exercised. This change's verification tasks MUST close that gap (task 2.2 exercises rendering via a harness; task 2.3 runs a dry-run that reaches `generateNotes`).

## Root cause (verified facts — not re-verified in this change)

- ccc@10's `preset().writer` templates use the new render-function format that requires `conventional-changelog-writer@9+` (part of the June 2026 conventional-changelog release train: ccc@10 ↔ writer@9 ↔ conventional-changelog@8).
- The ENTIRE stable @semantic-release ecosystem is still on writer@8: rng 14.1.1 (the LATEST stable — only 15.0.0-betas exist beyond it) and `@semantic-release/commit-analyzer` 13.0.1 both declare `conventional-changelog-writer: ^8.0.0`; the tree resolves writer 8.4.0.
- Therefore ccc@10 cannot render through rng 14.1.1 — regardless of whether custom `writerOpts` are passed (the default `preset: 'conventionalcommits'` path loads the same ccc@10 templates).
- ccc@10's own error message prescribes the remedy for older tooling: "use an older major version of the preset".
- semantic-release 25 (and thus the audit fix — npm 11.20.0 bundled) does NOT depend on the ccc major. Everything else in the upgrade is unaffected.

## Decision: pin ccc at 9.3.1 (latest v9)

One line in root `package.json` devDependencies (`10.4.0` → `9.3.1`) + lockfile regeneration. This follows upstream's own guidance ("use an older major version of the preset") and returns to the exact combination that produced every historical release of this repo including v2.5.0 (2026-09-22): **ccc 9.3.1 + rng 14.1.1 + writer 8.4.0** — a proven combination.

### Alternatives considered and rejected

| Alternative | Why rejected |
|---|---|
| **Force writer@9 via `npm overrides`** | Pairs rng 14.1.1 with a writer major outside its declared `^8.0.0` range — an untested rng+writer combination forced against declared ranges. The repo's `overrides` section (`chokidar`, `multer`, `readdirp`, `smol-toml`) exists for security pins, not compatibility hacks. |
| **Upgrade to rng 15 (writer ^9)** | rng 15.0.0 exists only as betas. The repo does not ship beta release tooling on protected release paths. |
| **Keep ccc@10, drop the custom `writerOpts`** | Same failure — the default `preset: 'conventionalcommits'` path loads the same ccc@10 templates; the incompatibility is in the preset's render functions, not in our config. |
| **Do nothing / wait for the ecosystem** | The root stream is broken in production NOW — every push to `main` fails at `generateNotes` and no release can go out. |

## Verified evidence (orchestrator scratch with the exact target tree)

- Root ccc@9.3.1; `@commitlint/config-conventional@21.2.3` declares ccc `^10.0.0` so npm installs ccc 10.4.0 NESTED under it — a dual-major tree where each consumer resolves its supported major (our `.releaserc.mjs` imports resolve root's 9.3.1; commitlint resolves its nested 10.4.0). commitlint's usage is parser-only (no rendering) — unaffected.
- `npm audit` stays at **0 vulnerabilities** with ccc@9.3.1.
- The real `generateNotes` of rng 14.1.1 renders correctly with the exact config shapes of all three streams (root `writerOpts` passthrough; web/api transform + `ALLOWED_SCOPES`): notes render with compare links and correct scope formatting; the web transform includes `fix(web)` and excludes `fix(release)`; root notes include the fix and exclude chore/docs.
- The `.releaserc.mjs` ESM configs are compatible with ccc@9 (the import works; the old `.cjs` configs required ccc@9 the same way for years) — NO config file changes in this fix.
- The `releaseRules` arrays and their semantics are preset-major-independent (analyzer logic) — the production CI log already validated them.

## Risks / Trade-offs

- **[Intentional] Dual-major ccc tree.** Root 9.3.1 + nested 10.4.0 under `@commitlint/config-conventional` is expected npm behavior when consumers declare different majors — each consumer resolves its supported major. Not a hygiene problem: the exact-pin policy governs OUR direct devDependencies; the nested copy is commitlint's own resolved dependency (parser-only usage).
- **[Accepted lag] ccc stays a major behind the latest.** Until the stable @semantic-release ecosystem ships a writer@9-based rng, ccc remains on 9.x. This is upstream's own prescribed remedy for older tooling — not a repo workaround.
- **[Risk] A future re-upgrade could reintroduce the failure.** Mitigated by the new "Preset/writer compatibility for release-notes rendering" requirement's re-upgrade guard: the ccc major only moves past 9 when the installed rng depends on writer ^9+ (verified via `npm ls conventional-changelog-writer`), and the dry-run verification must reach `generateNotes`.
- **[Risk] Docker/Cloud Run rebuild churn from the lockfile change** — expected, harmless (the runtime image contains only api prod deps; the release toolchain never ships).

## Compatibility outlook (future follow-up note — NOT a task in this change)

When `@semantic-release/release-notes-generator` ships a **stable** version depending on `conventional-changelog-writer` ^9 (rng 15 is currently beta-only), ccc can be re-upgraded to the 10.x line. Until then, ccc stays on 9.3.1. A ROADMAP entry could track this re-upgrade — deliberately NOT added in this change (out of scope; `ROADMAP.md` is untouched). Revisit when rng 15 goes stable.

## Rollback

`git revert` of the single commit — restores the `10.4.0` pin and the previous lockfile; `npm install` to resync. Note that rollback reintroduces the production `generateNotes` failure, so it only makes sense paired with a different fix strategy. No data or history migration is involved — git tags and existing `CHANGELOG.md` content are never touched.

## Open Questions

*(none — every decision above is backed by empirical verification recorded in this document)*
