# Tasks: Upgrade to Node.js 24

## T1 — Update `.nvmrc`

- [x] Change content from `20` to `24`

## T2 — Update `ci.yml`

- [x] `actions/checkout@v4` → `actions/checkout@v5`
- [x] `actions/setup-node@v4` → `actions/setup-node@v5`
- [x] `node-version: '20'` → `node-version: '24'`

## T3 — Update `release.yml`

- [x] `actions/checkout@v4` → `actions/checkout@v5`
- [x] `actions/setup-node@v4` → `actions/setup-node@v5`
- [x] `node-version: '20'` → `node-version: '24'`

## T4 — Update `package.json`

- [x] `@types/node`: `"20.19.39"` → `"24.12.4"` (exact pin)

## T5 — Fix `reset` script in `package.json`

- [x] Change `npm ci` → `npm install` in the `reset` script
- [x] Rationale: npm ≥10.x `npm ci` fails when lock file is missing optional platform packages (darwin/win32/arm64); `npm install` handles this gracefully for local dev

## T6 — Regenerate `package-lock.json`

- [x] Run `npm install` from the repo root to update the lockfile

## T8 — Update `README.md`

- [x] Tech stack table: `20.x` → `24.x`, update docs link to `latest-v24.x`
- [x] Prerequisites: `v20 LTS` → `v24 LTS`
- [x] Prerequisites: `Node 20` → `Node 24`
- [x] Project structure comment: `Node.js v20` → `Node.js v24`

## Definition of Done

- [x] `nvm use` resolves to Node 24 locally
- [x] CI workflow runs without Node 20 deprecation warnings
- [x] `npm run reset && npm install` completes without errors
- [x] `npm run dev:local` starts both apps successfully
