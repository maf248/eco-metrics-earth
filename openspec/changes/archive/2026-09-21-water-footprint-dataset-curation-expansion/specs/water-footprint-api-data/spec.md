# water-footprint-api-data — Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Module and app tests run without fs mocks

`apps/api/__tests__/app/app.module.test.ts` and `apps/api/__tests__/water-footprint/water-footprint.module.test.ts` SHALL NOT mock `fs` — with the dataset at its module-local location, the real path resolves under ts-jest and the tests compile against the real data. The `water-footprint.module.test.ts` smoke test SHALL additionally assert that the service resolved from the module returns 60 products, so a future path regression fails loudly instead of silently serving an empty dataset.

#### Scenario: AppModule compiles against the real dataset

- **WHEN** `app.module.test.ts` runs with no `fs` mock
- **THEN** `AppModule` compiles successfully and the water-footprint service holds the real 60 products

#### Scenario: Module smoke test asserts dataset size

- **WHEN** `water-footprint.module.test.ts` runs
- **THEN** it asserts `service.getAllProducts()` has length 60

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
