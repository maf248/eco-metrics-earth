## Context

The ESLint configuration (`eslint.config.mjs`) uses the new flat config format but lacks three plugins that are essential for a React + TypeScript + a11y project: `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-import`. Without them, hook misuse (e.g., conditional hook calls), accessibility violations, and inconsistent import ordering go unreported.

Several test files have quality issues: `layout.test.tsx` uses `renderToString` (inconsistent with the RTL-based suite), `sitemap.test.ts` has a duplicate assertion, and `NavScrollContainer.test.tsx` has no tests for the scroll affordance visibility logic. The API has no HTTP-level smoke test.

The `packages/shared` package is at version `0.0.1` while both apps are at `1.2.0`. The shared package's `tsconfig.spec.json` uses `nodenext` module resolution, requiring `.js` extensions in TypeScript imports — inconsistent with the rest of the monorepo.

## Goals / Non-Goals

**Goals:**
- Add and configure `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-import` in `eslint.config.mjs`.
- Fix `import/order` violations introduced in the `accessibility-and-bugs` / `architecture-and-quality` specs.
- Rewrite `layout.test.tsx` to use `render()` from RTL.
- Remove duplicate assertion from `sitemap.test.ts`.
- Add scroll-state tests to `NavScrollContainer.test.tsx`.
- Add an HTTP smoke test for the NestJS app (`GET /api/v1/health` → 200).
- Bump `packages/shared` version to `1.2.0`.
- Fix shared test `.js` extensions by updating `tsconfig.spec.json` to `moduleResolution: "bundler"`.
- Set `linter: "eslint"` as the NX generator default.

**Non-Goals:**
- 100% code coverage targets.
- End-to-end tests (Playwright/Cypress).
- Enabling all jsx-a11y rules as errors (recommended ruleset only).
- Migrating to Vitest.

## Decisions

### D1 — ESLint flat config integration pattern

**Decision**: Import each plugin and spread its recommended config where applicable:
```js
// eslint.config.mjs
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
```
- `react-hooks`: use `reactHooks.configs.recommended` spread, applying only to `*.tsx` and `*.ts` files in `apps/web`.
- `jsx-a11y`: use `jsxA11y.flatConfigs.recommended`, applying only to `*.tsx` files in `apps/web`.
- `import`: configure `import/order` rule with groups `['builtin', 'external', 'internal', 'parent', 'sibling', 'index']` and `alphabetize: { order: 'asc', caseInsensitive: true }`. Apply to all TS/TSX files. Set `import/no-duplicates` to `'error'`.

**Alternative considered**: Use `eslint-config-react-app` as a base. Rejected — it is CRA-specific and not maintained for flat config.

**Note**: `eslint-plugin-import` requires `eslint-import-resolver-typescript` to resolve TypeScript paths. Add it as a devDependency and configure `settings['import/resolver']`.

### D2 — API smoke test with `supertest` + NestJS `createTestingModule`

**Decision**: Create `apps/api/__tests__/app/bootstrap.test.ts` that:
1. Creates a full `NestFactory` app (same as production bootstrap) or uses `Test.createTestingModule` with the full `AppModule`.
2. Uses `supertest` to send `GET /api/v1/health`.
3. Asserts `200` status and `{ status: 'ok' }` body.

Use `afterAll` to close the app to prevent open handles.

**Alternative considered**: Unit test the `bootstrap()` function by mocking `NestFactory`. Rejected — a unit test of bootstrap provides no real value; the point is to verify the HTTP server actually starts and responds.

**`supertest` installation**: Add to `apps/api/package.json` devDependencies (exact version). Also add `@types/supertest`.

### D3 — `NavScrollContainer` scroll tests via `Object.defineProperty`

**Decision**: Use `Object.defineProperty` to simulate scrollable state on the container element:
```ts
Object.defineProperty(container, 'scrollLeft', { value: 50, configurable: true });
Object.defineProperty(container, 'scrollWidth', { value: 300, configurable: true });
Object.defineProperty(container, 'clientWidth', { value: 200, configurable: true });
fireEvent.scroll(container);
```
Then assert that the left-gradient affordance element is visible (or has a specific class/style).

**Note**: Verify the exact DOM structure of `NavScrollContainer` to target the right elements.

### D4 — `tsconfig.spec.json` for shared package

**Decision**: Add/update `packages/shared/tsconfig.spec.json` to include `"moduleResolution": "bundler"` (overriding the base `nodenext`). This allows extensionless TypeScript imports in test files.

**Rationale**: The lib config already overrides to `"bundler"` — the spec config should do the same. The `nodenext` resolution is needed for the published CJS/ESM output, not for Jest-run tests.

## Risks / Trade-offs

- **jsx-a11y recommended rules**: Some existing JSX may trigger new lint errors (e.g., missing `alt` on images, click events without keyboard handlers). These must be fixed, not suppressed. This could surface issues from other iterations.
- **`import/order` violations**: Adding the `import/order` rule will immediately flag violations in existing files. These are auto-fixable with `--fix` but may cause diff noise in the PR. Run `npm run lint -- --fix` and include the fixes in the same commit.
- **`supertest` open handles**: NestJS apps must be explicitly closed in `afterAll` or Jest will warn about open handles. Mitigation: Always call `await app.close()` in `afterAll`.

## Open Questions

- Does `eslint-plugin-import` have full support for NX monorepo path aliases (`@eco-metrics/shared`, `@/*`)? → Configure `eslint-import-resolver-typescript` with `project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json']` to resolve all aliases.
