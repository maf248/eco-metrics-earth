# water-footprint-api-data Specification

## Purpose

Defines how the water-footprint API module stores and serves its static 52-product dataset: the dataset lives module-local (`apps/api/src/modules/water-footprint/data/water-footprint.json`) so the service's `join(__dirname, 'data/water-footprint.json')` resolution works in both the ts-jest and webpack execution contexts, the webpack asset copy places it at `dist/data/`, and module/app tests compile against the real file (no `fs` mocks). Also carries the unchanged Phase 2 contract: the `GET /api/v1/water-footprint/products` endpoint, the `WaterFootprintService` API, and construction-time error handling.

## Requirements

### Requirement: Products endpoint with optional category filter

`WaterFootprintController` (registered by `WaterFootprintModule`) SHALL expose `GET /api/v1/water-footprint/products` with an optional `category` query parameter. Valid values: `"food-beverages"`, `"textiles"`, `"technology"`, `"manufactured"` — mapped to `WaterFootprintCategory` via `waterFootprintCategorySlugMap`. Success responses SHALL use the `ApiResponse<WaterFootprintProduct[]>` shape (`{ success: true, data: [...], status: 200 }`); an invalid slug SHALL produce `400 Bad Request` with `success: false` and an error message listing the valid slugs. The endpoint SHALL be documented in Swagger under the `'Water Footprint'` tag (`@ApiOperation`, `@ApiQuery`, `@ApiOkResponse`, `@ApiBadRequestResponse`).

#### Scenario: All products

- **GIVEN** the dataset contains 52 products
- **WHEN** a `GET` request is made to `/api/v1/water-footprint/products` with no query parameters
- **THEN** the response is `200` with `success: true` and `data` containing all 52 products

#### Scenario: Category filter

- **GIVEN** the dataset contains 6 Textiles products
- **WHEN** a `GET` request is made with `?category=textiles`
- **THEN** the response is `200` with `success: true` and `data` containing only products with `category: "Textiles"`

#### Scenario: Filter matching zero products

- **GIVEN** a category slug that is valid but matches zero products in the dataset
- **WHEN** a `GET` request is made with that `?category=` value
- **THEN** the response is `200` with `success: true` and `data` as an empty array `[]`

#### Scenario: Invalid category slug

- **GIVEN** any dataset
- **WHEN** a `GET` request is made with `?category=invalid-category`
- **THEN** the response is `400` with `success: false` and an error message listing the valid slugs

### Requirement: Service API — getAllProducts and getByCategory

`WaterFootprintService` SHALL expose `getAllProducts(): WaterFootprintProduct[]` — returning a defensive copy of the full array — and `getByCategory(slug: string): WaterFootprintProduct[]` — validating the slug via `waterFootprintCategorySlugMap` and throwing `BadRequestException` for unknown slugs.

#### Scenario: Defensive copy

- **WHEN** `getAllProducts()` is called and the caller mutates the returned array
- **THEN** the service's internal dataset is unaffected

#### Scenario: Unknown slug rejected

- **WHEN** `getByCategory('unknown-slug')` is called
- **THEN** the service throws `BadRequestException`

### Requirement: Service construction error handling

At construction the service reads the dataset file and parses/validates the loaded JSON. ENOENT (file missing) SHALL log a warning and start with an empty dataset; other read errors (e.g. EACCES) SHALL throw; malformed JSON (or a payload that is not an array) SHALL throw. These branches are covered by the retained `fs` mock in `water-footprint.service.test.ts` — they cannot be exercised with the real file.

#### Scenario: Missing data file

- **GIVEN** the dataset file does not exist (ENOENT)
- **WHEN** the `WaterFootprintService` is instantiated
- **THEN** the service logs a warning and serves an empty dataset

#### Scenario: Unreadable data file

- **GIVEN** the dataset file exists but cannot be read (e.g. EACCES)
- **WHEN** the `WaterFootprintService` is instantiated
- **THEN** the service throws at construction time

#### Scenario: Malformed data file

- **GIVEN** the JSON file exists but is not valid JSON or is not an array
- **WHEN** the `WaterFootprintService` is instantiated
- **THEN** the service throws at construction time

### Requirement: Dataset file location

The static dataset SHALL live at `apps/api/src/modules/water-footprint/data/water-footprint.json` (module-local). The `WaterFootprintService` source resolves `join(__dirname, 'data/water-footprint.json')`, which at this location is correct in **both** execution contexts:

- **ts-jest:** `__dirname` = `apps/api/src/modules/water-footprint` → resolves to the real file (previously ENOENT → empty dataset, worked around by `fs` mocks).
- **webpack bundle:** `__dirname` = `apps/api/dist` → resolves to `dist/data/water-footprint.json`, provided by the asset copy (see the webpack asset copy requirement).

The dataset SHALL contain the same 52 products (38 Food & Beverages, 6 Textiles, 3 Technology, 5 Manufactured) — a pure relocation, no data edits. The now-empty `apps/api/src/data/` directory SHALL NOT exist.

#### Scenario: Service loads the real dataset in tests

- **GIVEN** the dataset at its module-local location
- **WHEN** `npx nx test api` runs `app.module.test.ts` and `water-footprint.module.test.ts` (no `fs` mocks)
- **THEN** the `WaterFootprintService` loads the 52 products from the real file system

#### Scenario: Service loads the real dataset at runtime

- **GIVEN** a production build
- **WHEN** `npx nx serve api` starts and `GET /api/v1/water-footprint/products` is called
- **THEN** the response contains 52 products

### Requirement: Webpack asset copy to dist/data

The `assets` option in `apps/api/webpack.config.js` SHALL use an explicit object-form entry for the dataset:

```js
assets: [
  './src/assets',
  { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' },
],
```

The object form is REQUIRED: `@nx/webpack`'s `normalizeAssets` computes a string asset's output relative to the project's `sourceRoot`, so a naive string `'./src/modules/water-footprint/data'` would copy to `dist/modules/water-footprint/data/` — a location the bundled service does not read. The object form honors `output` verbatim, copying the file to `dist/data/water-footprint.json` where `join(__dirname, 'data/water-footprint.json')` finds it.

#### Scenario: Build output contains the dataset at the expected path

- **WHEN** `npx nx build api` completes
- **THEN** `apps/api/dist/data/water-footprint.json` exists
- **THEN** `find apps/api/dist -name 'water-footprint.json'` yields exactly one result

### Requirement: Module and app tests run without fs mocks

`apps/api/__tests__/app/app.module.test.ts` and `apps/api/__tests__/water-footprint/water-footprint.module.test.ts` SHALL NOT mock `fs` — with the dataset at its module-local location, the real path resolves under ts-jest and the tests compile against the real data. The `water-footprint.module.test.ts` smoke test SHALL additionally assert that the service resolved from the module returns 52 products, so a future path regression fails loudly instead of silently serving an empty dataset.

#### Scenario: AppModule compiles against the real dataset

- **WHEN** `app.module.test.ts` runs with no `fs` mock
- **THEN** `AppModule` compiles successfully and the water-footprint service holds the real 52 products

#### Scenario: Module smoke test asserts dataset size

- **WHEN** `water-footprint.module.test.ts` runs
- **THEN** it asserts `service.getAllProducts()` has length 52
