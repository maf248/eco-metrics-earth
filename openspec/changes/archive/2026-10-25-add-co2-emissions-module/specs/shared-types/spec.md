## ADDED Requirements

### Requirement: CO2 emissions wire types

The `shared` package SHALL export, from `packages/shared/src/lib/co2-emissions.ts` and the package root: `Co2EmissionsMetric` (`'total' | 'perCapita'`), `Co2EmissionsEntity` (`{ code: string; iso2: string | null; name: string; total: (number | null)[]; perCapita: (number | null)[] }`) and `Co2EmissionsData` (`{ startYear: number; endYear: number; units: { total: string; perCapita: string }; dataset: { name: string; version: string }; entities: Co2EmissionsEntity[] }`), documented with English doc comments stating that array index `i` is the year `startYear + i`, the units and the rounding. They are types only. `ApiResponse<Co2EmissionsData>` SHALL type-check for the endpoint's success response, including `meta`.

#### Scenario: Types are exported from the root

- **WHEN** a file imports `Co2EmissionsData`, `Co2EmissionsEntity` and `Co2EmissionsMetric` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both `apps/api` and `apps/web`

#### Scenario: Missing observations are null

- **GIVEN** an entity with an unreported year
- **WHEN** it is typed as `Co2EmissionsEntity`
- **THEN** `null` is assignable to the corresponding `total` or `perCapita` element

#### Scenario: World has no alpha-2 code

- **WHEN** an entity for World is typed as `Co2EmissionsEntity`
- **THEN** `iso2: null` is accepted

#### Scenario: Envelope with meta type-checks

- **WHEN** `{ success: true, status: 200, data, meta: { source, fetchedAt } }` is assigned to `ApiResponse<Co2EmissionsData>`
- **THEN** it type-checks

### Requirement: Static ISO country-code crosswalk

The `shared` package SHALL export from `packages/shared/src/lib/country-codes.ts` and the package root: `ISO3_TO_ISO2` (a read-only record of ISO 3166-1 alpha-3 -> alpha-2 codes, upper case), `WORLD_ENTITY_CODE` (`'OWID_WRL'`), `KOSOVO_ENTITY_CODE` (`'OWID_KOS'`), `iso2ForEntityCode(code: string): string | null` and `listCountryEntityCodes(): string[]`. `iso2ForEntityCode` SHALL return the alpha-2 code for an ISO alpha-3 code in the table, `'XK'` for `OWID_KOS` and `null` for `OWID_WRL` and for any unknown code. `listCountryEntityCodes` SHALL return every alpha-3 key of the table plus `OWID_KOS` and `OWID_WRL`, sorted and without duplicates. The data SHALL be static (no I/O) and SHALL cover every country code present in the committed OWID fixtures.

#### Scenario: Known countries

- **WHEN** `iso2ForEntityCode` is called with `ARG`, `USA` and `GBR`
- **THEN** it returns `AR`, `US` and `GB`

#### Scenario: Kosovo is handled

- **WHEN** `iso2ForEntityCode('OWID_KOS')` is called
- **THEN** it returns `XK`

#### Scenario: World is represented without a flag

- **WHEN** `iso2ForEntityCode('OWID_WRL')` is called
- **THEN** it returns `null`

#### Scenario: Unknown and aggregate codes

- **WHEN** `iso2ForEntityCode` is called with `OWID_EUR`, `OWID_HIC` and `ZZZ`
- **THEN** it returns `null` for each, and none of them is in `listCountryEntityCodes()`

#### Scenario: Table is well formed

- **WHEN** every entry of `ISO3_TO_ISO2` is inspected
- **THEN** each key matches `/^[A-Z]{3}$/`, each value matches `/^[A-Z]{2}$/`, and no alpha-2 value is used by two keys

#### Scenario: Allowlist helper

- **WHEN** `listCountryEntityCodes()` is called
- **THEN** it contains `ARG`, `OWID_KOS` and `OWID_WRL`, is sorted, and has no duplicates

#### Scenario: Fixture codes are covered

- **GIVEN** the country codes (alpha-3 shaped, non-aggregate) present in the committed CO2 fixtures
- **WHEN** each is passed to `iso2ForEntityCode`
- **THEN** none returns `null`, except `OWID_WRL`

#### Scenario: Every alpha-2 has a flag

- **WHEN** the web test suite compares the alpha-2 values the crosswalk can produce with the `.fi-xx` rules of the installed `flag-icons` stylesheet
- **THEN** every value (including `XK`) has a matching rule
