# Design: Upgrade NX 22 → 23

## Overview

This is a toolchain maintenance change: move the monorepo from NX 22.7.x to NX 23.2.1 (latest stable, exact pin) using the official `nx migrate` flow, resolve the small number of breaking changes that actually touch this workspace, and prove nothing regressed via the full validation suite. No product code changes.

### Current → target versions (root `package.json`, all exact pins)

| Package | Current | Target |
|---|---|---|
| `nx` | 22.7.2 | 23.2.1 |
| `@nx/devkit` | 22.7.3 | 23.2.1 |
| `@nx/jest` | 22.7.2 | 23.2.1 |
| `@nx/js` | 22.7.2 | 23.2.1 |
| `@nx/nest` | 22.7.2 | 23.2.1 |
| `@nx/next` | 22.7.2 | 23.2.1 |
| `@nx/node` | 22.7.2 | 23.2.1 |
| `@nx/playwright` | 22.7.3 | 23.2.1 |
| `@nx/react` | 22.7.2 | 23.2.1 |
| `@nx/webpack` | 22.7.2 | 23.2.1 |

NX first-party packages are released in lockstep and must all match (`nx@23.2.1` + `@nx/js@23.2.1`, etc.). `23.2.1` is chosen over `23.3.0-beta.0` (beta) and over `latest` (non-deterministic across time). Note: one NX advisory is fixed exactly at `23.2.1` (vulnerable range includes `23.2.0-rc.2`), so `23.2.0` must not be used.

## NX 23 breaking changes — what affects this workspace

