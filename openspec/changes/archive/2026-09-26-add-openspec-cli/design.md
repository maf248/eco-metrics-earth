# Design: Add OpenSpec CLI (`@fission-ai/openspec` 1.13.2 — validate + archive)

## Context

This is roadmap item **I14**, evaluated and approved with this exact scope. All evidence below was **empirically verified before this spec was written** — a sandbox install of the exact package version against a copy of this repo, plus live CLI runs. The conclusions are settled, not provisional.

Three forces drive the change:

1. **The manual archive process is unvalidated by construction.** `mv` + hand-merge of deltas into canonical specs has no tool checking anything: MODIFIED blocks can silently drop scenarios, requirement text can lack SHALL/MUST, archived tasks can sit unchecked forever. The `AGENTS.md` delta↔canonical grammar rules are enforced by discipline alone.
2. **The package-name trap.** The bare npm name `openspec` is an unrelated 0.0.0 placeholder — `npx openspec` "fails" today because of that, not because no CLI exists. The real CLI is `@fission-ai/openspec`.
3. **A latent bug activates on install.** `.husky/pre-commit` has a warning-only parser of `openspec list --json` — dead code today, but written against field names the real CLI does not emit.

## Goals / Non-Goals

**Goals:**

- Install `@fission-ai/openspec` 1.13.2 as an exact-pinned root devDependency; `npx openspec` resolves offline.
- Adopt `validate` + `archive` only; the existing layout is detected natively — zero migration.
- Pre-push gate: two fail-fast commands (`npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1`) after the main-branch guard, before the affected-test step; active changes out of scope.
- Make the repo's OpenSpec state pass that gate: the ci-node-version canonical fix (via MODIFIED delta, merged at archive time) + the two archived-tasks evidence fixes.
- Fix the pre-commit parser field names; keep the block warning-only.
- Update the docs that describe the manual process; remove ROADMAP I14.
- Archive this change with the CLI itself — the first real CLI archive.

**Non-Goals:** identical to the proposal.

## Decisions

### 1. The package: `@fission-ai/openspec` 1.13.2, root devDependency, exact pin

- **Not** the bare `openspec` npm name (0.0.0 placeholder, unrelated package). Always the scoped `@fission-ai/openspec`.
- Engine `>=20.19` — satisfied (repo runs Node 24 per `.nvmrc`).
- 70 transitive packages; sandbox `npm audit` → **0 vulnerabilities**.
- Root devDependencies (shared dev tooling → root per `AGENTS.md`); exact pin `1.13.2`, no `^`/`~` (repo policy).
- After `npm install`, `npx openspec` resolves the local bin — no network needed (verified).

### 2. Adoption scope: `validate` + `archive` only

- The CLI detects the existing layout natively: the root resolves to the nearest directory containing `openspec/`; `schema: spec-driven` in `openspec/config.yaml` and the per-change `.openspec.yaml` sidecars are recognized as the CLI's default schema (proposal → specs → design → tasks).
- No `openspec init`, no `openspec update`, no stores/worksets/profiles/`doctor`. Docs are updated by hand (Decision 6).

### 3. The quality gate: pre-push, not pre-commit (user decision)

- **Pre-commit is deliberately NOT a validation gate** — it would block mid-spec (work-in-progress) commits. The pre-commit OpenSpec block stays warning-only (Decision 5).
- The gate: two separate fail-fast commands — `npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1` — because the CLI cannot combine `--specs` and `--archived` in one `validate` run (a combined invocation silently validates only archived changes and skips canonical specs).
- **Placement:** in `.husky/pre-push`, after the main-branch guard, BEFORE the `NX_NATIVE_COMMAND_RUNNER=false npx nx affected --target=test --base=origin/develop` line — fail fast (~1.5–2 s verified) ahead of the longer test run.
- **Exit semantics (verified):** each command is non-zero when its scope is invalid; the `|| exit 1` form makes the first failure abort the hook before `nx affected` runs. `.husky/pre-push` deliberately has no `set -e`, so a bare mid-script failure would be swallowed by the final `nx affected` exit status; the explicit `|| exit 1` prevents that. A zero result from both commands lets the hook proceed.
- **Active/in-progress changes are deliberately NOT validated** (only the `--specs` and `--archived` scopes) so mid-spec pushes stay allowed. Active-change quality is guaranteed by the SDD flow plus the archive-time validation, not the push gate.
- `--strict` is NOT used: it does not turn the ">500 chars requirement text" infos into errors (they stay INFO) — nothing in this repo needs it.

### 4. Pre-existing integrity fixes (verified against a sandbox copy of the repo)

`openspec validate --specs` today: **43/44 pass**; only `ci-node-version` fails. `openspec validate --archived` today: **41/43 pass**; the 2 failures are exactly the archived changes with unchecked task boxes.

- **`openspec/specs/ci-node-version/spec.md`** — its 3 requirements have headings + scenarios but NO body text → validate fails with "Requirement must contain SHALL or MUST". Fix: a MODIFIED delta in this change adds RFC-2119 body text (behaviorally identical to the current intent). The fix path (delta → archive → merge) was dry-runned successfully in a sandbox. **The canonical fix lands at archive time of this change** via the CLI merge — not by hand-editing the canonical file.
- **`openspec/changes/archive/2026-05-23-invert-vercel-ignore-logic/tasks.md`** — 4 unchecked items. Evidence the work happened: `vercel.json` line 6 contains `"ignoreCommand": "bash scripts/vercel-ignore.sh"` — the denylist script the change introduced. Fix: tick the boxes + a dated retroactive-evidence footnote.
- **`openspec/changes/archive/2026-05-01-semantic-release-versioning/tasks.md`** — 1 unchecked item (5.6, "commit and push to main — verify workflow produces tags"). Evidence: git tags `web-v1.0.0`, `api-v1.0.0`, `v1.0.0` all exist in the repo. Fix: tick + dated evidence footnote.
- These archived-tasks fixes are **direct data edits** (historical records whose deltas were applied long ago) — they are tasks in this change's `tasks.md`, NOT delta specs.

