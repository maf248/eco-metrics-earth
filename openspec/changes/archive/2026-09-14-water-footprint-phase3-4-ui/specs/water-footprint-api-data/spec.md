# Spec: Water Footprint API Dataset Location

> Delta against the Phase 2 spec (`openspec/changes/archive/2026-07-12-water-footprint-phase2/specs/water-footprint-api/spec.md`). Covers the D1 technical cleanup: dataset relocation, webpack asset copy, and test mock hygiene. The endpoint contract is explicitly unchanged.

## MODIFIED

### Requirement: Dataset file location

The static dataset SHALL live at `apps/api/src/modules/water-footprint/data/water-footprint.json` (module-local), moved from `apps/api/src/data/water-footprint.json`. The `WaterFootprintService` source SHALL remain unchanged — it resolves `join(__dirname, 'data/water-footprint.json')`, which after the move is correct in **both** execution contexts:

- **ts-jest:** `__dirname` = `apps/api/src/modules/water-footprint` → resolves to the real file (previously ENOENT → empty dataset, worked around by `fs` mocks).
- **webpack bundle:** `__dirname` = `apps/api/dist` → resolves to `dist/data/water-footprint.json`, provided by the asset copy (see next requirement).

The moved file SHALL contain the same 52 products (38 Food & Beverages, 6 Textiles, 3 Technology, 5 Manufactured) with identical content — a pure relocation, no data edits. The now-empty `apps/api/src/data/` directory SHALL be removed.

#### Scenario: Service loads the real dataset in tests

- **Given** the dataset at its new module-local location
- **When** `npx nx test api` runs `app.module.test.ts` and `water-footprint.module.test.ts` (no `fs` mocks)
- **Then** the `WaterFootprintService` loads the 52 products from the real file system

#### Scenario: Service loads the real dataset at runtime

- **Given** a production build
- **When** `npx nx serve api` starts and `GET /api/v1/water-footprint/products` is called
- **Then** the response contains 52 products

### Requirement: Webpack asset copy to dist/data

The `assets` option in `apps/api/webpack.config.js` SHALL replace the `'./src/data'` string entry with an explicit object-form entry:

```js
assets: [
  './src/assets',
  { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' },
],
```

The object form is REQUIRED: `@nx/webpack`'s `normalizeAssets` computes a string asset's output relative to the project's `sourceRoot`, so the naive string `'./src/modules/water-footprint/data'` would copy to `dist/modules/water-footprint/data/` — a location the bundled service does not read. The object form honors `output` verbatim, copying the file to `dist/data/water-footprint.json` where `join(__dirname, 'data/water-footprint.json')` finds it.

#### Scenario: Build output contains the dataset at the expected path

- **When** `npx nx build api` completes
- **Then** `apps/api/dist/data/water-footprint.json` exists
- **Then** `find apps/api/dist -name 'water-footprint.json'` yields exactly one result

### Requirement: Module and app tests run without fs mocks

`apps/api/__tests__/app/app.module.test.ts` and `apps/api/__tests__/water-footprint/water-footprint.module.test.ts` SHALL NOT mock `fs` — with the dataset at its new location, the real path resolves under ts-jest and the tests compile against the real data. The `water-footprint.module.test.ts` smoke test SHALL additionally assert that the service resolved from the module returns 52 products, so a future path regression fails loudly instead of silently serving an empty dataset.

#### Scenario: AppModule compiles against the real dataset

- **When** `app.module.test.ts` runs with no `fs` mock
- **Then** `AppModule` compiles successfully and the water-footprint service holds the real 52 products

#### Scenario: Module smoke test asserts dataset size

- **When** `water-footprint.module.test.ts` runs
- **Then** it asserts `service.getAllProducts()` has length 52

## UNCHANGED (explicit)

The following Phase 2 requirements are restated as unchanged and MUST NOT be modified by this change:

- **Endpoint contract:** `GET /api/v1/water-footprint/products` with the optional `?category=` filter, `ApiResponse<WaterFootprintProduct[]>` success shape, `400` for invalid slugs, Swagger documentation — all identical.
- **Service API:** `getAllProducts()` (defensive copy) and `getByCategory(slug)` (slug validation via `waterFootprintCategorySlugMap`, `BadRequestException` for unknown slugs) — identical.
- **Service error handling at construction:** ENOENT → warn + empty dataset; other read errors → throw; malformed JSON → throw — identical (and still covered by the retained `fs` mock in `water-footprint.service.test.ts`).
- **Controller and module source:** no changes.

## File Changes

### REMOVED: `apps/api/src/data/water-footprint.json`

Moved to the module-local `data/` folder (pure `git mv`, identical content).

### ADDED: `apps/api/src/modules/water-footprint/data/water-footprint.json`

The 52-product dataset at its new module-local location.

### MODIFIED: `apps/api/webpack.config.js`

`assets: ['./src/assets', './src/data']` → `assets: ['./src/assets', { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' }]`.

### MODIFIED: `apps/api/__tests__/app/app.module.test.ts`

`jest.mock('fs', ...)` block removed; the module compiles against the real dataset.

### MODIFIED: `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`

`jest.mock('fs', ...)` block removed; adds the 52-product assertion against the real file.

### UNCHANGED: `apps/api/__tests__/water-footprint/water-footprint.service.test.ts`

Keeps its `fs` mock — the only coverage for the ENOENT/EACCES/malformed-JSON construction branches.