Researched from the [Nx 23 release post](https://nx.dev/blog/nx-23-release), the [Nx 23.1 release post](https://nx.dev/blog/nx-23-1-release), the [nx 23.0.0 release notes](https://github.com/nrwl/nx/releases/tag/23.0.0), and the [`nx migrate` CLI reference](https://nx.dev/nx-api/nx/documents/nx-migrate).

### Affects us — must handle

1. **`withNx` / `composePlugins` from `@nx/next` are deprecated and warn in v23** ([Nx 23 release post — Deprecations](https://nx.dev/blog/nx-23-release)). `apps/web/next.config.ts` uses both, plus the `WithNxOptions` type from the `@nx/next/plugins/with-nx` deep path. There is **no codemod** — this is a manual edit. The repo's zero-warning policy makes this fix mandatory, not optional.
   - **Migration:** drop the `composePlugins(withBundleAnalyzer, withNx)(baseConfig)` wrapper and export the plain Next.js config; keep `withBundleAnalyzer` (from `@next/bundle-analyzer`, unaffected); **add `transpilePackages: ['@eco-metrics/shared']` explicitly** — today `withNx` adds workspace packages to `transpilePackages` automatically (see the comment in `next.config.ts` explaining that `packages/shared` uses `moduleResolution: "bundler"` and relies on this for Turbopack HMR). Removing `withNx` without adding `transpilePackages` would break dev-mode HMR and possibly prod builds for the shared package. Everything else (`trailingSlash: true`, CSP/security headers, analyzer toggle) stays byte-identical.
2. **Stricter package exports** — `@nx/*/src/*` deep imports now sit behind `@nx/*/internal`. A repo-wide grep found **zero** `@nx/*/src/*` deep imports; all `@nx` imports use public entry points (`@nx/jest/preset`, `@nx/jest`, `@nx/devkit`, `@nx/playwright/preset`, `@nx/webpack/app-plugin`, `@nx/next`). The `@nx/next/plugins/with-nx` type import disappears with fix #1. No action beyond the migrations' automatic rewrites.

### Verified as not affecting us

| Breaking change | Why it does not apply |
|---|---|
| Node 20 dropped (min Node 22) | Workspace runs Node 24.15.0 (`.nvmrc` = 24); `@types/node` already 24.12.4 |
| Removed generators (`setup-tailwind`, `js` option, stylesheet options, `@nx/angular:*`) | None used; the only generator defaults are `@nx/next.application` (`style: "none"`, `linter: "eslint"`) in `nx.json` — `"none"` is not a removed stylesheet option. Migrations may normalize this block; accepted. |
| `vitest` removed from `@nx/vite`; SVGR removed from `@nx/rspack`; legacy TS plugin removed from `@nx/rollup`; `@nx/angular/module-federation` entry point removed | `@nx/vite`, `@nx/rspack`, `@nx/rollup`, `@nx/angular` are not direct dependencies and none of these entry points are imported |
| Flat `releaseTagPattern`/`releaseTagPrefix` removed from `nx.json` release config | Workspace has **no** `release` config in `nx.json` — versioning is handled by semantic-release, not `nx release` |
| `nx watch --includeDependentProjects` renamed to `--includeDependencies` | No script or CI step uses `nx watch` |
| `setupFile`/`skipSetupFile` jest options removed | Tests run through the `@nx/jest/plugin` inference plugin + per-project `jest.config.cjs`, not the `@nx/jest:jest` executor |
| `initTasksRunner` API removed; `createNodesV2` renamed; `addProjectConfiguration` `standalone` deprecated | No custom NX plugins, generators, or devkit automation exist in the repo |
| Executors deprecated in favor of inferred plugins (`@nx/jest:jest`, `@nx/webpack:webpack`, `@nx/next:build`, `@nx/eslint:lint`, `@nx/playwright:playwright`, …) | Workspace already uses the inference plugins everywhere (see proposal Impact). The only executors in use are `nx:run-commands` (web `typecheck`/`analyze`, api `build`) and `@nx/js:prune-lockfile` (api) — neither is on the deprecated list. `apps/api/webpack.config.js` already uses the modern `NxAppWebpackPlugin` class. |
| `dependsOn` magic strings `'self'`/`'dependencies'` now warn | `nx.json` uses the caret form (`"^build"`), not magic strings |
| ESLint v8 support deprecated (23.0) then dropped (23.1) | Workspace is on ESLint `10.10.0`; `@nx/eslint@23.2.1` peer range is `^9.0.0 \|\| ^10.0.0` — compatible |
| TypeScript 6 support (23.1) | TS stays `5.9.3` (non-goal). NX 23.1 explicitly supports staying on older TypeScript. The 23.1 "post-upgrade typecheck" step is a prompt-based migration — skipped in non-interactive runs and listed for manual execution; since TS does not change, it is a no-op here. |
| Angular 19 dropped (23.1) | No Angular |

### Peer-dependency compatibility (verified against npm registry)

- `@nx/next@23.2.1` peers: `next >=14.0.0 <17.0.0` (have `16.3.4` ✓), `@nx/webpack 23.2.1` (lockstep ✓)
- `@nx/eslint@23.2.1` peers: `eslint ^9 || ^10` (have `10.10.0` ✓)
- `@nx/jest@23.2.1` peers: `jest ^29 || ^30` (have `30.4.2` ✓), `ts-jest ^29` (have `29.4.9` ✓)

`.npmrc` has `legacy-peer-deps=true` (I07, for `eslint-plugin-jsx-a11y`), so even a stale peer range would not block installation — but no such conflict is expected.

## Migration strategy

Work happens on a `feature/upgrade-nx-23` branch off `develop` (rollback = delete/revert the branch; NX 22 remains in LTS until at least April 2027, so reverting is safe).

```bash
# 0. Baseline (before touching anything)
npm audit --json > audit-baseline.json   # record: 76 (5 critical, 56 high, 13 moderate, 2 low)

# 1. Generate the migration (runs the currently installed nx 22.7.2)
npx nx migrate nx@23.2.1                 # pinned exact target — NOT 'latest'

# 2. Review migrations.json — PRUNE before running
#    Remove any optional migration that violates the non-goals:
#    - TypeScript bumps (stay on 5.9.3)
#    - Next.js / React version bumps (stay on 16.3.4 / 19.3.0)
#    - anything else that changes app runtime behavior beyond NX's own needs

# 3. Run the migrations (installs packages first, then executes)
npx nx migrate --run-migrations
#    Fallback if the automatic install hits peer conflicts:
#    npx nx migrate --run-migrations --skip-install && npm install

# 4. Verify version pins are exact (no ^ or ~) and all match 23.2.1
# 5. Manual fix: apps/web/next.config.ts (see breaking change #1 above)
# 6. npx nx repair   # sanity check — should report nothing to fix
# 7. Delete migrations.json once all migrations have run and been validated
```

**Why manual `migrations.json` review instead of the `--include=required` flag:** the required/optional migration split and the `--include` flag are NX 23 features; the *collection* step (`nx migrate nx@23.2.1`) executes with the currently installed NX 22.7.2, which cannot filter NX 23's optional-update metadata. Reviewing and pruning the generated `migrations.json` by hand is the deterministic equivalent and gives the reviewer full visibility. The *execution* step (`--run-migrations`) does run under NX 23.2.1 after install.

**Non-interactive execution:** NX 23's agentic migrate features activate in interactive terminals. Run non-interactively (as @coder will), prompt-based migrations are skipped and listed at the end — that output must be read; anything relevant (other than the TS typecheck prompt, a no-op here) is handled manually.

**Cache:** the upgrade changes hashing-relevant tooling; run `npx nx reset` after the migration to clear stale daemon/cache state before validating.

## Security outcome — audit baseline and expectation

### Baseline (verified 10 Sep 2026)

`npm audit`: **76 vulnerabilities — 5 critical, 56 high, 13 moderate, 2 low.**

### What the NX 23 upgrade eliminates (evidence)

- **Advisories against `@nx/*` packages themselves** — vulnerable range `20.8.0-beta.0 - 22.7.6` (all 22.x); fixed in 23.x. One additional NX advisory is fixed exactly at `23.2.1`.
- **`nx@22.7.2` vulnerable direct pins** — `axios 1.16.0`, `tmp 0.2.4`, `yaml 2.8.0`, `form-data 4.0.5`, `brace-expansion 5.0.5`. `nx@23.2.1` ships `axios 1.18.1`, `tmp 0.2.7`, `yaml 2.9.0`, `form-data 4.0.6`, `brace-expansion 5.0.9`.
- **`@nx/webpack@22.7.2` chain** — depends on `webpack-dev-server ^5.2.1` (advisories ≤5.2.6, plus its `sockjs`, `websocket-driver`, `http-proxy-middleware`, `launch-editor`, `uuid` transitives) and `less <4.6.0` (→ `image-size`). **`@nx/webpack@23.2.1` removes `webpack-dev-server` from its dependencies entirely** and widens `less` to `<4.9.0`.
- **`@module-federation/*` subtree** (6 vulnerable packages: `cli`, `dts-plugin`, `enhanced`, `manifest`, `node`, `rspack` — pulling `undici`, `ws`, `adm-zip`, `@xhmikosr/decompress`, `immutable`, `fast-uri`, `ip-address`, `piscina`) — replaced wholesale by the 23.2.1 tree.
- **`@nx/web`/`@nx/js` chain** — `svgo`, `@babel/core`, `browserslist`, `baseline-browser-mapping`, `picomatch` copies resolved by the new tree.
- `npm audit`'s own `fixAvailable` for `smol-toml` (≤1.7.0) and `brace-expansion` is **`@nx/webpack@23.2.1` (semver-major)** — i.e. this change is the fix npm recommends.

### Expected remaining (out of scope, with owners)

| Family | Advisories | Fix path | Owner |
|---|---|---|---|
| `@nestjs/platform-express` → `multer` (+ `express`, `qs`, `body-parser`) | ~5 high | `@nestjs/platform-express@11.2.3` patch | D2 |
| `@nestjs/swagger` → `js-yaml` | ~8 high | `@nestjs/swagger@11.4.7` patch | D2 |
| `semantic-release` subtree → `npm`, `@npmcli/*`, `libnpm*`, `pacote`, `sigstore`, `@sigstore/*`, `tar` | ~9–13 incl. criticals | semantic-release 25 batch | D4 |
| `concurrently` → `shell-quote` | 2 critical | `concurrently@10` | D4 |
| `postcss` (direct dep `8.5.14`, vulnerable ≤8.5.22) | 2 high | `postcss@8.5.28` patch | Open question — see below |

**Expectation:** the full `nx` / `@nx/*` / `@module-federation/*` block (~45–50 of the 76 advisories) is eliminated; the remainder (~25–30) is confined to the NestJS, release-tooling, and postcss families above. Exact post-migration counts are recorded as a task deliverable — the acceptance criterion is "zero advisories whose fix path routes through an NX-family package", not a specific total. If any NX-subtree advisory unexpectedly persists (e.g. a still-vulnerable `smol-toml` pin inside `nx@23.2.1`), add a root `package.json` `overrides` entry pinning the fixed version — the repo already uses this pattern (`chokidar`, `readdirp`).

## Validation gates (all must pass, zero errors and zero warnings)

1. `npx nx reset` (clean cache/daemon state after toolchain swap)
2. `npm run lint` — all projects, zero warnings (catches ESLint plugin incompatibilities)
3. `npm run build` — `shared` (tsc), `api` (webpack via `NxAppWebpackPlugin`), `web` (Next) all compile; **build logs contain no NX deprecation warnings** (proves the `withNx` removal was complete)
4. `npm run test` — 279 unit tests (221 web + 50 api + 8 shared), zero errors/warnings, coverage thresholds untouched
5. `npm run typecheck` — TS 5.9.3 still type-checks under NX 23's task graph
6. `npm run e2e` — full Playwright suite (49 specs, 5 browsers) — proves the Next dev/prod server pipeline and `@nx/playwright` preset (`nxE2EPreset`) work end-to-end
7. `npm run dev` — both apps boot in parallel (web on 3000 with working HMR for `@eco-metrics/shared` via the new explicit `transpilePackages`; api on 3001)
8. `npx nx run web:analyze` — bundle-analyzer path still works (it routes through `nx build web -- --webpack`; verify the flag still resolves in NX 23, document if not)
9. `npm audit` — record final counts; verify no advisory remains whose fix path routes through `nx`/`@nx/*`/`@module-federation/*`
10. Vercel build compatibility — `vercel.json` runs `npx nx build web --prod` with `npm ci`; the PR's Vercel preview deploy (automatic from `develop`) is the live proof

## Commit strategy (Commitizen, one logical change per commit — only with explicit user authorization)

1. `chore(deps): migrate nx toolchain to 23.2.1` — root `package.json`, `package-lock.json`, `nx.json`, and any other files touched by the migrations
2. `chore(web): replace deprecated withNx helper with explicit transpilePackages` — `apps/web/next.config.ts`
3. `docs: update tech stack versions for nx 23` — `README.md`, `AGENTS.md`, `ROADMAP.md`

`nx migrate --create-commits` is deliberately **not** used: it would create one commit per migration with a generic prefix, violating the repo's atomic, human-reviewed commit convention.

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Optional migration bumps TS/Next/React despite non-goals | Medium | Mandatory manual `migrations.json` review + prune before `--run-migrations` |
| `withNx` removal breaks `packages/shared` transpilation in dev | Medium | Explicit `transpilePackages: ['@eco-metrics/shared']`; verified by gate 7 (HMR) and gate 6 (E2E) |
| Peer-dep conflict during install | Low | All peer ranges verified compatible; `legacy-peer-deps=true` already active; `--skip-install` + manual `npm install` fallback documented |
| Residual NX-subtree advisory (e.g. `smol-toml`) | Low | Post-migration audit check + `overrides` pin pattern (existing precedent) |
| Prompt-based migrations skipped non-interactively | Certain (by design) | Read the skipped-migrations list printed by `--run-migrations`; only the TS typecheck prompt is expected, and TS is not changing |
| Stale NX cache produces false green/red results | Low | `npx nx reset` before validating |
| Vercel preview build fails on `npx nx build web --prod` | Low | Caught automatically by the PR's Vercel integration before merge; NX 23 supports Node 24 and next 16 |
| Rollback needed | Low | Branch-based; revert `feature/upgrade-nx-23`; NX 22 is still LTS (supported until at least April 2027) |

## Node 24 / npm workspaces compatibility notes

- NX 23 requires Node ≥ 22; the workspace pins Node 24 (`.nvmrc`), and NX 23 itself bumped its `@types/node` to the 24 line — already in place here (`@types/node@24.12.4`).
- npm workspaces: `nx migrate` edits the root `package.json` only (all NX-family deps live at the root; per-app `package.json` files have no `@nx/*` deps). The lockfile regeneration is a single `npm install` at the root — no workspace-specific caveats beyond the existing `legacy-peer-deps` and the `reset` script's use of `npm install` (already correct for optional platform packages).
- CI uses `npm ci` — the regenerated `package-lock.json` must be committed in the same commit as the `package.json` version changes, or CI fails lockfile-integrity checks.