### 5. Pre-commit parser fix (the latent bug)

The CLI 1.13.2 `openspec list --json` output shape (verified live):

```json
{
  "changes": [
    { "name", "completedTasks", "totalTasks", "lastModified", "status" }
  ],
  "root": { ... }
}
```

The hook's parser reads `c.tasksDone === c.tasksTotal` → with the real shape both are `undefined` → `undefined === undefined` is `true` → **every active change would be misreported as "completed but NOT archived"**, and the incomplete check (`c.tasksDone < c.tasksTotal`) would never fire.

Fix: rename the two fields — `tasksDone` → `completedTasks`, `tasksTotal` → `totalTasks` (8 occurrences: the `doneButNotArchived` filter and its display, the `incomplete` filter and its display). Minimal fix: `status: "in-progress"` also exists in the output but is not needed. The block stays exactly as warning-only as it is today: try/catch, `2>/dev/null`, `process.exit(0)` on any failure — it can never block a commit.

### 6. Docs by hand (user decision: surgical and brief — no `openspec update`/`init`)

| File                                                             | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (~line 68 blockquote)                                | Replace the CLI-absence note: the CLI (`@fission-ai/openspec`, pinned root devDependency) is installed; archive with `npx openspec archive <change> --yes` (validates the change, merges delta specs into canonical specs — merge semantics enforced by the tool — and moves the folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`); the delta↔canonical grammar rules are enforced automatically; the pre-push gate runs `openspec validate` twice (`--specs` and `--archived`), as separate fail-fast commands |
| `CLAUDE.md` (~line 29, "Merge, never overwrite" sentence)        | Brief update: the merge is now performed by `npx openspec archive <change> --yes`                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `.opencode/agents/orchestrator.md` (~line 35, same closing step) | Same brief update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `.claude/commands/opsx/archive.md`                               | Replace the manual "Perform the archive" (mkdir + `mv`) and the agent-driven delta-sync step with `npx openspec archive <name> --yes` (validates first, merges deltas into canonical specs, refuses MODIFIED deltas that drop scenarios, moves to the dated archive folder). Keep the pre-checks (artifact status, task completion); drop the manual mv/sync steps                                                                                                                                                     |
| `.opencode/command/opsx-archive.md`                              | Same replacement as above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `.opencode/skills/openspec-archive-change/SKILL.md`              | Same replacement as above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ROADMAP.md` (line 241)                                          | Delete the I14 bullet — verified: it is the highest Ixx ID (I01–I14, no gaps) and no other `I14` reference exists in the doc → NO renumbering, NO cross-reference updates. The "Última actualización" date already reads 26 Sep 2026                                                                                                                                                                                                                                                                                   |

### 7. This change archives itself with the CLI

`npx openspec archive add-openspec-cli --yes` — the first real CLI archive. Verified CLI archive behavior (ground truth for the deltas):

- Validates the change, then merges deltas into canonical specs (`+` adds, `~` modifies), then moves the folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
- An ADDED delta for a new capability scaffolds the canonical file with `# <name> Specification` / `## Purpose` (TBD stub) / `## Requirements` + the ADDED requirements.
- An ADDED delta for an existing capability appends its requirements to the existing canonical file; the rest is untouched.
- A MODIFIED delta replaces ONLY the targeted requirement in place; the rest of the canonical file is untouched; no delta headers leak into canonical files.
- The archive REFUSES a MODIFIED delta whose block omits scenarios the current canonical spec still has — a safety property the manual process lacked.

Consequence for sequencing: **the pre-push gate goes fully green only AFTER this archive** — until the merge lands, `validate --specs` still fails on the pre-existing ci-node-version issue (the delta is not merged yet). The SDD close sequence (archive before commit) means the push of this change happens with the canonical already fixed.

## Risks / Trade-offs

- **[Deliberate] Every push pays ~1.5–2 s for the validate step** — accepted; it fails fast ahead of the longer affected-test run.
- **[Deliberate] Active changes are not push-validated** — by design, mid-spec pushes stay allowed; active-change quality is the SDD flow's job (the archive validates before merging).
- **[Expected window] Between inserting the gate and archiving this change, `validate --specs` fails on ci-node-version** — the canonical fix lands at archive time. The change is committed and pushed after the archive step (per the SDD close sequence), so the gate is green by then.
- **[Risk] Future CLI majors could change the `list --json` shape again** — mitigated: exact pin (no floating ranges), the block is warning-only with try/catch, and the pin only moves through a future OpenSpec proposal.
- **[Risk] Retroactive edits to archived `tasks.md` files** — historical records; the footnotes are dated and explicit that the ticks are retroactive; no other content changes.

## Migration Plan

1. Install the pin; regenerate the lockfile; verify offline resolution + clean audit.
2. Insert the pre-push validate step; fix the pre-commit field names.
3. Fix the two archived tasks files (evidence footnotes).
4. Update the docs (`AGENTS.md`, `CLAUDE.md`, `orchestrator.md`, the three archive files, `ROADMAP.md` I14).
5. Run the gates (lint, build, unit tests — no E2E: no app-code behavioral surface).
6. Archive this change with the CLI; verify the gate is fully green.

**Rollback:** `git revert` of the change's commits. Because archiving happens before the commit (SDD close sequence), the hook edits, docs, archived-task fixes, canonical merges, and the folder move all live in the same commit set — a revert restores the pre-change state atomically. No app code is involved.

## Open Questions

_(none — every decision above is backed by empirical verification recorded in this document)_
