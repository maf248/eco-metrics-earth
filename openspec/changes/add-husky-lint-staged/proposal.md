## Why

The monorepo currently has no automated code quality gates at commit time — a developer can commit code that fails linting, formatting, or type checks without any local feedback. Adding Husky + lint-staged enforces these checks on every commit, keeping the main branch clean and reducing CI failures caused by trivial issues.

## What Changes

- Install and configure **Husky** to manage Git hooks via `.husky/`
- Install and configure **lint-staged** to run scoped checks only on staged files
- Add a `pre-commit` hook that runs lint-staged
- Configure lint-staged to run ESLint + Prettier on staged `.ts`/`.tsx`/`.js`/`.json` files across all projects

## Capabilities

### New Capabilities

- `pre-commit-quality-gate`: Git pre-commit hook that automatically lints and formats staged files before allowing a commit to proceed

### Modified Capabilities

<!-- None — no existing spec-level behavior changes -->

## Non-Goals

- Not adding `commit-msg` hook or Commitizen enforcement at the hook level (already handled by convention)
- Not running the full test suite on pre-commit (too slow; tests run in CI)
- Not running full builds on pre-commit

## Impact

- `package.json` — new `devDependencies` (husky, lint-staged), new `prepare` script, new `lint-staged` config
- `.husky/` — new directory with `pre-commit` hook file
- No changes to app source code, tsconfig, or existing scripts
