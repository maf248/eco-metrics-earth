## ADDED Requirements

### Requirement: ESLint 10 compatibility
The workspace SHALL lint cleanly with `eslint@10.4.0` and `@eslint/js@10.0.1` using the existing flat config (`eslint.config.mjs`).

#### Scenario: Lint passes with no errors or warnings
- **WHEN** `npm run lint` is executed after the ESLint 10 upgrade
- **THEN** the process exits with code 0 and reports zero errors and zero warnings across all three projects

---

### Requirement: TypeScript 6 compatibility
All three projects (`web`, `api`, `shared`) SHALL typecheck and build successfully with `typescript@6.0.3`.

#### Scenario: Build succeeds for all projects
- **WHEN** `npm run build` is executed after the TypeScript 6 upgrade
- **THEN** the process exits with code 0 and all three projects produce their output artifacts without type errors

#### Scenario: No `@ts-ignore` suppressions introduced
- **WHEN** the TypeScript 6 migration is complete
- **THEN** no new `@ts-ignore` or `@ts-expect-error` comments SHALL have been added to any source file

---

### Requirement: reflect-metadata 0.2 compatibility
The API SHALL start and all API tests SHALL pass with `reflect-metadata@0.2.2`.

#### Scenario: API tests pass
- **WHEN** `npx nx test api` is executed after the reflect-metadata upgrade
- **THEN** all API test suites pass with zero errors and zero warnings

---

### Requirement: webpack-cli 7 compatibility
The API build target SHALL complete successfully with `webpack-cli@7.0.2`.

#### Scenario: API production build succeeds
- **WHEN** `npx nx build api` is executed after the webpack-cli upgrade
- **THEN** the build exits with code 0 and the `apps/api/dist/` directory is populated with the compiled output

#### Scenario: API development build succeeds
- **WHEN** `npx nx build api --configuration=development` is executed
- **THEN** the build exits with code 0

---

### Requirement: Unused devDependencies removed
The four unused devDependencies (`ts-jest`, `@nestjs/schematics`, `@nx/web`, `ts-node`) SHALL be removed from the root `package.json`.

#### Scenario: Build, test, and lint still pass after removals
- **WHEN** the four packages are removed and `npm install` is re-run
- **THEN** `npm run build && npm run test && npm run lint` all exit with code 0, confirming no actual usage existed

---

### Requirement: All existing tests continue to pass
The full test suite SHALL remain green after all Phase 2 changes are applied.

#### Scenario: Full test suite passes
- **WHEN** `npm run test` is executed after all upgrades and removals
- **THEN** all 162+ test cases pass with zero failures and zero console errors or warnings
