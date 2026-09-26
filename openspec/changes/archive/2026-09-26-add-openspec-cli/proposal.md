# Proposal: Add OpenSpec CLI (roadmap I14)

## Why

Archiving an OpenSpec change today is a fully manual ritual: `mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>` plus a hand-merge of the delta specs into the canonical specs — with **zero validation anywhere in the loop**. Nothing checks that a MODIFIED block carries every scenario the canonical spec still has, nothing checks that requirement text contains SHALL/MUST, and nothing checks that archived changes actually completed their tasks. The delta↔canonical grammar rules in `AGENTS.md` are enforced by discipline alone — its own note says exactly that.

The root cause is a package-name trap: the bare npm name `openspec` is an unrelated **0.0.0 placeholder** — which is why `npx openspec` "fails" today. The real CLI is **`@fission-ai/openspec`** (v1.13.2), verified in a sandbox against a copy of this repo: it installs clean (70 transitive packages, `npm audit` → 0 vulnerabilities, engine `>=20.19` satisfied by Node 24), detects the existing `openspec/` layout natively (`schema: spec-driven` in `openspec/config.yaml` plus the per-change `.openspec.yaml` sidecars), and its `validate` surfaces exactly the three pre-existing integrity issues this change also fixes.

The CLI's `archive` is strictly safer than the manual process: it validates the change first, merges the delta specs into the canonical specs with the merge semantics enforced by the tool, **refuses a MODIFIED delta that would drop scenarios the canonical spec still has** (a safety property the manual process lacks entirely), and moves the folder to `openspec/changes/archive/YYYY-MM-DD-<name>/` only after the merge succeeds — nothing is archived or merged when validation fails.

One latent bug activates the moment the CLI installs: `.husky/pre-commit` already contains a warning-only parser of `openspec list --json` — dead code today (no CLI installed), but it reads `tasksDone`/`tasksTotal` while the real CLI 1.13.2 emits `completedTasks`/`totalTasks` (verified live). Once installed, `undefined === undefined` would misreport **every active change as "completed but NOT archived"** and the pending-tasks warning would never fire. This change fixes the field names.

## What Changes

1. **Install `@fission-ai/openspec` 1.13.2** as an exact-pinned root devDependency (shared dev tooling → root per `AGENTS.md`; no `^`/`~` per repo policy). `npx openspec` then resolves the local bin offline — no network needed after `npm install`.
2. **Adopt only `validate` + `archive`** from the CLI. The existing `openspec/` layout is detected natively — no `init`, no migration, no layout changes.
3. **Pre-push quality gate** (user decision: push time, NOT pre-commit — pre-commit validation would block mid-spec work-in-progress commits): `.husky/pre-push` gains two separate fail-fast commands — `npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1` — after the main-branch guard and before the `nx affected` test run (fail fast, ~1.5–2 s verified). The CLI cannot combine `--specs` and `--archived` in one run (combined invocation silently validates only archived changes); active/in-progress changes are deliberately out of the gate's scope so mid-spec pushes stay allowed.
4. **Fix the pre-existing spec integrity issues** the gate would otherwise fail on (all verified by running the CLI against a sandbox copy of the repo):
   - `openspec/specs/ci-node-version/spec.md` — its 3 requirements have headings + scenarios but no body text → `validate --specs` fails with "Requirement must contain SHALL or MUST" (43/44 canonical specs pass; only this one fails). Fixed via a MODIFIED delta adding RFC-2119 body text — the canonical fix lands at archive time via the CLI's merge.
   - `openspec/changes/archive/2026-05-23-invert-vercel-ignore-logic/tasks.md` — 4 unchecked items → `validate --archived` fails. Evidence the work happened: `vercel.json` contains `"ignoreCommand": "bash scripts/vercel-ignore.sh"` (the denylist script the change introduced). Fixed by ticking the boxes with a dated retroactive-evidence footnote.
   - `openspec/changes/archive/2026-05-01-semantic-release-versioning/tasks.md` — 1 unchecked item (5.6). Evidence: git tags `web-v1.0.0`, `api-v1.0.0`, `v1.0.0` all exist in the repo. Fixed the same way.
