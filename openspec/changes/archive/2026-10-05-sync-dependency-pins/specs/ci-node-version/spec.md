## MODIFIED Requirements

### Requirement: TypeScript types match the runtime

The installed `@types/node` version SHALL match the Node.js 24 runtime major version.

#### Scenario: TypeScript types match the runtime

- **GIVEN** the project runs on Node.js 24
- **WHEN** TypeScript resolves `@types/node`
- **THEN** the installed version is a `24.x` release, pinned exactly (no `^`/`~`) in the root `package.json`
- **AND** `npm run typecheck` exits with code 0
