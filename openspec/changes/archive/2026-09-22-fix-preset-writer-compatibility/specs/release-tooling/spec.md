## MODIFIED Requirements

### Requirement: Release tooling dependency hygiene

The root `package.json` devDependencies SHALL pin the release/commit toolchain at exact versions with no `^` or `~` ranges, and SHALL NOT contain unused release dependencies.

#### Scenario: Exact pins at the current versions

- **WHEN** the root `package.json` devDependencies are read
- **THEN** the release/commit toolchain SHALL be pinned exactly at `semantic-release` 25.0.9, `@commitlint/cli` 21.2.3, `@commitlint/config-conventional` 21.2.3, `lint-staged` 17.5.1, `concurrently` 10.0.5, `@semantic-release/changelog` 7.0.0, `@semantic-release/git` 11.0.1, and `conventional-changelog-conventionalcommits` 9.3.1, with `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, and `husky` 9.1.7
- **AND** no release/commit toolchain entry SHALL use a `^` or `~` range
- **AND** the nested `conventional-changelog-conventionalcommits` 10.x installed under `@commitlint/config-conventional` (which declares `^10.0.0`) SHALL be expected and unaffected — commitlint's usage is parser-only (no rendering); each consumer resolves its supported major

#### Scenario: semantic-release-monorepo is absent

- **WHEN** the root `package.json` and all release configuration files are inspected
- **THEN** `semantic-release-monorepo` SHALL NOT appear in devDependencies and no release config SHALL reference it (via `extends` or otherwise)

---

## ADDED Requirements

### Requirement: Preset/writer compatibility for release-notes rendering

The installed `conventional-changelog-conventionalcommits` major SHALL be one that renders through the `conventional-changelog-writer` major shipped by the installed `@semantic-release/release-notes-generator` (today: ccc 9.x with writer 8.x). The `generateNotes` step of every release stream SHALL complete without preset/writer version errors.

#### Scenario: generateNotes renders for the root stream

- **WHEN** `@semantic-release/release-notes-generator` 14.1.1 `generateNotes` runs with the root config's `writerOpts` against a commit range containing a `fix`/`feat` commit
- **THEN** the notes SHALL render (Markdown with compare links) with no "Missing helper" / writer-version error

#### Scenario: App streams' note filtering still renders

- **WHEN** `generateNotes` runs with a web/api config shape (`writerOpts` transform + `ALLOWED_SCOPES`)
- **THEN** other-app and excluded-scope commits SHALL be excluded from the notes, own-scope and unscoped commits SHALL appear, and the notes SHALL render with no "Missing helper" / writer-version error

#### Scenario: Re-upgrade guard

- **WHEN** the release tooling is upgraded in the future
- **THEN** the `conventional-changelog-conventionalcommits` major SHALL only move past 9 if the installed `@semantic-release/release-notes-generator` depends on `conventional-changelog-writer` ^9 or newer (verified via `npm ls conventional-changelog-writer`), and the dry-run verification SHALL reach the `generateNotes` step