5. **Fix the latent pre-commit parser bug**: swap `tasksDone`/`tasksTotal` → `completedTasks`/`totalTasks` in the warning-only block (minimal fix — just the field renames). The block stays warning-only and never blocks commits.
6. **Update docs by hand** (user decision: surgical and brief — no `openspec update`/`init`): the `AGENTS.md` CLI-absence blockquote, the "Merge, never overwrite" closing-step sentences in `CLAUDE.md` and `.opencode/agents/orchestrator.md`, the manual-archive procedure in the three archive command/skill files (`.claude/commands/opsx/archive.md`, `.opencode/command/opsx-archive.md`, `.opencode/skills/openspec-archive-change/SKILL.md`), and the `ROADMAP.md` I14 bullet (verified: I14 is the highest Ixx ID — no renumbering needed).
7. **Archive this very change with the CLI** — `npx openspec archive add-openspec-cli --yes` as the first real CLI archive. The ci-node-version canonical fix and the new `openspec-cli` canonical spec land at archive time via the delta merge; the pre-push gate goes fully green only after that archive.

## Capabilities

### New Capabilities

- `openspec-cli`: the OpenSpec CLI as installed tooling — a pinned root devDependency with offline bin resolution, CLI-based archiving with tool-enforced merge semantics (canonical grammar preserved, scenario-dropping MODIFIED deltas refused), and the pre-commit hook's warning-only change-status reporting reading the real CLI field names.

### Modified Capabilities

- `pre-push-quality-gate`: one ADDED requirement — the hook validates canonical specs (`npx openspec validate --specs --no-interactive || exit 1`) and archived changes (`npx openspec validate --archived --no-interactive || exit 1`) as separate fail-fast commands after the main-branch guard and before the affected-test step; active changes stay out of scope. Existing requirements untouched.
- `ci-node-version`: MODIFIED — the 3 existing requirements gain RFC-2119 body text (behaviorally identical to the current intent); all scenarios preserved verbatim.

## Non-Goals

- **No stores, worksets, profiles, or `doctor`** — only `validate` + `archive` are adopted from the CLI; its other subsystems are out of scope.
- **No `openspec init` / `openspec update`** — the existing `openspec/` layout is already detected natively; docs are updated surgically by hand instead.
- **No CI workflow changes** — the quality gate is local-only (`.husky/pre-push`); `.github/workflows/**` is untouched and keeps running its existing suite.
- **No pre-commit validation gate** — pre-commit stays warning-only; validation lives at push time so mid-spec work-in-progress commits are never blocked.
- **No README.md changes** — it describes the SDD flow generically; nothing there references the manual archive process or the CLI's absence.
- **No migration or renaming of historical archives** — `openspec/changes/archive/**` keeps its naming and content, except the two `tasks.md` integrity fixes (ticked boxes + dated evidence footnotes), which are the data edits that make `validate --archived` pass.
- **No npm script additions** — the CLI is invoked via `npx` in the hook and ad hoc.
- **No app code changes** — `apps/**/src/` and `packages/shared/**` are untouched; the change has no user-facing behavioral surface (no E2E per the SDD criterion).

## Impact

| Area                                                                                                                         | Change                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root `package.json` + `package-lock.json`                                                                                    | +1 devDependency: `@fission-ai/openspec` 1.13.2 exact pin (70 transitive packages, audit-clean)                                                                                                              |
| `.husky/pre-push`                                                                                                            | +2 fail-fast steps: `npx openspec validate --specs --no-interactive \|\| exit 1` and `npx openspec validate --archived --no-interactive \|\| exit 1` between the main-branch guard and the `nx affected` run |
| `.husky/pre-commit`                                                                                                          | Field renames only in the warning block: `tasksDone`/`tasksTotal` → `completedTasks`/`totalTasks` (8 occurrences)                                                                                            |
| `openspec/specs/ci-node-version/spec.md`                                                                                     | 3 requirements gain SHALL body text — lands at archive time via the MODIFIED delta merge                                                                                                                     |
| 2 archived `tasks.md` files                                                                                                  | Unchecked boxes ticked + dated retroactive-evidence footnotes                                                                                                                                                |
| `AGENTS.md`, `CLAUDE.md`, `.opencode/agents/orchestrator.md`                                                                 | Brief updates: CLI installed, archive via `npx openspec archive <change> --yes`, merge enforced by the tool                                                                                                  |
| `.claude/commands/opsx/archive.md`, `.opencode/command/opsx-archive.md`, `.opencode/skills/openspec-archive-change/SKILL.md` | Manual `mv` + agent-driven sync procedure replaced by `npx openspec archive <name> --yes`; pre-checks kept                                                                                                   |
| `ROADMAP.md`                                                                                                                 | I14 bullet deleted (highest Ixx ID — no renumbering)                                                                                                                                                         |

**Explicitly untouched:** `apps/**/src/`, `packages/shared/**`, `.github/workflows/**`, `README.md`, `docs/`, `openspec/specs/**` (canonical edits happen only via the archive-time merge: `ci-node-version` fixed, `openspec-cli` created, `pre-push-quality-gate` appended), all other archived change folders, `nx.json`, `commitlint.config.js`, `.npmrc`.
