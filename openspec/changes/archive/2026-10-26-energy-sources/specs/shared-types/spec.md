## ADDED Requirements

### Requirement: Energy sources wire types

The `shared` package SHALL export, from `packages/shared/src/lib/energy-sources.ts` and the package root: the runtime constant `ENERGY_SOURCE_IDS` (`['coal', 'gas', 'oil', 'nuclear', 'hydro', 'wind', 'solar', 'bioenergyOther']`, `as const`: the one definition of the sources and of their fixed order, read by the API builder, the web helpers and the chart palette), the runtime constant `RENEWABLE_SOURCE_IDS` (`['hydro', 'wind', 'solar', 'bioenergyOther']`), and the types `EnergySourceId`, `EnergySourcesEntity` and `EnergySourcesData`. `EnergySourcesEntity` is `CountryEntity & { generation: Record<EnergySourceId, (number | null)[]> }` and `EnergySourcesData` is `{ startYear: number; endYear: number; unit: string; dataset: DatasetIdentity; origin: DataSourceOrigin; entities: EnergySourcesEntity[] }`. Doc comments SHALL state that array index `i` is the year `startYear + i`, that values are terawatt-hours rounded to 2 decimals, that `bioenergyOther` is bioenergy plus other renewables excluding bioenergy, that the data covers electricity (not primary energy) from 2000, that `null` means the provider reports no value (never zero), and that **shares are not on the wire**: they are derived from `generation` by the web. `ApiResponse<EnergySourcesData>` SHALL type-check for the endpoint's success response, including `meta`.

#### Scenario: Types and constants are exported from the root

- **WHEN** a file imports `ENERGY_SOURCE_IDS`, `RENEWABLE_SOURCE_IDS`, `EnergySourceId`, `EnergySourcesData` and `EnergySourcesEntity` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both apps

#### Scenario: Fixed order and renewables subset

- **WHEN** `ENERGY_SOURCE_IDS` and `RENEWABLE_SOURCE_IDS` are read
- **THEN** the first equals the eight ids in the order above and every id of the second is in the first

#### Scenario: Incomplete source record fails type-checking

- **WHEN** an entity's `generation` object lacks one of the eight source keys
- **THEN** type-checking fails
