## 1. ESLint plugin dependencies

- [x] 1.1 Install `eslint-plugin-react-hooks` as a root devDependency with exact version: `npm install --save-exact --save-dev eslint-plugin-react-hooks`
- [x] 1.2 Install `eslint-plugin-jsx-a11y` as a root devDependency with exact version: `npm install --save-exact --save-dev eslint-plugin-jsx-a11y`
- [x] 1.3 Install `eslint-plugin-import` and `eslint-import-resolver-typescript` as root devDependencies with exact versions: `npm install --save-exact --save-dev eslint-plugin-import eslint-import-resolver-typescript`

## 2. ESLint flat config update

- [x] 2.1 In `eslint.config.mjs`, import the three new plugins at the top of the file
- [x] 2.2 Add a config block for `eslint-plugin-react-hooks` using `reactHooks.configs.recommended` applied to `files: ['apps/web/**/*.{ts,tsx}']`
- [x] 2.3 Add a config block for `eslint-plugin-jsx-a11y` using `jsxA11y.flatConfigs.recommended` applied to `files: ['apps/web/**/*.tsx']`
- [x] 2.4 Add a config block for `eslint-plugin-import` with the `import/order` rule configured with groups `['builtin', 'external', 'internal', 'parent', 'sibling', 'index']`, `newlines-between: 'always'`, and `alphabetize: { order: 'asc', caseInsensitive: true }`; add `import/no-duplicates: 'error'`; apply to `files: ['**/*.{ts,tsx}']`
- [x] 2.5 Configure `settings['import/resolver']` with `typescript: { project: ['apps/web/tsconfig.json', 'apps/api/tsconfig.json', 'packages/shared/tsconfig.json'] }` for TypeScript path alias resolution
- [x] 2.6 Run `npm run lint -- --fix` to auto-fix all `import/order` violations across the workspace
- [x] 2.7 Run `npm run lint` — must report zero errors and zero warnings; manually fix any non-auto-fixable issues

## 3. NX generator defaults

- [x] 3.1 In `nx.json`, find the `generators` section and change `"linter": "none"` to `"linter": "eslint"` in the default generator configuration

## 4. Shared package — tsconfig and version

- [x] 4.1 In `packages/shared/tsconfig.spec.json`, add or update `"moduleResolution": "bundler"` under `"compilerOptions"` to override the base `nodenext` resolution for tests
- [x] 4.2 In `packages/shared/__tests__/**/*.ts`, remove all `.js` extensions from import paths (e.g., change `from '../../src/lib/eco-category.js'` to `from '../../src/lib/eco-category'`)
- [x] 4.3 In `packages/shared/package.json`, update `"version"` from `"0.0.1"` to `"1.2.0"`

## 5. Fix layout test

- [x] 5.1 In `apps/web/__tests__/app/layout.test.tsx`, remove the `renderToString` import and any related `react-dom/server` imports
- [x] 5.2 Replace all `renderToString(<Component />)` calls with `render(<Component />)` from `@testing-library/react`
- [x] 5.3 Replace any string `.includes()` or regex assertions on the rendered HTML string with RTL queries (`screen.getByRole`, `screen.getByText`, etc.)

## 6. Fix sitemap test

- [x] 6.1 In `apps/web/__tests__/app/sitemap.test.ts`, remove the `it` block (or `expect`) that hardcodes `toHaveLength(12)` — keep only the dynamic assertion using `1 + Object.keys(ECO_CATEGORIES).length`

## 7. NavScrollContainer scroll tests

- [x] 7.1 In `apps/web/__tests__/components/NavScrollContainer.test.tsx`, inspect the component's DOM structure to identify the scrollable container element and the left/right affordance elements (check their class names or data-testid attributes)
- [x] 7.2 Add a describe block `'scroll affordances'` with helper to set scroll properties via `Object.defineProperty` and `fireEvent.scroll`
- [x] 7.3 Add test: no affordances when `scrollWidth === clientWidth` (not scrollable)
- [x] 7.4 Add test: right affordance visible when `scrollLeft === 0` and content overflows
- [x] 7.5 Add test: both affordances visible when scrolled to the middle
- [x] 7.6 Add test: only left affordance when `scrollLeft === scrollWidth - clientWidth` (fully scrolled)

## 8. API bootstrap smoke test

- [x] 8.1 Install `supertest` and `@types/supertest` as devDependencies in `apps/api` with exact versions
- [x] 8.2 Create `apps/api/__tests__/app/bootstrap.test.ts` — import `NestFactory`, `AppModule`, and `supertest`; in `beforeAll`, create the app with `NestFactory.create(AppModule)`, set the global prefix `/api/v1`, and call `app.init()`; store the `HttpServer` via `app.getHttpServer()`; in `afterAll`, call `await app.close()`
- [x] 8.3 Add an `it` block: `'GET /api/v1/health returns 200 with status ok'` — use `supertest(httpServer).get('/api/v1/health').expect(200).expect({ status: 'ok' })`
- [x] 8.4 Ensure the test file is picked up by the Jest config in `apps/api` (check `testMatch` pattern in `jest.config.cts`)

## 9. Verification

- [x] 9.1 Run `npx nx test web` — all tests pass, zero errors, zero warnings
- [x] 9.2 Run `npx nx test api` — all tests pass including the new bootstrap smoke test
- [x] 9.3 Run `npx nx test shared` — all tests pass with extensionless imports
- [x] 9.4 Run `npm run lint` — zero errors and zero warnings across all projects
- [x] 9.5 Run `npx nx build web` and `npx nx build api` — both succeed
