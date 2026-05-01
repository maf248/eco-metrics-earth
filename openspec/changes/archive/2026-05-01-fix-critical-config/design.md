## Context

A configuration audit identified six defects across `nx.json`, `apps/api/tsconfig.app.json`, `apps/web/package.json`, `apps/api/package.json`, and `apps/api/webpack.config.js`. None affect runtime behavior in the Webpack-based happy path, but they silently break NX cache invalidation, the `tsc --noEmit` typecheck target, and the Railway production deploy pipeline.

All fixes are limited to configuration files. No source logic, test suites, or CI/CD pipeline definitions are modified.

## Goals / Non-Goals

**Goals:**

- Correct the six identified configuration defects so that lint cache invalidation, typecheck, build output, version pins, and isolated deploys all work correctly.

**Non-Goals:**

- No behavior changes to the running application.
- No new features, endpoints, pages, or components.
- No rewrites of existing test suites.
- No structural refactors of the monorepo or module layout.
- No dependency upgrades beyond the Next.js exact-pin correction in `apps/web/package.json`.

## Decisions

### Decision 1 — nx.json lint inputs

**Change:** Replace `"{workspaceRoot}/.eslintrc.json"` and `"{workspaceRoot}/.eslintignore"` with `"{workspaceRoot}/eslint.config.mjs"`.

**Why:** The project uses ESLint flat config (`eslint.config.mjs`). The two files currently listed in the lint inputs do not exist and were never created. NX cache invalidation for the lint target is keyed on the declared input files — because the declared files are absent, the cache is never invalidated when the actual ESLint config changes, causing stale lint results to be silently served. Tracking the real config file is the minimal, correct fix.

---

### Decision 2 — API tsconfig: emitDeclarationOnly

**Change:** Add `"emitDeclarationOnly": false` to `apps/api/tsconfig.app.json`.

**Why:** The root `tsconfig.base.json` sets `"emitDeclarationOnly": true` to support the `packages/shared` library, which must publish only `.d.ts` files. The API is a runnable application, not a library — it must emit full JS output. Without this override, `tsc --noEmit` on the API target behaves as a no-op (it only emits declaration files and skips real type-checking output). The fix is applied at the app level to avoid touching the base config, which must remain correct for the shared package.

---

### Decision 3 — API tsconfig: module resolution

**Change:** Override `"module": "commonjs"` and `"moduleResolution": "node"` in `apps/api/tsconfig.app.json`.

**Why:** The root `tsconfig.base.json` sets `"module": "nodenext"` and `"moduleResolution": "nodenext"`, which require extension-explicit relative imports (e.g., `'./app.service.js'`). All API source files use extension-less imports (`'./app.service'`), which is valid for CommonJS but not for NodeNext. Webpack resolves these correctly at build time, masking the issue — but `tsc --noEmit` reports errors. Rather than rewriting every import across the API source tree, the tsconfig is overridden to match the actual compilation target: NestJS 11 + Webpack compiles to CommonJS.

Alternative considered: `"moduleResolution": "bundler"` — rejected because `bundler` resolution is designed for tools that control module resolution end-to-end (Vite, esbuild). NestJS uses Webpack only for output bundling; its module loading at runtime is CommonJS. Using `bundler` would misrepresent the runtime semantics.

---

### Decision 4 — apps/web/package.json Next.js pin

**Change:** `"next": "~16.1.6"` → `"next": "16.1.7"`.

**Why:** Project policy requires exact version pins — no `~` or `^`. The `~16.1.6` range both violates this rule and diverges from the root workspace pin of `16.1.7`, creating a risk of version mismatch between dev and production installs. The fix aligns `apps/web/package.json` with the root.

---

### Decision 5 — @nestjs/config in apps/api/package.json

**Change:** Add `"@nestjs/config": "4.0.4"` to the `dependencies` in `apps/api/package.json`.

**Why:** `@nestjs/config` is currently declared only in the root `package.json`. In the local monorepo, npm workspace hoisting makes it available. Railway deploys the API in isolation using only the project-level `package.json` — root hoisting does not apply. Without this entry, the API crashes at startup with `Cannot find module '@nestjs/config'`. Adding it to the app manifest is the correct fix; it has no adverse effect on local development.

---

### Decision 6 — webpack.config.js generatePackageJson

**Change:** `generatePackageJson: false` → `generatePackageJson: true`.

**Why:** The NX `prune-lockfile` and `copy-workspace-modules` targets in the API project read `dist/package.json` to produce a pruned lockfile for production deploys. With `generatePackageJson: false`, that file is never written and the Railway deploy pipeline fails at the pruning step.

Alternative considered: removing `prune-lockfile` and `copy-workspace-modules` from the pipeline — rejected because those targets are the mechanism for production isolation. Removing them would mean shipping the full monorepo lockfile and node_modules to Railway, which is not viable. Enabling `generatePackageJson: true` is the correct, minimal fix.

## Risks / Trade-offs

- **Build time:** Enabling `generatePackageJson: true` means every `nx build api` regenerates `dist/package.json`. This is a minor, acceptable cost.
- **Hidden type errors:** Changing `module`/`moduleResolution` to `commonjs`/`node` in the API tsconfig may surface type errors that were previously masked by NodeNext's stricter rules. These errors reflect real issues and must be fixed at the source, not suppressed.
- **No migration required:** All changes are local to config files. There are no runtime behavior changes in the development happy path, no database migrations, and no breaking changes to the API contract.
