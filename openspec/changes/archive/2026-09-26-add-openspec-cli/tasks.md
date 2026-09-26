# Tasks: Add OpenSpec CLI

> Tooling/docs change with **no app-code behavioral surface** — no E2E per the SDD criterion (the `pre-push-quality-gate` canonical spec's "A no-behavior change skips E2E at validation" scenario applies). Gates: lint + build + unit tests.
>
> Do not commit anything without explicit user authorization — the commit suggestions at the end list the intended atomic commits only.
>
> Suggested working branch: `feature/add-openspec-cli` off `develop`.
>
> **Sequencing note:** the pre-push gate inserted in Group 2 is expected to FAIL on the pre-existing `ci-node-version` canonical issue until this change is archived (Group 7) — the canonical fix lands at archive time via the CLI's delta merge. That is the designed sequencing, not a bug.

---

## Task Group 1 — Install the CLI (implementation)

- [x] 1.1 Add the exact pin to root `package.json` devDependencies

  Add exactly `"@fission-ai/openspec": "1.13.2"` (no `^`/`~`) to the root `package.json` devDependencies — root scope per `AGENTS.md` (shared dev tooling). Do NOT touch any app-level `package.json`, the `overrides` section, scripts, or the `lint-staged` block. Do NOT install the bare `openspec` npm package — it is an unrelated 0.0.0 placeholder.

  **Verification:** `grep '"@fission-ai/openspec"' package.json` shows the exact pin `1.13.2` with no range characters; no app-level `package.json` mentions the package.

- [x] 1.2 Regenerate the lockfile

  Run `npm install` at the repo root (the repo `.npmrc` with `legacy-peer-deps=true` applies) so `package-lock.json` picks up `@fission-ai/openspec` 1.13.2 and its 70 transitive packages.

  **Verification:** `npm ls @fission-ai/openspec` resolves to 1.13.2; a second `npm install` changes nothing (idempotent).

- [x] 1.3 Verify offline resolution and a clean audit (verification task)

  - `npx openspec --version` answers from the local bin — no network needed (e.g. it works with networking disabled).
  - `npx openspec list` runs against the existing layout and reports this active change with `completedTasks`/`totalTasks` fields.
  - `npm audit` prints `found 0 vulnerabilities`.

  **Verification:** All three checks pass. If `npx openspec` attempts a network fetch or audit reports vulnerabilities, stop and report — the sandbox verification proved both clean with this exact pin.

---

## Task Group 2 — Pre-push quality gate (implementation)

- [x] 2.1 Insert the OpenSpec validate step in `.husky/pre-push`

  After the main-branch guard (the `if [ "$branch" = "main" ]` block) and BEFORE the `NX_NATIVE_COMMAND_RUNNER=false npx nx affected --target=test --base=origin/develop` line (and its existing comment block), insert:

  ```sh
  # OpenSpec integrity gate: canonical specs + archived changes must validate.
  # The CLI cannot combine --specs and --archived in one run (it silently skips
  # specs), so each scope is its own fail-fast command. Active/in-progress
  # changes are deliberately NOT validated here so mid-spec pushes stay allowed.
  npx openspec validate --specs --no-interactive || exit 1
  npx openspec validate --archived --no-interactive || exit 1
  ```

  Nothing else in the hook changes — the branch guard, the E2E comment, the `NX_NATIVE_COMMAND_RUNNER` comment, and the affected-test line stay verbatim.

  _Correction (2026-09-26): the @tester's hook simulation discovered the OpenSpec CLI cannot combine `--specs` and `--archived` in one run; combined runs silently validate only archived changes. The gate was corrected to two fail-fast commands (`|| exit 1`)._

  **Verification:** `sh .husky/pre-push` from the repo root runs the branch check, then the validate step, then the affected-test step, in that order. Expected pre-archive state: the validate step fails on `ci-node-version` (canonical fix lands at archive time, task 7.1) and — until Group 4 lands — on the two archived tasks files. Both failures are the pre-existing issues this change exists to fix.

- [x] 2.2 Verify the gate's scope excludes active changes (verification task)

  Confirm the inserted commands are exactly `npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1` — no flag or scope covering active/in-progress changes.

  **Verification:** The hook lines match the spec's commands verbatim. Behavioral proof: while this change is active with unchecked tasks, the validate step's failures are exactly the canonical `ci-node-version` issue and (pre-Group-4) the two archived tasks files — never this change's own unchecked tasks. That demonstrates the active-changes exclusion.

---

## Task Group 3 — Pre-commit parser fix (implementation)

- [x] 3.1 Rename the two field names in the `.husky/pre-commit` OpenSpec block

  In the warning-only `openspec list --json` parser block: replace every `c.tasksDone` with `c.completedTasks` and every `c.tasksTotal` with `c.totalTasks` — 8 occurrences total (the `doneButNotArchived` filter and its display line, the `incomplete` filter and its display line). Nothing else changes: the block stays warning-only (try/catch, `2>/dev/null`, `process.exit(0)`), and the messages and emojis stay as-is.

  **Verification:** `grep -c "tasksDone\|tasksTotal" .husky/pre-commit` returns 0; `grep -c "completedTasks\|totalTasks" .husky/pre-commit` returns 4 (8 field references across 4 lines); `git diff .husky/pre-commit` shows only the field renames.

- [x] 3.2 Verify the block classifies correctly and never blocks (verification task)

  - `npx openspec list --json` output contains `completedTasks` and `totalTasks` per change — the fields the parser now reads.
  - With this change active and its tasks incomplete, the parser reports it under "Open specs with pending tasks" with the real counts — NOT the false "Specs completed but NOT archived" warning.
  - Malformed input test: pipe invalid JSON into the same node parser snippet — the try/catch exits 0.

  **Verification:** The pending-tasks warning shows real numbers; no active change is misreported as completed; the parser exits 0 on valid and malformed input alike (the block can never block a commit).

---

## Task Group 4 — Archived-tasks integrity fixes (data edits)

> These are direct data edits to historical records (their deltas were applied long ago) — NOT delta specs. The footnotes must be dated with the actual implementation date and explicit that the ticks are retroactive. No other content in either file changes.

- [x] 4.1 Fix `openspec/changes/archive/2026-05-23-invert-vercel-ignore-logic/tasks.md`

  Tick the 4 unchecked items (1.1, 2.1, 2.2, 2.3) and append a dated retroactive-evidence footnote at the end of the file, to the effect of:

  > Boxes ticked retroactively on &lt;implementation date&gt; when the OpenSpec CLI's `validate --archived` pre-push gate was adopted: the work is evidenced by `vercel.json` (`"ignoreCommand": "bash scripts/vercel-ignore.sh"` — the denylist script this change introduced) and by the repo's green build/test history since. No content other than the checkboxes and this footnote changed.

  **Verification:** The file has zero unchecked items; the footnote is present and dated; `git diff` on the file shows only the 4 ticks and the footnote.

- [x] 4.2 Fix `openspec/changes/archive/2026-05-01-semantic-release-versioning/tasks.md`

  Tick item 5.6 and append a dated evidence footnote at the end of the file, to the effect of:

  > Box 5.6 ticked retroactively on &lt;implementation date&gt; when the OpenSpec CLI's `validate --archived` pre-push gate was adopted: the work is evidenced by the existing git tags `web-v1.0.0`, `api-v1.0.0`, and `v1.0.0` — the release workflow produced the tags this task set out to verify. No content other than the checkbox and this footnote changed.

  **Verification:** The file has zero unchecked items; `git tag -l 'v1.0.0' 'web-v1.0.0' 'api-v1.0.0'` still lists the three tags (the evidence); the diff shows only the tick and the footnote.

- [x] 4.3 Verify the archived scope is green (verification task)

  Run `npx openspec validate --archived --no-interactive` from the repo root.

  **Verification:** All 43 archived changes pass (exit 0) — previously 41/43 with exactly these two failures.

---

## Task Group 5 — Docs updates (implementation)

> Surgical and brief. Do NOT run `openspec update` or `openspec init` — these are hand edits.

- [x] 5.1 Replace the CLI-absence blockquote in `AGENTS.md`

  Replace the blockquote at ~line 68 ("The `openspec` CLI is not installed in this repo (`npx openspec` fails), so archiving and delta sync are performed manually...") with a note to the effect of: the CLI (`@fission-ai/openspec`, pinned root devDependency) is installed; archive changes with `npx openspec archive <change> --yes` — it validates the change, merges the delta specs into the canonical specs (merge semantics enforced by the tool), and moves the folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`; the delta↔canonical grammar rules are enforced automatically; the pre-push gate runs `npx openspec validate` twice (`--specs` and `--archived`, as separate fail-fast commands — the CLI cannot combine the scopes).

  **Verification:** The old "not installed / performed manually" text is gone; the new note names the package, the archive command, and the pre-push gate.

- [x] 5.2 Update the "Merge, never overwrite" sentences in `CLAUDE.md` and `.opencode/agents/orchestrator.md`

  In `CLAUDE.md` (~line 29, closing step) and `.opencode/agents/orchestrator.md` (~line 35, closing step): update the sentence so the merge is described as performed by `npx openspec archive <change> --yes` (the tool applies the delta's operations to the canonical spec and leaves it with canonical headings — never a copy-over). Keep it brief; keep the reference to "OpenSpec spec files: delta vs canonical" in `AGENTS.md`.

  **Verification:** Both files mention `npx openspec archive` in their closing/archive step; neither still implies a hand-merge.

- [x] 5.3 Replace the manual archive procedure in the three archive command/skill files

  In `.claude/commands/opsx/archive.md`, `.opencode/command/opsx-archive.md`, and `.opencode/skills/openspec-archive-change/SKILL.md`: replace the manual "Perform the archive" step (mkdir + `mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>`) and the agent-driven delta-sync step with the CLI: `npx openspec archive <name> --yes` — it validates the change first, merges the deltas into the canonical specs, refuses MODIFIED deltas that drop scenarios, and moves the folder to the dated archive location. Keep the pre-checks (change selection, artifact status, task completion); drop the manual mv/sync steps and their prompt options; keep the summary step (archive location + merge result). Keep each edit brief — do not rewrite the whole files.

  **Verification:** None of the three files contains the manual `mv openspec/changes/` procedure or the `openspec-sync-specs` agent-driven sync; each instructs `npx openspec archive <name> --yes`.

- [x] 5.4 Delete the I14 bullet from `ROADMAP.md`

  Delete the `- **I14.**` bullet (line ~241, "Evaluar instalar el CLI de `openspec`..."). Verified beforehand: I14 is the highest Ixx ID (I01–I14, no gaps) and no other `I14` reference exists in `ROADMAP.md` — so NO renumbering and NO cross-reference updates are needed. Update the `**Última actualización:**` date to the implementation date if it differs from the current value.

  **Verification:** `grep -c "I14" ROADMAP.md` returns 0; `grep -oE 'I[0-9]+' ROADMAP.md | sort -u` yields exactly I01–I13 with no gaps.

- [x] 5.5 Verify no stale manual-archive references remain (verification task)

  Search the tracked docs (excluding `openspec/changes/archive/**` — historical records keep their old content — and `node_modules/`) for the manual archive procedure: `mv openspec/changes/`, "archiving and delta sync are performed manually", and `openspec-sync-specs`.

  **Verification:** Zero hits outside the excluded paths; `npx prettier --check` passes on every file edited in this group (repo format:check covers `**/*.md`).

---

## Task Group 6 — Gates (verification)

- [x] 6.1 Run the user-visible gates

  - `npm run lint` — zero errors, zero warnings.
  - `npm run build` — all three projects.
  - `npm run test` — all unit tests pass, zero errors, zero warnings.

  **No E2E** per the SDD criterion: this change has no behavioral surface on app code (developer tooling, hooks, docs, and OpenSpec data only) — the `pre-push-quality-gate` canonical spec's "A no-behavior change skips E2E at validation" scenario applies. E2E coverage remains provided by CI on push.

  **Verification:** All three commands exit 0. No snapshot changes are expected (no app code touched) — if snapshots diff, investigate before proceeding.

---

## Task Group 7 — Archive this change with the CLI (final — only after Group 6 is green)

> The canonical `ci-node-version` fix and the new `openspec-cli` / `pre-push-quality-gate` canonical updates land HERE, via the CLI's delta merge — not by hand-editing canonical files. **The pre-push gate goes fully green only AFTER this archive**: until the merge lands, `validate --specs` still fails on the pre-existing `ci-node-version` issue.

- [x] 7.1 Tick every remaining box in this file, then archive with the CLI

  - First tick every remaining unchecked box in this `tasks.md` — **including this one**. Rationale: `openspec archive` moves the folder as-is; any unchecked box left behind becomes a permanent `validate --archived` failure (the exact class of pre-existing issue Group 4 fixes). Ticking 7.1 records that the archive is executed as the final action of this change.
  - Then run `npx openspec archive add-openspec-cli --yes` from the repo root. Expected: the CLI validates the change, merges the deltas (`openspec-cli` ADDED → new canonical scaffolded; `pre-push-quality-gate` ADDED → requirement appended after the existing ones; `ci-node-version` MODIFIED → the 3 requirements gain SHALL body text in place, scenarios preserved), and moves the folder to `openspec/changes/archive/<archive-date>-add-openspec-cli/`.

  **Verification:**

  - `npx openspec validate --specs --no-interactive` and `npx openspec validate --archived --no-interactive` both exit 0 — the pre-push gate is fully green for the first time.
  - `openspec/specs/openspec-cli/spec.md` exists with canonical grammar (`# openspec-cli Specification` / `## Purpose` / `## Requirements`) and no delta headings.
  - `openspec/specs/pre-push-quality-gate/spec.md` contains the new requirement after the existing ones; the existing requirements are untouched.
  - `openspec/specs/ci-node-version/spec.md` — the 3 requirements now have SHALL body text; the scenarios are unchanged; no delta headings.
  - `sh .husky/pre-push` passes the validate step (branch check → validate → affected tests).

---

## Suggested commits (requires explicit user authorization — do NOT commit without it)

Per the SDD close sequence, the archive (7.1) happens BEFORE the commit, so the archived folder and the canonical merges are part of the same commit set. Suggested atomic split (Commitizen format):

1. `chore(deps): add openspec cli as pinned root devdependency` — `package.json`, `package-lock.json`
2. `feat(tooling): add openspec pre-push gate and fix pre-commit status parser` — `.husky/pre-push`, `.husky/pre-commit`
3. `chore(openspec): complete archived task records with retroactive evidence` — the two archived `tasks.md` files
4. `docs: replace manual openspec archive process with cli` — `AGENTS.md`, `CLAUDE.md`, `.opencode/agents/orchestrator.md`, the three archive command/skill files, `ROADMAP.md`
5. The archive move + canonical merges (7.1) — either folded into commit 4 or its own `chore(openspec): archive add-openspec-cli change via cli`, as approved by the user at the final checkpoint.

**Verification:** `git log --oneline` shows the approved atomic commits; each commit's file set matches its message; all gates pass on the final state.

---

## Definition of Done

- `@fission-ai/openspec` 1.13.2 exact-pinned in root devDependencies; `npx openspec` resolves offline; `npm audit` clean
- `.husky/pre-push` runs `npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1` after the main-branch guard, before the affected-test step; active changes out of scope
- `.husky/pre-commit` parser reads `completedTasks`/`totalTasks`; block stays warning-only
- Both archived `tasks.md` files fully checked with dated retroactive-evidence footnotes; `validate --archived` green (43/43)
- Docs updated (AGENTS.md, CLAUDE.md, orchestrator.md, the three archive command/skill files); ROADMAP I14 deleted with no renumbering
- `npm run lint`, `npm run build`, `npm run test` green with zero warnings; no E2E (no app-code behavioral surface)
- Change archived via `npx openspec archive add-openspec-cli --yes`; canonical specs in canonical grammar; `validate --specs` and `validate --archived` both exit 0
- No changes to `apps/**/src/`, `packages/shared/**`, `.github/workflows/**`, `README.md`, `docs/`
- Commits created only after explicit user authorization
