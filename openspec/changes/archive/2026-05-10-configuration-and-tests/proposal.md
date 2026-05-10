## Why

The ESLint configuration is missing three critical plugins (`eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`), which means hook misuse, accessibility violations, and incorrect import ordering go unreported at lint time. Several tests use outdated patterns (`renderToString` instead of RTL, a duplicate sitemap length assertion) or have insufficient coverage (NavScrollContainer scroll states, API bootstrap smoke test). The shared package version is out of sync with the apps. Fixing tooling and test quality now makes future iterations faster and safer.

## What Changes

- **ESLint**: Add `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-import` to `eslint.config.mjs`. Configure `import/order` rule to enforce the AGENTS.md import ordering (external → workspace → relative). Configure recommended rules for react-hooks and jsx-a11y.
- **`layout.test.tsx`**: Replace `renderToString` with `render()` from `@testing-library/react` for consistency with the rest of the test suite.
- **`sitemap.test.ts`**: Remove the duplicate hardcoded `toHaveLength(12)` assertion; keep only the dynamic `1 + Object.keys(ECO_CATEGORIES).length` assertion.
- **`NavScrollContainer.test.tsx`**: Add tests that simulate scroll state (using `Object.defineProperty` on `scrollLeft`, `scrollWidth`, `clientWidth`) and assert the left/right gradient affordances appear and disappear correctly.
- **API smoke test**: Add an integration test in `apps/api/__tests__/app/app.e2e.test.ts` (or `bootstrap.test.ts`) using `supertest` against the NestJS `HttpServer` to verify `GET /api/v1/health` returns 200.
- **`packages/shared/package.json`**: Bump version from `0.0.1` to `1.2.0` to align with the monorepo's release baseline.
- **`packages/shared` test imports**: Remove `.js` extensions from TypeScript imports in `packages/shared/__tests__/**` by updating `tsconfig.spec.json` to use `moduleResolution: "bundler"`.
- **`nx.json` generator defaults**: Change the default `linter` from `"none"` to `"eslint"` in the generator defaults so newly scaffolded projects are automatically set up with ESLint.

## Non-Goals

- Achieving 100% code coverage (not a project requirement).
- End-to-end (Playwright/Cypress) tests (separate concern, out of scope).
- Adding tests for stub `AppController` / `AppService` (covered when real logic is implemented).
- Migrating to Vitest or another test runner.
- Enabling all jsx-a11y rules as errors (recommended ruleset only; stricter rules deferred).

## Capabilities

### New Capabilities

- `eslint-plugins`: React hooks, jsx-a11y, and import-order lint rules enforced across the monorepo.
- `navscroll-scroll-tests`: Test coverage for NavScrollContainer's scroll affordance visibility logic.
- `api-bootstrap-smoke-test`: HTTP-level smoke test confirming the NestJS app starts and the health endpoint responds.

### Modified Capabilities

*(none — no existing spec files exist for these areas)*

## Impact

- **`eslint.config.mjs`** (root): Three new plugin imports and rule configurations.
- **`package.json`** (root): Three new devDependencies (exact versions): `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`.
- **`apps/web/__tests__/app/layout.test.tsx`**: Rewrite to use `render()`.
- **`apps/web/__tests__/app/sitemap.test.ts`**: Remove duplicate assertion.
- **`apps/web/__tests__/components/NavScrollContainer.test.tsx`**: New scroll-state test cases.
- **`apps/api/__tests__/app/`**: New smoke test file; `supertest` added to api devDependencies.
- **`packages/shared/package.json`**: Version bump `0.0.1` → `1.2.0`.
- **`packages/shared/tsconfig.spec.json`**: Add `moduleResolution: "bundler"`.
- **`packages/shared/__tests__/**`**: Remove `.js` extensions from imports.
- **`nx.json`**: Update `generators` defaults for `linter`.
- **Breaking**: None — all changes are additive or fix existing behaviour.
