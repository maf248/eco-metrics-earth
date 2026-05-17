# Design: Upgrade to Node.js 24

## Overview

Three categories of files require changes: CI workflows, the local dev version pin, and the `@types/node` devDependency. No production or test code changes are needed.

## Compatibility Assessment

All major dependencies ship 2025 releases with Node 24 prebuild support:

| Package | Version | Status |
|---|---|---|
| `nx` | 22.7.2 | Compatible |
| `next` | 16.2.6 | Compatible (requires Node ≥18.18) |
| `@nestjs/*` | 11.x | Compatible |
| `jest` | 30.4.2 | Compatible |
| `typescript` | 6.0.3 | Compatible (no native bindings) |
| `@swc/core` | 1.15.33 | Compatible (Node 24 prebuild available) |
| `sharp` | 0.34.5 | Compatible (Node 24 prebuild available) |

## Changes

### 1. `.nvmrc`

Change the pinned version from `20` to `24` so `nvm use` resolves to Node 24 locally.

### 2. GitHub Actions workflows

Both `ci.yml` and `release.yml` require three changes each:

- `actions/checkout@v4` → `actions/checkout@v5` (Node 24 action runtime)
- `actions/setup-node@v4` → `actions/setup-node@v5` (Node 24 action runtime)
- `node-version: '20'` → `node-version: '24'`

Upgrading action versions to v5 eliminates the deprecation warning at the action-runner level. Updating `node-version` sets the Node version available to the project's build scripts.

### 3. `package.json` — `@types/node`

Bump `@types/node` from `20.19.39` to `24.12.4` (exact pin, no caret). This keeps TypeScript aware of Node 24 globals and APIs. After the change, `package-lock.json` must be regenerated.

### 4. `README.md`

Update four references from Node 20 to Node 24:
- Tech stack table: version cell and docs link
- Prerequisites section: `v20 LTS` and `Node 20` mentions
- Project structure comment for `.nvmrc`

### 5. `package.json` — `reset` script

The `reset` script used `npm ci`, which in npm ≥10.x fails when the lock file is missing optional platform-specific packages (darwin, win32, arm64 binaries). Because `npm install` on Linux x64 only records Linux x64 optionals, the lock file will always be incomplete from the perspective of `npm ci`'s stricter validation.

Change `npm ci` → `npm install` in the `reset` script. `npm install` handles missing optional entries gracefully and is appropriate for local development resets. CI workflows continue to use `npm ci` on their own runners where the lock file is validated against the runner's platform.

## No risk areas

- No `.tool-versions` or other version pin files exist in the repo.
- No workspace `package.json` files declare an `engines` field, so no secondary updates are required there.
