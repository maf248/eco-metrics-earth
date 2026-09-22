# water-footprint-api-data Specification

## Purpose

Defines how the water-footprint API module stores and serves its static 60-product dataset: the dataset lives module-local (`apps/api/src/modules/water-footprint/data/water-footprint.json`) so the service's `join(__dirname, 'data/water-footprint.json')` resolution works in both the ts-jest and webpack execution contexts, the webpack asset copy places it at `dist/data/`, and module/app tests compile against the real file (no `fs` mocks). Also defines the product contract itself: every entry declares a `waterType` measurement scope, every citation names a retrievable publication, and the `Digital & Computing`, `Vehicles`, and `Energy & Extractives` categories cover water per unit of computing work, mobility, and resource extraction. Carries the unchanged Phase 2 contract too: the `GET /api/v1/water-footprint/products` endpoint, the `WaterFootprintService` API, and construction-time error handling.

## Requirements

### Requirement: Products endpoint with optional category filter

`WaterFootprintController` (registered by `WaterFootprintModule`) SHALL expose `GET /api/v1/water-footprint/products` with an optional `category` query parameter. Valid values: `"food-beverages"`, `"textiles"`, `"technology"`, `"manufactured"`, `"digital-computing"`, `"vehicles"`, `"energy-extractives"` — mapped to `WaterFootprintCategory` via `waterFootprintCategorySlugMap`. Success responses SHALL use the `ApiResponse<WaterFootprintProduct[]>` shape (`{ success: true, data: [...], status: 200 }`); an invalid slug SHALL produce `400 Bad Request` with `success: false` and an error message listing the valid slugs. The endpoint SHALL be documented in Swagger under the `'Water Footprint'` tag (`@ApiOperation`, `@ApiQuery`, `@ApiOkResponse`, `@ApiBadRequestResponse`).

#### Scenario: All products

- **GIVEN** the dataset contains 60 products
- **WHEN** a `GET` request is made to `/api/v1/water-footprint/products` with no query parameters
- **THEN** the response is `200` with `success: true` and `data` containing all 60 products

#### Scenario: Category filter

- **GIVEN** the dataset contains 5 Textiles products
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

The dataset SHALL contain 60 products across 7 categories: 39 Food & Beverages, 5 Textiles, 2 Technology, 4 Manufactured, 5 Digital & Computing, 3 Vehicles, 2 Energy & Extractives. No entry SHALL carry `waterFootprintLiters: null` — the dataset holds only entries with reported values, while the `WaterFootprintProduct` contract continues to allow `null` so the UI's null-handling remains defensive. The `apps/api/src/data/` directory SHALL NOT exist.

#### Scenario: Service loads the real dataset in tests

- **GIVEN** the dataset at its module-local location
- **WHEN** `npx nx test api` runs `app.module.test.ts` and `water-footprint.module.test.ts` (no `fs` mocks)
- **THEN** the `WaterFootprintService` loads the 60 products from the real file system

#### Scenario: Service loads the real dataset at runtime

- **GIVEN** a production build
- **WHEN** `npx nx serve api` starts and `GET /api/v1/water-footprint/products` is called
- **THEN** the response contains 60 products

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

`apps/api/__tests__/app/app.module.test.ts` and `apps/api/__tests__/water-footprint/water-footprint.module.test.ts` SHALL NOT mock `fs` — with the dataset at its module-local location, the real path resolves under ts-jest and the tests compile against the real data. The `water-footprint.module.test.ts` smoke test SHALL additionally assert that the service resolved from the module returns 60 products, so a future path regression fails loudly instead of silently serving an empty dataset.

#### Scenario: AppModule compiles against the real dataset

- **WHEN** `app.module.test.ts` runs with no `fs` mock
- **THEN** `AppModule` compiles successfully and the water-footprint service holds the real 60 products

#### Scenario: Module smoke test asserts dataset size

- **WHEN** `water-footprint.module.test.ts` runs
- **THEN** it asserts `service.getAllProducts()` has length 60

### Requirement: Water-type discriminator on the product contract

`WaterFootprintProduct` SHALL carry a required field `waterType: WaterFootprintWaterType` declaring the measurement scope of `waterFootprintLiters`. `WaterFootprintWaterType` SHALL be the union `'blue' | 'green-blue-grey' | 'lifecycle-onsite' | 'lifecycle-total'`, exported from `@eco-metrics/shared` together with a `waterFootprintWaterTypeLabels: Record<WaterFootprintWaterType, string>` display map (`'Blue water'`, `'Green + blue + grey'`, `'Life cycle (on-site)'`, `'Life cycle (total)'`).

The field is required, not optional: a new dataset entry that omits its measurement scope SHALL fail to compile.

#### Scenario: Every dataset entry declares a scope

- **GIVEN** the static dataset
- **WHEN** it is parsed as `WaterFootprintProduct[]`
- **THEN** every entry has a `waterType` that is one of the four union members

#### Scenario: Omitting waterType is a compile error

- **GIVEN** a developer adds a product entry without `waterType`
- **WHEN** `npx nx build shared` or `npx nx build api` runs
- **THEN** TypeScript reports a missing-property error

#### Scenario: Labels are available to consumers

