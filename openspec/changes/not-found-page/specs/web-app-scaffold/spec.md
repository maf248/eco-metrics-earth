## ADDED Requirements

### Requirement: apps/web tsconfig omits output-related compiler options

`apps/web/tsconfig.json` SHALL NOT include `rootDir`, `outDir`, `tsBuildInfoFile`, or `incremental` in `compilerOptions`. These options are irrelevant for a `noEmit: true` Next.js app and cause compile errors when workspace path aliases resolve to files outside the `src/` directory.

#### Scenario: Production build succeeds with workspace path aliases

- **WHEN** `nx build web` is executed
- **THEN** TypeScript does not report a "File is not under rootDir" error for `@eco-metrics/shared` imports, and the build completes successfully

#### Scenario: tsconfig has no rootDir

- **WHEN** `apps/web/tsconfig.json` is inspected
- **THEN** the `compilerOptions` object does not contain a `rootDir` key
