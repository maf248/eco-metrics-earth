# fix-critical-config

## Why

A configuration audit identified six defects that silently break tooling, typecheck, and the Railway production deployment pipeline. None of them affect runtime behavior in the happy path (Webpack-based builds mask most issues), but they cause real failures in CI, isolated deploys, and during incremental cache validation:

1. **nx.json lint inputs reference non-existent files.** The `lintFilePatterns` inputs list `.eslintrc.json` and `.eslintignore`, which were never created — the project uses a flat config (`eslint.config.mjs`). NX therefore never invalidates the lint cache when the ESLint config changes, so stale lint results are silently served from cache.

2. **`emitDeclarationOnly: true` leaks into the API typecheck target.** `apps/api/tsconfig.app.json` inherits from the root `tsconfig.base.json`, which sets `emitDeclarationOnly: true`. When NX runs `tsc --noEmit` for the API, the flag causes `tsc` to emit only `.d.ts` files and skip real output, rendering the typecheck target effectively a no-op.

3. **API source files use extension-less relative imports under `nodenext` resolution.** The root `tsconfig.base.json` sets `module: nodenext` and `moduleResolution: nodenext`. The Node16/NodeNext spec requires explicit file extensions in relative imports (e.g., `'./app.service.js'`). All API source files omit extensions (`'./app.service'`), which makes `tsc --noEmit` report errors even though the Webpack bundler resolves them correctly.

4. **`apps/web/package.json` pins Next.js with a `~` range.** The project rule requires exact version pins (no `^` or `~`). `"next": "~16.1.6"` both violates this rule and diverges from the root workspace pin `"next": "16.1.7"`, risking a version mismatch between dev and production installs.

5. **`@nestjs/config` is missing from the API's local `package.json`.** The package is declared only in the root `package.json`. Railway's isolated deploy installs only the project-level manifest, so the API would crash at startup in production with a `Cannot find module '@nestjs/config'` error.

6. **`webpack.config.js` disables `generatePackageJson` while deploy targets depend on it.** The NX `prune-lockfile` and `copy-workspace-modules` targets expect a `dist/package.json` to exist after the build step. With `generatePackageJson: false`, that file is never written and the Railway deploy pipeline fails.

---

## What Changes

- **nx.json** — replace the two non-existent lint input file references (`.eslintrc.json`, `.eslintignore`) with the actual flat config file (`eslint.config.mjs`).
- **apps/api/tsconfig.app.json** — override `emitDeclarationOnly` to `false` so that the API's typecheck target runs correctly.
- **apps/api/tsconfig.app.json** — override `module` and `moduleResolution` to `commonjs` (or `bundler`) so that extension-less relative imports are valid and `tsc --noEmit` passes without requiring import rewrites across the entire API source tree.
- **apps/web/package.json** — change `"next": "~16.1.6"` to the exact pin `"next": "16.1.7"` to match the root workspace and satisfy the pin-exact rule.
- **apps/api/package.json** — add `"@nestjs/config"` as an exact-pinned dependency so Railway isolated deploys include it.
- **apps/api/webpack.config.js** — set `generatePackageJson: true` so the post-build deploy targets find `dist/package.json` as expected.

---

## Non-Goals

- No behavior changes to the running application.
- No new features, endpoints, pages, or components.
- No rewrites of existing test suites.
- No structural refactors of the monorepo or module layout.
- No changes to CI/CD pipeline definitions beyond what the config fixes implicitly repair.
- No upgrades of NX, Next.js, NestJS, or any other dependency beyond the version-pin correction for Next.js in `apps/web/package.json`.

---

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`nx-workspace`** (`openspec/specs/nx-workspace/`) — the NX workspace configuration spec is affected by the `nx.json` lint input correction and the `generatePackageJson` flag change in the API webpack config.
- **`api-app-scaffold`** (`openspec/specs/api-app-scaffold/`) — the API TypeScript configuration and `package.json` changes fall within the API scaffold spec.

---

## Impact

All six fixes are purely additive corrections to configuration files. No source logic changes. The expected outcome after applying this change:

- `npx nx affected --target=lint` correctly invalidates cache when `eslint.config.mjs` is modified.
- `npx nx typecheck api` (or equivalent `tsc --noEmit` run) exits with zero errors.
- `npx nx build api` produces a `dist/package.json`, unblocking the Railway deploy pipeline.
- `apps/web` and the root workspace agree on the exact Next.js version.
- Railway isolated deploys of the API include `@nestjs/config` and start successfully.
