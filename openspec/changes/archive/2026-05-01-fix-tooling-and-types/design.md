## Context

The `fix-tooling-and-types` change addresses 13 issues discovered in a config audit of the monorepo scaffold. All issues are in configuration, type declarations, or documentation files — no runtime logic is involved. The fixes must not break any existing tests and must leave the build, lint, and test pipelines fully green.

The project uses NX 22, Next.js 16, NestJS, SWC for Jest transpilation, and a flat ESLint config (`eslint.config.mjs`). The NX plugin model (`plugins` array in `nx.json`) is used for target inference; explicit `project.json` targets are not used for lint or test.

## Goals / Non-Goals

**Goals:**

- Ensure NX build cache invalidates correctly when `jest.config.cts` changes.
- Make `npx nx lint <project>` work for all three projects without manual target definitions.
- Remove all stale, incorrect, or placeholder configuration entries.
- Eliminate all `any` types in type declaration files.
- Ensure Jest uses CommonJS module output for SWC-transpiled specs.
- Remove an AI tooling artifact (`/.opencode/package-lock.json`) from git tracking.
- Keep documentation accurate with respect to installed versions and CLI commands.

**Non-Goals:**

- Upgrading any dependencies.
- Changing test logic or adding new test coverage.
- Introducing new product features.

## Decisions

### F-035 — NX production namedInput and `.cts` jest configs

**Decision:** Add `"!{projectRoot}/jest.config.cts"` to the `production` namedInput array in `nx.json`, alongside the existing `"!{projectRoot}/jest.config.[jt]s"` pattern.

**Rationale:** Glob patterns in NX namedInputs do not match `.cts` via `[jt]s` — the extension is literally `cts`. The existing pattern misses the file used by `apps/web`. Adding the explicit exclusion ensures changes to `jest.config.cts` do not invalidate production build caches.

**Alternative considered:** Replace `jest.config.[jt]s` with a broader pattern like `jest.config.*`. Rejected — overly broad; prefer explicit and minimal scope.

---

### F-037 — Lint target inference via `@nx/eslint/plugin`

**Decision:** Register `@nx/eslint/plugin` in the `plugins` array of `nx.json` with `lintTargetName: "lint"`.

**Rationale:** This is the idiomatic NX way to infer lint targets from each project's ESLint config without adding explicit targets to every `project.json`. Keeps configuration DRY and consistent with how `@nx/jest/plugin` and `@nx/next/plugin` are already registered.

**Alternative considered:** Add a `lint` target manually to each project's `project.json`. Rejected — more verbose, harder to maintain, inconsistent with the existing plugin-based approach used for test/build targets.

The existing `targetDefaults.lint` entry references `.eslintrc.json` and `.eslintignore` as inputs. These are legacy flat-config inputs and will be replaced with the flat config input pattern `"{workspaceRoot}/eslint.config.mjs"`.

---

### F-014 — SWC module type for Jest

**Decision:** Change `"module": { "type": "es6" }` to `"module": { "type": "commonjs" }` in both `apps/api/.spec.swcrc` and `packages/shared/.spec.swcrc`.

**Rationale:** Jest's default runner (`jest-runner`) executes tests in a CommonJS environment. SWC outputting ES modules causes `import`/`export` syntax to reach the Node.js CommonJS runtime, resulting in `SyntaxError: Cannot use import statement`. The `"commonjs"` type is the correct and stable setting for Jest specs.

---

### F-010 — SVG type declarations

**Decision:** Replace `any` with `string` for the default export and `FC<SVGProps<SVGSVGElement>>` for the named `ReactComponent` export. Remove the `/* eslint-disable */` comment.

**Rationale:** SVG files imported as URLs produce a string (the URL/path). The `ReactComponent` named export is a standard React functional component typed via `SVGProps`. This eliminates the `any` violation without requiring a third-party SVG type package. Requires adding `import type { FC, SVGProps } from 'react'` to `index.d.ts`.

---

### F-012 — Remove `customConditions` placeholder

**Decision:** Remove `"customConditions": ["@org/source"]` from `tsconfig.base.json`.

**Rationale:** This is a generic NX scaffold placeholder for monorepos that use conditional exports to resolve source files instead of built artifacts. This project does not use conditional exports. The entry is dead config that could confuse module resolution tooling.

---

### F-011 — Add `noUnusedParameters`

**Decision:** Add `"noUnusedParameters": true` to `tsconfig.base.json`.

**Rationale:** `noUnusedLocals` is already set. Omitting `noUnusedParameters` creates an asymmetry where unused function parameters silently pass type checking. Both flags should be enabled together for full strictness.

---

### F-013 — React import in `layout.tsx`

**Decision:** Add `import type { ReactNode } from 'react'` and replace `React.ReactNode` with `ReactNode`.

**Rationale:** In Next.js App Router with modern React (18+), `React` does not need to be in scope for JSX — but using `React.ReactNode` as a type without importing React causes a TypeScript error (`'React' refers to a UMD global`). The idiomatic fix is to import the type directly.

---

### F-017 — ESLint `**/*.js` ignore

**Decision:** Remove `'**/*.js'` from the `ignores` array in `eslint.config.mjs`.

**Rationale:** The pattern is too broad and suppresses linting on files that should be checked (e.g., `commitlint.config.js`, `webpack.config.js`, `jest.preset.js`). The `dist/**` entry already covers compiled output. Removing the broad pattern makes ESLint coverage correct by default.

**Risk:** Some auto-generated `.js` files at workspace root (e.g., `jest.preset.js`) may now produce lint warnings. These should be assessed and either fixed or individually excluded with a targeted comment.

---

### F-018 — `@nx/react` as explicit devDependency

**Decision:** Add `"@nx/react": "22.6.5"` to `devDependencies` in the root `package.json`.

**Rationale:** `apps/web/jest.config.cts` uses `@nx/react/plugins/jest` as a Jest transform. Currently `@nx/react` is only available as a transitive dependency of `@nx/next`. Transitive dependencies are not guaranteed to be stable — hoisting behaviour can change. Declaring it explicitly prevents a potential breakage when NX is updated.

---

### F-030 — `.opencode/package-lock.json` in git

**Decision:** Add `/.opencode/package-lock.json` to `.gitignore`.

**Rationale:** `.opencode/` is an AI tooling directory. Its `package-lock.json` is a tooling artifact unrelated to the project and should not be tracked in the repository. The path-anchored pattern `/.opencode/package-lock.json` targets only this specific file without broadly ignoring the entire `.opencode/` directory (which may contain committed skills/config).

---

### F-015 / F-016 — AGENTS.md corrections

**Decision:** Update the two inaccurate entries in AGENTS.md:

- `--target=serve` → `--targets=dev,serve` in the dev command comment.
- `Next.js 14+` → `Next.js 16+` in the Project Overview.

**Rationale:** Documentation that contradicts the actual codebase misleads developers and AI agents reading it as a source of truth.

## Risks / Trade-offs

- **F-017 (remove `**/\*.js`ignore):** May expose pre-existing lint issues in`.js` files at workspace root. These must be triaged — either fixed or given targeted inline suppressions with documented justification. This is the correct behaviour, not a regression.
- **F-011 (`noUnusedParameters`):** If any existing source files have unused parameters without the `_` prefix convention, they will fail type-checking. Any such instances must be fixed as part of this change (rename to `_param` or remove).
- **F-014 (SWC commonjs):** Changing from `es6` to `commonjs` is a correctness fix, not a behavioural change from the test runner's perspective — tests were likely already passing because Node's CJS interop was handling the output. The change makes the intent explicit and removes fragility.
