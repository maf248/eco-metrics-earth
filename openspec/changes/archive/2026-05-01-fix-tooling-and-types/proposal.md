## Why

A config audit of the monorepo identified 13 issues across tooling, TypeScript configuration, code quality, and documentation. Left unaddressed, these issues cause incorrect NX build cache invalidation, silent linting gaps, type-unsafe code, incorrect Jest module compilation, and stale documentation that misleads developers. None require new product functionality — they are correctness and hygiene fixes to the existing scaffold.

## What Changes

- **NX build cache** (`nx.json`): The `production` namedInput excludes `jest.config.[jt]s` but the actual file is `jest.config.cts` — cache entries can become stale on config changes. Fix by adding `jest.config.cts` to the exclusion pattern.
- **NX lint targets** (`nx.json`): `@nx/eslint/plugin` is not registered, so `npx nx lint <project>` targets do not exist. Register the plugin to auto-infer lint targets across all projects.
- **Web tsconfig include path** (`apps/web/tsconfig.json`): Contains `"../../dist/apps/web/.next/types/**/*.ts"` — a stale path from a different workspace layout. The correct path is `"../../apps/web/.next/types/**/*.ts"` (already present) so the incorrect entry must be removed.
- **SVG type declarations** (`apps/web/index.d.ts`): Uses `any` for both the default export and `ReactComponent`, protected by an `eslint-disable` comment. Replace with `string` (default export) and `FC<SVGProps<SVGSVGElement>>` (ReactComponent) and remove the suppression comment.
- **TypeScript strict options** (`tsconfig.base.json`): `noUnusedParameters: true` is missing while `noUnusedLocals: true` is already set. Add the missing flag for symmetric strictness.
- **TypeScript dead config** (`tsconfig.base.json`): `customConditions: ["@org/source"]` is a generic NX template placeholder unused in this project. Remove it.
- **React import in layout** (`apps/web/src/app/layout.tsx`): `React.ReactNode` is used in the function signature without importing React. Add `import type { ReactNode } from 'react'` and replace `React.ReactNode` with `ReactNode`.
- **SWC module type for Jest** (`apps/api/.spec.swcrc`, `packages/shared/.spec.swcrc`): Both files set `"module": { "type": "es6" }`. Jest requires CommonJS output. Change to `"commonjs"`.
- **ESLint JS ignore** (`eslint.config.mjs`): `'**/*.js'` is included in the ignores array — far too broad. This silently skips `commitlint.config.js`, `webpack.config.js`, and other meaningful JS files. Remove the entry; `dist/**` already covers compiled output.
- **@nx/react explicit dependency** (`package.json`): Used in `apps/web/jest.config.cts` transform but only available as a transitive dependency of `@nx/next`. Add it as an explicit devDependency at version `22.6.5`.
- **AI tooling artifact in git** (`.gitignore`): `.opencode/package-lock.json` is tracked in git. Add `/.opencode/package-lock.json` to `.gitignore`.
- **AGENTS.md dev command** (`AGENTS.md`): Comment says `--target=serve` but the real NX command used by `npm run dev` uses `--targets=dev,serve`. Correct the comment.
- **AGENTS.md Next.js version** (`AGENTS.md`): States "Next.js 14+" but the installed version is 16.x. Update to "Next.js 16+".

## Non-Goals

- No new product features, routes, components, or API endpoints.
- No changes to test logic or test coverage (existing tests must still pass).
- No upgrades to NX, Next.js, NestJS, or any other major dependency.
- No changes to deployment configuration (Vercel, Railway).
- No restructuring of the monorepo layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`nx-workspace`** — `npx nx lint <project>` now works for all projects via the `@nx/eslint/plugin` registration. The `production` namedInput correctly excludes `.cts` jest config files from build cache keys.
- **`web-app-scaffold`** — `apps/web` TypeScript configuration is free of stale paths and `any` types. `layout.tsx` compiles cleanly with an explicit React type import. Jest specs for `api` and `shared` now correctly emit CommonJS for the test runner.

## Impact

All changes are in configuration and type declaration files. No runtime behaviour changes. Existing tests must pass without modification. Build, lint, and test pipelines should all be green after the fixes are applied.
