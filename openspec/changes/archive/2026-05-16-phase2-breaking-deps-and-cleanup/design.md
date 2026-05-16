## Context

The monorepo currently runs: ESLint 9 (flat config already in use), TypeScript 5.9, reflect-metadata 0.1, webpack-cli 5. Phase 1 patches were applied and all 162 tests pass. Four devDependencies (`ts-jest`, `@nestjs/schematics`, `@nx/web`, `ts-node`) appear in `package.json` but have zero references in any config, script, or source file.

This design addresses each of the five version bumps and the four removals independently so that failures can be isolated and rolled back per-concern.

## Goals / Non-Goals

**Goals:**
- Upgrade all five deferred breaking-version packages to their current stable release.
- Remove four confirmed-unused devDependencies.
- Maintain zero failing tests and zero lint errors throughout.
- Keep all direct dependencies pinned to exact versions (no `^` or `~`).

**Non-Goals:**
- Changing bundler (staying on webpack for the API build).
- Adding new lint rules beyond what ESLint 10 requires.
- Altering any product-facing behavior.

## Decisions

### 1. Upgrade order: removals first, then upgrades, then verify

**Decision:** Remove the four unused deps first (low-risk, no compilation impact), then apply version bumps in this order: `reflect-metadata`, `webpack-cli`, `eslint`+`@eslint/js`, `typescript`. Run `npm run build && npm run test && npm run lint` after each step.

**Rationale:** Isolating each upgrade makes failures easy to attribute. TypeScript is last because it has the broadest blast radius — it affects compilation of all three projects.

**Alternative considered:** A single lockfile regeneration with all bumps at once. Rejected: any failure would require bisecting manually.

---

### 2. reflect-metadata 0.2 — no code changes needed

**Decision:** Upgrade `reflect-metadata` in `apps/api/package.json` only (it is a runtime dep of the API). No source changes are expected.

**Rationale:** NestJS 11 is compatible with reflect-metadata 0.2. The project uses only NestJS decorators (`@Controller`, `@Injectable`, etc.) and the `emitDecoratorMetadata` compiler option. The 0.2 API is a superset of 0.1 for these use cases — the only breaking change is for code calling `Reflect.metadata()` directly with the old `Reflect.defineMetadata` / `Reflect.getMetadata` low-level API, which we do not use.

**Risk:** If a transitive NestJS dependency internally uses the old API, tests will fail at runtime. Mitigation: running the full API test suite catches this immediately.

---

### 3. webpack-cli 7 — verify build command signature

**Decision:** Upgrade `webpack-cli` in root `package.json` to `7.0.2`. Confirm that the `webpack-cli build` command and `--node-env` arg remain valid in v7.

**Rationale:** The `apps/api` build target calls `webpack-cli build --node-env=production`. webpack-cli 6 changed the positional argument parsing but `build` is still the default sub-command in v7. The `--node-env` flag is a webpack (not webpack-cli) option passed through; it should be unaffected.

**Risk:** CLI flag deprecations. Mitigation: run `npx nx build api` after the upgrade and inspect output for warnings.

---

### 4. ESLint 10 — flat config already in place, low migration cost

**Decision:** Bump `eslint` and `@eslint/js` to `10.4.0` / `10.0.1` respectively. Inspect `eslint.config.mjs` for any deprecated rule names or plugin API calls; fix if needed.

**Rationale:** The project migrated to flat config (`eslint.config.mjs`) in a prior change. ESLint 10's primary breaking change is the removal of the legacy `eslintrc` loader, which is irrelevant here. The only expected friction is if any plugin calls a deprecated ESLint core API — detectable by running `npm run lint` after the bump.

**Risk:** A plugin (e.g., `eslint-plugin-import-x`, `eslint-plugin-jsx-a11y`) might call a removed internal API. Mitigation: check each plugin's changelog for ESLint 10 compatibility before upgrading; all current plugins are already ESLint 10-compatible per their latest releases.

---

### 5. TypeScript 6 — compile all three projects and fix any type errors

**Decision:** Bump `typescript` in root `package.json` to `6.0.3`. Run `npx nx run-many --target=build --all` and fix any type errors that surface. Do not change `tsconfig` flags unless required.

**Rationale:** TypeScript 6 tightens inference in a few edge cases (e.g., narrowing across `await`, stricter `noImplicitOverride` suggestions). The codebase uses explicit return types and avoids `any`, which reduces exposure. The existing strict-mode configs should continue to work as-is; only genuine type errors require fixes.

**Risk:** A type that was previously inferred becomes an error. Mitigation: fix at the source (improve the type, not suppress with `@ts-ignore`). If a third-party library has incompatible types with TS 6, pin it and file an issue upstream.

---

### 6. Unused dep removals — safe to delete

| Package | Why it is safe to remove |
|---|---|
| `ts-jest` | All jest transforms use `@swc/jest` (api, shared) or `next/jest` (web). No jest config references `ts-jest`. |
| `@nestjs/schematics` | NX generators (`nx g @nx/nest:...`) are used. `nest g` is not part of any script or workflow. |
| `@nx/web` | No executor, config, or source file references `@nx/web`. It is not a peer dependency of any installed NX plugin. |
| `ts-node` | NX uses `@swc-node/register` for TypeScript execution. Not referenced in `nx.json`, `jest.config.*`, or any script. |

## Risks / Trade-offs

- **TypeScript 6 type errors in third-party types** → Pin the offending `@types/*` package and open an upstream issue; do not use `@ts-ignore`.
- **webpack-cli v7 CLI regression** → If `webpack-cli build` is deprecated, migrate the build command to plain `webpack` (the long-form CLI that webpack-cli proxies).
- **Lockfile churn** → Each isolated upgrade step regenerates only the affected transitive tree; acceptable as all direct deps remain exact-pinned.
- **False negatives from dep audit** → If a removed dep is actually needed at runtime via a transitive peer, `npm install` will warn, and `npm run build` will fail. All four removals have been cross-checked against configs and source files.

## Migration Plan

1. Remove four unused devDependencies from root `package.json`.
2. Bump `reflect-metadata` in `apps/api/package.json` to `0.2.2`.
3. Bump `webpack-cli` in root `package.json` to `7.0.2`.
4. Bump `eslint` to `10.4.0` and `@eslint/js` to `10.0.1` in root `package.json`.
5. Bump `typescript` to `6.0.3` in root `package.json`.
6. Run `npm install` to regenerate `package-lock.json`.
7. Run `npm run build && npm run test && npm run lint` — fix any errors before proceeding.
8. Update `ROADMAP.md` P2 status to complete.

**Rollback:** `git checkout` the modified `package.json` files and re-run `npm install`.
