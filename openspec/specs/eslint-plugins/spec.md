# eslint-plugins Specification

## Purpose
TBD - created by archiving change configuration-and-tests. Update Purpose after archive.
## Requirements
### Requirement: ESLint enforces React hooks rules across the web app
`eslint-plugin-react-hooks` SHALL be installed and its recommended rules SHALL be active for all TypeScript and TSX files in `apps/web`.

#### Scenario: Hook called conditionally triggers lint error
- **WHEN** `npm run lint` is run against a file that calls a React hook inside an `if` block
- **THEN** ESLint reports a `react-hooks/rules-of-hooks` error

#### Scenario: Missing hook dependency triggers lint warning
- **WHEN** `npm run lint` is run against a file with a `useEffect` missing a dependency
- **THEN** ESLint reports a `react-hooks/exhaustive-deps` warning

### Requirement: ESLint enforces accessibility rules across web JSX
`eslint-plugin-jsx-a11y` SHALL be installed and its recommended rules SHALL be active for all TSX files in `apps/web`.

#### Scenario: Image without alt attribute triggers lint error
- **WHEN** `npm run lint` is run against a TSX file containing `<img>` without an `alt` attribute
- **THEN** ESLint reports a `jsx-a11y/alt-text` error

### Requirement: ESLint enforces import ordering across all TypeScript files
`eslint-plugin-import` SHALL be installed and the `import/order` rule SHALL be active with groups `['builtin', 'external', 'internal', 'parent', 'sibling', 'index']`. External imports MUST come before workspace imports, which MUST come before relative imports.

#### Scenario: Workspace import before external import triggers lint error
- **WHEN** `npm run lint` is run against a file that imports from `@eco-metrics/shared` before `react`
- **THEN** ESLint reports an `import/order` violation

#### Scenario: Duplicate imports trigger lint error
- **WHEN** `npm run lint` is run against a file with two separate `import` statements from the same module
- **THEN** ESLint reports an `import/no-duplicates` error

#### Scenario: All existing project files pass lint after auto-fix
- **WHEN** `npm run lint -- --fix` is run across the entire workspace
- **THEN** `npm run lint` reports zero errors and zero warnings