- **WHEN** the web app imports `waterFootprintWaterTypeLabels` from `@eco-metrics/shared`
- **THEN** each of the four members resolves to its human-readable label

### Requirement: Dataset citation integrity

Every dataset entry's `source` SHALL identify a specific, retrievable publication, and its `sourceUrl` SHALL resolve to that publication. A `source` naming an organisation without identifying a publication (for example `"Water Footprint Network (various)"`) SHALL NOT appear. A `source` SHALL NOT be cited for a figure that the cited document does not report — in particular, Apple Product Environmental Reports SHALL NOT be cited for per-device water figures, because they report water at corporate and supply-chain level only.

Where no primary source supports a per-unit figure, the entry SHALL be removed rather than carry an unverifiable citation.

#### Scenario: No untraceable organisational citations

- **GIVEN** the dataset
- **WHEN** it is searched for the string `Water Footprint Network (various)`
- **THEN** there are no matches

#### Scenario: No per-device claims against corporate reports

- **GIVEN** the dataset
- **WHEN** it is searched for Apple Product Environmental Report citations
- **THEN** there are no matches

### Requirement: Digital & Computing category

`WaterFootprintCategory` SHALL include `'Digital & Computing'` and `waterFootprintCategorySlugMap` SHALL map `'digital-computing'` to it. The controller's `@ApiQuery` enum SHALL list `digital-computing` alongside the other category slugs. `WaterFootprintService` requires no change — it resolves slugs through the shared map.

The category SHALL hold five entries covering AI inference, AI training, and Bitcoin, each pairing an on-site figure with a total-scope figure so that the effect of measurement scope is visible in the data.

#### Scenario: Filter by the new slug

- **WHEN** a `GET` request is made to `/api/v1/water-footprint/products?category=digital-computing`
- **THEN** the response is `200` with `success: true` and `data` containing only the 5 `Digital & Computing` entries

#### Scenario: Scope pairs are present

- **GIVEN** the `Digital & Computing` entries
- **THEN** GPT-3 training appears twice — once as `lifecycle-onsite` (700,000 L) and once as `lifecycle-total` (5,400,000 L)

#### Scenario: Invalid slug still rejected

- **WHEN** a `GET` request is made with `?category=invalid-category`
- **THEN** the response is `400` with `success: false` and an error message listing the seven valid slugs

### Requirement: Vehicles and Energy & Extractives categories

`WaterFootprintCategory` SHALL include `'Vehicles'` and `'Energy & Extractives'`, and `waterFootprintCategorySlugMap` SHALL map `'vehicles'` to `'Vehicles'` and `'energy-extractives'` to `'Energy & Extractives'`. The controller's `@ApiQuery` enum SHALL list both new slugs alongside the other five. `WaterFootprintService` requires no change — it resolves slugs through the shared map.

The `Vehicles` category SHALL hold three entries, pairing a total life-cycle figure with an on-site manufacturing figure for the same product so the effect of measurement scope stays visible in the data:

- Passenger car (ICE, lifetime) — 59,600 L per vehicle (lifetime), `lifecycle-total`, Bras, Tejada, Yen & Zullo (2012), SAE Technical Paper 2012-01-0646.
- Passenger car (manufacturing only) — 5,200 L per vehicle, `lifecycle-onsite`, Semmens, Bras & Guldberg (2014), The International Journal of Life Cycle Assessment 19(1):246–256.
- Battery electric vehicle (lifetime, China grid) — 262,000 L per vehicle (lifetime), `lifecycle-total`, Wang, Shen, Kim, Wallington, Zhang & Han (2020), Resources, Conservation and Recycling 154:104628.

The `Energy & Extractives` category SHALL hold two entries:

- Hydraulic fracturing (frack job) — 5,700,000 L per well, `blue`, U.S. EPA (2016), Hydraulic Fracturing for Oil and Gas: Impacts from the Hydraulic Fracturing Water Cycle on Drinking Water Resources in the United States (Final Report).
- Lithium carbonate (Salar de Atacama, brine evaporation) — 500,000 L per tonne of Li₂CO₃, `lifecycle-onsite`, Flexer, Baspineiro & Galli (2018), Science of the Total Environment 639:1188–1204.

#### Scenario: Filter by the vehicles slug

- **WHEN** a `GET` request is made to `/api/v1/water-footprint/products?category=vehicles`
- **THEN** the response is `200` with `success: true` and `data` containing only the 3 `Vehicles` entries

#### Scenario: Filter by the energy-extractives slug

- **WHEN** a `GET` request is made to `/api/v1/water-footprint/products?category=energy-extractives`
- **THEN** the response is `200` with `success: true` and `data` containing only the 2 `Energy & Extractives` entries

#### Scenario: Vehicle scope pair is present

- **GIVEN** the `Vehicles` entries
- **THEN** the passenger car appears twice — once as `lifecycle-total` (59,600 L, lifetime) and once as `lifecycle-onsite` (5,200 L, manufacturing only)

#### Scenario: Lithium methodology discloses its accounting basis

- **GIVEN** the lithium carbonate entry
- **THEN** its `methodology` states that the value is brine water lost to evaporation (not freshwater consumption), cites the freshwater figure and the contested brine-accounting debate, and its `sourceUrl` resolves to the Flexer et al. (2018) publication
