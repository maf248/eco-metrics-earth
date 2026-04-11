## MODIFIED Requirements

### Requirement: API TypeScript compilation target aligned with NestJS and Webpack

`apps/api/tsconfig.app.json` MUST override the following compiler options to be compatible with NestJS and the Webpack-based build pipeline:

- `"emitDeclarationOnly"` MUST be set to `false` so that JavaScript output is emitted during compilation checks.
- `"module"` MUST be set to `"commonjs"` so that the compiled output uses CommonJS module syntax as required by NestJS and Webpack.
- `"moduleResolution"` MUST be set to `"node"` to align with the CommonJS module format and avoid resolution errors.

Running `tsc --noEmit` on the API project SHALL produce zero errors.

#### Scenario: tsc --noEmit on the API project returns zero errors

- **WHEN** `tsc --noEmit -p apps/api/tsconfig.app.json` is executed
- **THEN** the TypeScript compiler exits with code 0 and reports no errors

#### Scenario: API build produces valid CommonJS output

- **WHEN** `nx build api` is executed
- **THEN** the emitted JavaScript files in `dist/apps/api/` use `require()`/`module.exports` syntax and are loadable by Node.js without module format errors

### Requirement: apps/web/package.json pins Next.js to exact version 16.1.7

`apps/web/package.json` MUST declare `"next": "16.1.7"` as an exact version string — no `~` or `^` prefix is permitted. This version MUST match the `next` version pinned in the root `package.json`, ensuring consistent resolution across the workspace.

#### Scenario: Next.js version is consistent between root and web package.json

- **WHEN** the contents of `package.json` (root) and `apps/web/package.json` are inspected
- **THEN** both files declare `"next": "16.1.7"` with no range qualifier

#### Scenario: npm install resolves a single Next.js version

- **WHEN** `npm install` is executed at the workspace root
- **THEN** only one version of `next` appears in `node_modules` and `package-lock.json` contains no version conflicts for `next`

## ADDED Requirements

### Requirement: @nestjs/config declared as a direct production dependency in apps/api

`apps/api/package.json` MUST list `"@nestjs/config": "4.0.4"` under `dependencies` (not `devDependencies`) as an exact version. This ensures that isolated Railway deployments — which install only the dependencies declared in `apps/api/package.json` — can resolve `@nestjs/config` at startup without falling back to the workspace root and without crashing with a missing-module error.

#### Scenario: API starts successfully in an isolated install environment

- **WHEN** only the dependencies from `apps/api/package.json` are installed (simulating a Railway deploy) and the NestJS application is bootstrapped
- **THEN** the application starts without a `Cannot find module '@nestjs/config'` error and the health endpoint responds with status 200

#### Scenario: @nestjs/config version is pinned exactly

- **WHEN** `apps/api/package.json` is inspected
- **THEN** the `dependencies` field contains `"@nestjs/config": "4.0.4"` with no range qualifier (`~` or `^`)
