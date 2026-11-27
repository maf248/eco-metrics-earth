## ADDED Requirements

### Requirement: Date-indexed grapher charts

`OwidClient` SHALL expose `getGrapherDatedSeries(slug, { tab?, country?, columns })` for charts whose CSV header is `entity,day,<columns...>` (no `code` column), returning the entity name and its rows ascending by ISO date with a `number | null` per requested column. `getGrapherSeries` and `parseGrapherTable` SHALL stay unchanged.

#### Scenario: Dated rows are parsed

- **GIVEN** the `seawater-ph` fixture with columns `ocean_ph_yearly_average` and `ocean_ph`
- **WHEN** `getGrapherDatedSeries` is called with both columns
- **THEN** the rows are ascending by date and a blank `ocean_ph_yearly_average` cell is `null`

#### Scenario: URL

- **WHEN** the method builds its request
- **THEN** the URL uses `v=1&csvType=filtered&useColumnShortNames=true` plus the optional `tab` and `country`

#### Scenario: Validation before the network

- **WHEN** the method is called with an invalid slug or an invalid tab
- **THEN** it throws `OwidInvalidParameterError` and the transport is not called

#### Scenario: Non-ISO date

- **GIVEN** a row whose `day` is `12345`
- **WHEN** the CSV is parsed
- **THEN** `OwidParseError` is thrown

#### Scenario: Missing column

- **WHEN** a requested column is not in the header
- **THEN** `OwidParseError` is thrown naming the column

#### Scenario: Cached under its own key

- **GIVEN** two calls with the same options
- **WHEN** the transport is counted
- **THEN** it was called once under the `owid:grapher-dated:` namespace with the OWID TTL, no entry of `getGrapherSeries` is shared and callers never share references with the cache

#### Scenario: No rows

- **GIVEN** a body with no data rows or a non-numeric cell
- **WHEN** the CSV is parsed
- **THEN** `OwidParseError` is thrown

#### Scenario: Year-indexed behavior is untouched

- **WHEN** the existing OWID client suites run without modification
- **THEN** they pass, and a dated chart requested through `getGrapherSeries` still fails with the existing unsupported-chart error
