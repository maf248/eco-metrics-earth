## ADDED Requirements

### Requirement: Pre-push hook validates OpenSpec canonical specs and archived changes

The `.husky/pre-push` hook SHALL run the two validations as separate fail-fast commands (`npx openspec validate --specs --no-interactive || exit 1` and `npx openspec validate --archived --no-interactive || exit 1`) after the main-branch guard and before the affected-test step, so an invalid OpenSpec state fails fast (~1.5–2 s) ahead of the NX test run. The gate SHALL cover only canonical specs (`--specs`) and archived changes (`--archived`): active/in-progress changes SHALL NOT be validated at push time so mid-spec pushes stay allowed. A non-zero exit of either validate command SHALL block the push.

#### Scenario: Invalid canonical spec blocks the push

- **GIVEN** a canonical spec (`openspec/specs/<capability>/spec.md`) that fails validation, such as a requirement without SHALL or MUST body text
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit non-zero and the push SHALL be blocked before the affected-test step runs

#### Scenario: Archived change with unchecked tasks blocks the push

- **GIVEN** an archived change whose `tasks.md` still has unchecked task boxes
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit non-zero and the push SHALL be blocked

#### Scenario: Valid specs and complete archives pass the gate

- **GIVEN** all canonical specs valid and all archived changes with fully checked tasks
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL exit 0 and the hook SHALL proceed to the affected-test step

#### Scenario: An active mid-spec change does not block the push

- **GIVEN** an active change in `openspec/changes/<name>/` with incomplete artifacts or unchecked tasks
- **WHEN** the pre-push hook runs
- **THEN** the validate step SHALL NOT fail on account of that active change — it is out of the gate's scope — and the push SHALL NOT be blocked by it
