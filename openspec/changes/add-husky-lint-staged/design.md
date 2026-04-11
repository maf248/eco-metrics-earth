## Context

The monorepo uses npm workspaces + NX v22, with ESLint and Prettier already configured at the root. There are no Git hooks today. The `prepare` npm lifecycle script is the standard mechanism to install Husky after `npm install`, which makes it work for all contributors automatically.

Current relevant config:
- ESLint: root `eslint.config.mjs`, per-project configs extend it
- Prettier: root `.prettierrc`
- Package manager: npm (not pnpm/yarn — important for Husky setup)
- Node: v20 LTS

## Goals / Non-Goals

**Goals:**
- Block commits that contain ESLint errors or unformatted code
- Run checks only on staged files (fast, not full project scan)
- Zero friction for contributors: `npm install` sets up the hook automatically

**Non-Goals:**
- Running tests on pre-commit (too slow)
- Running full builds on pre-commit
- Enforcing commit message format via `commit-msg` hook

## Decisions

### 1. Husky v9 (not v8)

Husky v9 simplifies the hook format — hooks are plain shell scripts in `.husky/`, no special syntax. v8 required a different init command and had a different file format. v9 is the current stable release.

### 2. lint-staged config in `package.json` (not `.lintstagedrc`)

Keeping config in `package.json` under `"lint-staged"` reduces config file sprawl. The project already centralizes config at the root (`.prettierrc`, `eslint.config.mjs`).

### 3. Run Prettier via `--write` (not `--check`) in lint-staged

lint-staged stages the result after running, so using `--write` auto-fixes formatting and includes the fix in the commit. This is the idiomatic pattern — no manual `git add` needed.

### 4. Run ESLint with `--fix` in lint-staged

Same rationale as Prettier: auto-fix safe rules and include the fix. If ESLint finds an unfixable error, the commit is blocked and the developer sees the error message.

### 5. Glob patterns scoped to TS/TSX/JS for ESLint, TS/TSX/JS/JSON for Prettier

Matches the existing `format` script pattern (`**/*.{ts,tsx,js,json}`). JSON files only go through Prettier (ESLint doesn't lint JSON in this project).

## Risks / Trade-offs

- **WSL / Windows path issues** → Husky hooks are shell scripts; they work correctly in WSL with no extra config.
- **`prepare` script skipped in CI** → `npm ci` in CI environments sets `NODE_ENV=production` which skips `prepare`. This is the desired behavior — hooks should only run locally. If CI uses `npm install`, add `HUSKY=0` to CI env to be explicit.
- **Auto-fix modifies files mid-commit** → lint-staged re-stages the fixed files automatically, so the commit includes the fixes. This is expected behavior, not a bug.
