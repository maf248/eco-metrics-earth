## ADDED Requirements

### Requirement: OpenSpec CLI is installed as a pinned root devDependency

The root `package.json` devDependencies SHALL pin `@fission-ai/openspec` at exactly `1.13.2` (no `^` or `~`), and the `openspec` binary SHALL resolve locally via `npx openspec` after `npm install`, with no network access required. The unrelated bare npm package `openspec` (a 0.0.0 placeholder) SHALL NOT be installed.

#### Scenario: Fresh install resolves the CLI offline

- **GIVEN** the repository with `@fission-ai/openspec` 1.13.2 in root devDependencies and `npm install` completed
- **WHEN** `npx openspec --version` (or `npx openspec list`) is run with no network access
- **THEN** the locally installed binary SHALL answer without downloading anything

#### Scenario: The pin is exact

- **WHEN** the root `package.json` devDependencies are read
- **THEN** `"@fission-ai/openspec": "1.13.2"` SHALL appear with no `^` or `~` range, and no app-level `package.json` SHALL declare it

---

### Requirement: Changes are archived with the OpenSpec CLI

Completed changes SHALL be archived with `npx openspec archive <change> --yes`, which validates the change, merges its delta specs into the canonical specs (`openspec/specs/<capability>/spec.md`), and moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`. The manual process (`mv` plus hand-merge of deltas) is deprecated. The merge SHALL leave canonical specs in canonical grammar — no `## ADDED Requirements`, `## MODIFIED Requirements`, or `## REMOVED Requirements` headings may leak into a canonical file — and requirements the delta did not touch SHALL be left untouched. The archive SHALL refuse a MODIFIED delta whose block omits scenarios the canonical spec still has, and nothing SHALL be archived or merged when validation fails.

#### Scenario: Archive reports the merge and moves the folder

- **GIVEN** a completed change with delta specs and all tasks checked
- **WHEN** `npx openspec archive <change> --yes` runs from the repository root
- **THEN** the command SHALL validate the change, report the merge totals (requirements added and modified per capability), and move the folder to `openspec/changes/archive/YYYY-MM-DD-<change>/`

#### Scenario: Canonical specs keep canonical grammar after archive

- **WHEN** a canonical spec (`openspec/specs/<capability>/spec.md`) is read after an archive merged an ADDED or MODIFIED delta into it
- **THEN** the file SHALL keep its `# <capability> Specification` / `## Purpose` / `## Requirements` shape with no delta headings, and requirements the delta did not touch SHALL be unchanged

#### Scenario: A scenario-dropping MODIFIED delta is rejected

- **GIVEN** a change whose MODIFIED delta block omits a scenario that the current canonical spec still has
- **WHEN** `npx openspec archive <change> --yes` runs
- **THEN** the archive SHALL be refused with an error and nothing SHALL be archived or merged

---

### Requirement: Pre-commit hook reports OpenSpec change status from the installed CLI

The warning-only OpenSpec status block in `.husky/pre-commit` SHALL read `completedTasks` and `totalTasks` from `openspec list --json` output (the `@fission-ai/openspec` 1.13.2 field names) and SHALL never block a commit: any failure in the block, including missing or malformed CLI output, SHALL leave the commit proceeding.

#### Scenario: Pending tasks produce an informational warning only

- **GIVEN** an active change with pending tasks
- **WHEN** the pre-commit hook runs
- **THEN** the block SHALL print the informational "Open specs with pending tasks" warning with the change's real completed/total task counts, and the commit SHALL proceed

#### Scenario: Completed-but-not-archived changes produce the archive hint

- **GIVEN** an active change with all tasks complete
- **WHEN** the pre-commit hook runs
- **THEN** the block SHALL print the "Specs completed but NOT archived" warning with the archive hint, and the commit SHALL proceed

#### Scenario: The block never blocks a commit

- **WHEN** the pre-commit hook runs in any repository state, including no active changes, malformed CLI output, or CLI failure
- **THEN** the block SHALL NOT cause a non-zero exit of the hook
