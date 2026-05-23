## ADDED Requirements

### Requirement: App-specific runtime dependencies are not declared in root

The root `package.json` SHALL NOT declare any runtime dependency that belongs exclusively to a single app in the workspace. Runtime dependencies for the API (`apps/api`) and web (`apps/web`) apps MUST be declared only in their respective `package.json` files.

#### Scenario: Root dependencies are workspace-tools only
- **WHEN** inspecting root `package.json` `dependencies`
- **THEN** no `@nestjs/*`, `next`, `react`, `react-dom`, `reflect-metadata`, or `rxjs` packages are present

#### Scenario: API declares its own NestJS dependencies
- **WHEN** inspecting `apps/api/package.json` `dependencies`
- **THEN** `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, and `rxjs` are present with pinned versions

#### Scenario: Web declares its own Next.js and React dependencies
- **WHEN** inspecting `apps/web/package.json` `dependencies`
- **THEN** `next`, `react`, and `react-dom` are present with pinned versions

### Requirement: App-specific dev dependencies are not declared in root

The root `package.json` `devDependencies` SHALL NOT contain test frameworks or type definitions that belong to a single app. App-specific dev dependencies MUST be declared in the app's own `package.json`.

#### Scenario: NestJS testing utilities are in API devDependencies only
- **WHEN** inspecting root `package.json` `devDependencies`
- **THEN** `@nestjs/testing` is NOT present
- **AND** inspecting `apps/api/package.json` `devDependencies` shows `@nestjs/testing` is present

#### Scenario: React type definitions are in web devDependencies only
- **WHEN** inspecting root `package.json` `devDependencies`
- **THEN** `@types/react` and `@types/react-dom` are NOT present
- **AND** inspecting `apps/web/package.json` `devDependencies` shows `@types/react` and `@types/react-dom` are present

### Requirement: Build and test pass after dependency cleanup

After removing app-specific dependencies from root, the workspace SHALL build and pass all tests without errors.

#### Scenario: Full build succeeds
- **WHEN** running `npm run build`
- **THEN** all projects (shared, api, web) compile successfully with zero errors

#### Scenario: All tests pass
- **WHEN** running `npm run test`
- **THEN** all 194+ tests pass with zero errors and zero warnings
