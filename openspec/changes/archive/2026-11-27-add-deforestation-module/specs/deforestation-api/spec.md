## ADDED Requirements

### Requirement: Forest area endpoint

The system SHALL expose `GET /api/v1/deforestation/forest-area`, taking no parameters, that answers with an `ApiResponse<ForestAreaData>`: the forest area in hectares (`area`) and as a percentage of land area (`share`) of the World and of every country, year-aligned from `startYear` (1990) to `endYear`, the latest year with a value. `area` SHALL be read from the OWID chart `forest-area-km` (column `_1a_forestarea`) and `share` from `forest-area-as-share-of-land-area` (column `forest_share`), both requested with `tab: 'chart'`, the allowlist from `listCountryEntityCodes()` and a time range starting at 1990. Entities SHALL be World first, then countries ordered by name; OWID regions and income groups SHALL NOT appear; an entity with no value in any year SHALL be omitted. `area` values SHALL be whole hectares and `share` values SHALL be rounded to 2 decimals; a missing observation SHALL be `null`. The payload SHALL carry `units`, `dataset` (name and version taken from the area indicator's metadata) and `origin` (FAO Global Forest Resources Assessment 2025, CC BY 4.0). `meta.source` SHALL be the OWID publisher and `meta.source.lastUpdated` the latest `updatedAt` of the two indicators read. The controller SHALL be documented with `@ApiOkResponse` and `@ApiBadGatewayResponse`.

#### Scenario: Successful response

- **GIVEN** OWID answers with valid charts
- **WHEN** `GET /api/v1/deforestation/forest-area` is requested
- **THEN** the response is `200` with `data.startYear` 1990, `data.endYear` the latest year with a value, and `data.entities[0].code` equal to `OWID_WRL`
- **AND** every entity has `area` and `share` arrays of length `endYear - startYear + 1`
- **AND** `data.origin.producer` names the Food and Agriculture Organization of the United Nations and its license is CC BY 4.0
- **AND** `meta.source.provider` is Our World in Data

#### Scenario: Regions and income groups are excluded

- **GIVEN** the CSV contains `OWID_AFR`, `OWID_EUR` and `OWID_HIC`
- **WHEN** the payload is built
- **THEN** none of those codes appears in `data.entities`

#### Scenario: Charts are requested on their chart tab

- **WHEN** the service requests the two charts
- **THEN** each request URL contains `tab=chart`, a `country` filter and a `time` range starting at 1990
- **AND** the value columns are selected by the explicit short names `_1a_forestarea` and `forest_share`

#### Scenario: Missing observation is null

- **GIVEN** an entity has an empty `forest_share` cell for a year
- **WHEN** the payload is built
- **THEN** its `share` entry for that year is `null`, not 0, and the arrays do not shift

#### Scenario: Units are verified

- **GIVEN** the area indicator's unit is not `hectares`, or the share indicator's unit is not `%`
- **WHEN** the payload is built
- **THEN** the service fails with `ProviderDataError` and the endpoint answers `502` unless a snapshot exists

#### Scenario: A re-based land area is rejected

- **GIVEN** the World implied land area (`area / (share / 100)`) varies by more than 1% across the served years
- **WHEN** the payload is built
- **THEN** the service fails with `ProviderDataError` rather than serving a share on a different base

#### Scenario: No usable content

- **GIVEN** the provider answers with a chart that has no World entity or no value in any year
- **WHEN** the payload is built
- **THEN** the service fails with `ProviderDataError`

### Requirement: Tree cover loss endpoint

The system SHALL expose `GET /api/v1/deforestation/tree-cover-loss`, taking no parameters, that answers with an `ApiResponse<TreeCoverLossData>`: the hectares of tree cover lost per year by each of the seven GFW dominant drivers for the World and every country, year-aligned from `startYear` (2001) to `endYear`. The data SHALL be read from the OWID chart `tree-cover-loss-by-dominant-driver` requested with `tab: 'chart'`, selecting the seven columns `tree_cover_loss_ha__category_permanent_agriculture`, `..._hard_commodities`, `..._settlements__and__infrastructure`, `..._shifting_cultivation`, `..._logging`, `..._wildfire` and `..._other_natural_disturbances`. The payload SHALL list `drivers` (id and source name) in the stacking order Permanent agriculture, Hard commodities (mining and energy), Settlements and infrastructure, Shifting cultivation, Logging, Wildfire, Other natural disturbances; every entity SHALL carry one array per driver id. Drivers SHALL NOT be regrouped, summed into a total or renamed to "deforestation" in the payload. A blank cell SHALL be `null` (no value), never 0; values SHALL be rounded to whole hectares. The payload SHALL carry `unit` (`hectares`, verified against the indicator metadata), `dataset` and `origin` (World Resources Institute and Google DeepMind, Global Forest Watch, CC BY 4.0, with the credit "Tree cover loss by dominant driver" as its `notice`). Entities, ordering, envelope and `lastUpdated` follow the forest area endpoint.

#### Scenario: Successful response

- **GIVEN** OWID answers with a valid chart
- **WHEN** `GET /api/v1/deforestation/tree-cover-loss` is requested
- **THEN** the response is `200` with `data.startYear` 2001 and `data.entities[0].code` equal to `OWID_WRL`
- **AND** `data.drivers` has seven entries in the stacking order above and every entity has an array per driver id of length `endYear - startYear + 1`
- **AND** `data.origin.notice` contains "Tree cover loss by dominant driver" and its license is CC BY 4.0

#### Scenario: Blank driver cells stay null

- **GIVEN** a country-year has a blank `shifting_cultivation` cell and values for the other drivers
- **WHEN** the payload is built
- **THEN** its `shiftingCultivation` entry for that year is `null`
- **AND** the other drivers keep their rounded values

#### Scenario: Unit is verified

- **GIVEN** the indicator's unit is not `hectares`
- **WHEN** the payload is built
- **THEN** the service fails with `ProviderDataError`

#### Scenario: One download serves the seven columns

- **WHEN** the service selects the seven driver columns
- **THEN** the OWID client performs one CSV request for the chart, not seven

#### Scenario: Unknown or missing column

- **GIVEN** the CSV lacks one of the seven expected columns
- **WHEN** the payload is built
- **THEN** the endpoint answers `502` with the constant provider-failure body unless a snapshot exists

### Requirement: Each deforestation section is isolated

Each endpoint SHALL resolve through `ProviderSnapshotService.resolve` with its own snapshot key (`deforestation-forest-area`, `deforestation-tree-cover-loss`), its own envelope and its own `meta.source`, so a failure of one SHALL NOT change the response of the other. A provider failure SHALL extend `ProviderError` and be mapped to `502` with the constant body by the global filter, with no per-controller mapping. When a stored snapshot exists the endpoint SHALL answer `200` with `meta.stale: true` and the snapshot's `meta.fetchedAt`.

#### Scenario: Provider failure with a snapshot

- **GIVEN** a snapshot of the forest area payload is stored and OWID is unreachable
- **WHEN** `GET /api/v1/deforestation/forest-area` is requested
- **THEN** the response is `200` with `meta.stale: true` and the snapshot's `fetchedAt`

#### Scenario: Provider failure without a snapshot

- **GIVEN** no snapshot is stored and OWID is unreachable
- **WHEN** either endpoint is requested
- **THEN** the response is `502` with the constant body

#### Scenario: One endpoint failing does not affect the other

- **GIVEN** the `tree-cover-loss` chart answers with unusable content and the forest area charts are valid
- **WHEN** both endpoints are requested
- **THEN** `forest-area` answers `200` and `tree-cover-loss` answers `502`

#### Scenario: Snapshot keys are distinct

- **WHEN** both endpoints succeed with a stub snapshot store
- **THEN** two objects are stored under the keys `deforestation-forest-area` and `deforestation-tree-cover-loss`

### Requirement: Deforestation origins are declared in the data sources catalog

Each service SHALL call `OwidProviderStatus.registerCategory('deforestation', origins)` in its constructor with its static origin constant (the same constant served in `data.origin`) and `recordProviderUpdate(...)` after each fresh result. The category module SHALL NOT build an OWID data source entry. `GET /api/v1/data-sources` SHALL then list the FAO Global Forest Resources Assessment 2025 and the GFW tree cover loss by dominant driver origins under the Our World in Data provider with `categories` including `deforestation`, and the `deforestation` category on the OWID entry. The FAO origin's description SHALL say that the OWID share chart also holds pre-1990 estimates from other sources that this site does not use.

#### Scenario: Origins appear in the catalog

- **WHEN** both services have been constructed and `GET /api/v1/data-sources` is requested
- **THEN** the OWID entry lists both origins with `categories` containing `deforestation` and the OWID entry's `categories` contain `deforestation`
- **AND** there is exactly one `owid` entry

#### Scenario: Shared origin keeps every category

- **WHEN** a second category registers an origin with the same `producer` and `title`
- **THEN** the listed origin keeps both categories

### Requirement: Deforestation shared types

`packages/shared/src/lib/deforestation.ts` SHALL define and export from the package root `ForestAreaEntity`, `ForestAreaData`, `TREE_COVER_LOSS_DRIVER_IDS`, `TreeCoverLossDriverId`, `TreeCoverLossDriver`, `TreeCoverLossEntity` and `TreeCoverLossData` as specified in the design, so both apps import them from `@eco-metrics/shared`.

#### Scenario: Types resolve in both apps

- **WHEN** `apps/api` and `apps/web` import `ForestAreaData` and `TreeCoverLossData` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them without errors

#### Scenario: Driver ids are a fixed ordered list

- **WHEN** `TREE_COVER_LOSS_DRIVER_IDS` is read
- **THEN** it holds the seven ids in stacking order

### Requirement: Deforestation API tests use fixtures and no network

Tests of the builders and services SHALL use fixtures captured once from the exact URLs the services request (never inside a test), stub the transport through `OUTBOUND_FETCH`, use a stub `SnapshotStore` and reach neither OWID nor GCP. Controller tests SHALL cover the `200`, the stale `200` and the `502` of each endpoint.

#### Scenario: No network

- **WHEN** the API test suite runs offline
- **THEN** every deforestation test passes
