# country-explorer Specification

## Purpose

Provide the generic client-side country explorer (selection, chart panel and year table) that every per-country category page composes with its own chart and formatting.

## Requirements

### Requirement: A generic country explorer shell owns the selection and the layout

`apps/web/src/components/CountryExplorer.tsx` (a Client Component) SHALL accept `heading`, `entities` (any array of objects with `code`, `name` and `iso2`), an optional `controls` node and a render function `children(entity)`. It SHALL own the selected-code state (default `OWID_WRL`, falling back to the first entity when the code is absent), render the bordered card section labelled by its `h2`, the `CountryCombobox` (label "Country") and the `controls` slot on one responsive row, and then render `children(entity)` for the selected entity. It SHALL NOT fetch, read or write the URL, history or storage, and SHALL NOT know any category. Chart title, chart, live region, attribution and table are supplied by the caller through `children`.

#### Scenario: Default selection is World

- **GIVEN** entities including `OWID_WRL`
- **WHEN** the shell renders
- **THEN** `children` receives the World entity and the combobox shows "World"

#### Scenario: Changing the country re-renders the children

- **WHEN** the user selects Argentina
- **THEN** `children` is called with the Argentina entity and no request is made

#### Scenario: Controls slot

- **GIVEN** a `controls` node
- **WHEN** the shell renders
- **THEN** the node is rendered on the same row as the combobox

#### Scenario: No URL state

- **WHEN** the selection changes
- **THEN** `location` and `history` are unchanged

### Requirement: A generic chart panel pairs the chart with its title and announcement

`apps/web/src/components/charts/ChartPanel.tsx` SHALL render an `h3` with the given title, `LazyEChart` with the given option, and a visually hidden polite `role="status"` element with the given announcement. It SHALL contain no category logic.

#### Scenario: Title, chart and live region

- **WHEN** the panel renders with a title, an option and an announcement
- **THEN** the `h3` shows the title, the lazy chart receives the option and the live region carries the announcement

### Requirement: A generic year table is the text equivalent of a chart

`apps/web/src/components/YearDataTable.tsx` SHALL render the collapsed `<details>` with the summary "View data table", the focus-ring styling, a keyboard-focusable scrollable region labelled `Data table for <entity name>, scrollable`, and a table with the given caption, a `Year` column header and one column per given definition `{ header, values, format }`, rows from `endYear` to `startYear`, `scope` on every header, and an em dash where a value is `null`. It SHALL be collapsed by default. The CO2 data table SHALL be rebuilt on it with identical output.

#### Scenario: Rows newest first with em dash for gaps

- **GIVEN** a column whose 1951 value is `null`
- **WHEN** the table renders
- **THEN** the first body row is `endYear` and the 1951 cell shows an em dash

#### Scenario: Column definitions drive the table

- **GIVEN** two column definitions
- **WHEN** the table renders
- **THEN** it has three column headers (`Year` plus the two) with `scope="col"` and each cell uses its column's `format`

#### Scenario: Collapsed and labelled

- **WHEN** the table renders
- **THEN** the `<details>` is not open and the scroll region has `tabIndex` 0 and the label `Data table for <entity name>, scrollable`

#### Scenario: CO2 table output is unchanged

- **WHEN** the existing CO2 component tests run
- **THEN** they pass with the same assertions on caption, headers, row order, "< 0.01" and em dashes

### Requirement: A generic data attribution block

`apps/web/src/components/DataAttribution.tsx` SHALL render the compact paragraph "Data: <SourceAttribution>, updated <time dateTime>. <extra> <All data sources link>" from `meta.source`, with a caller-supplied `data-testid`, an optional `extra` node rendered before the "All data sources" link (used for an upstream credit), and exactly one link to `/data-sources/`. Names and licenses come only from the props. The CO2 content SHALL use it with the test id `co2-attribution` and, as `extra`, the credit of its upstream origin (see "A generic origin credit"); the rest of the text is identical to before.

#### Scenario: Text and links

- **WHEN** it renders with the OWID publisher
- **THEN** the "Data:" lead-in, the "Our World in Data" link, "(CC BY 4.0)", a `<time>` element and one `/data-sources/` link are present and no dataset version is shown

#### Scenario: Extra upstream credit

- **GIVEN** an `extra` node
- **WHEN** it renders
- **THEN** the node appears inside the paragraph before the "All data sources" link

#### Scenario: CO2 attribution is unchanged

- **WHEN** the CO2 page content renders
- **THEN** its attribution has the `co2-attribution` test id, the compact text and the Global Carbon Project origin credit

### Requirement: Shared payload guards and year helpers

`apps/web/src/lib/` SHALL provide `isYearAlignedCountryData(data, measureKeys)` (accepting only an object with numeric `startYear` and `endYear` where `endYear >= startYear`, a non-empty `entities` array whose every entry has string `code` and `name`, an `iso2` that is a string or `null`, and, for every key in `measureKeys`, an array of numbers or `null` of length `endYear - startYear + 1`, and containing the World entity), the primitives `hasStrings` and `isNumberOrNullArray` it is built from, and `listYears({ startYear, endYear })`. `getCo2Emissions` and `getGlobalTemperature` SHALL build their guards on them, adding only their own fields (`units`, `dataset`, `baseline`, `origin`). `listYears` SHALL be moved out of `co2ChartOption.ts` and imported from there by both chart builders.

#### Scenario: Valid payload

- **GIVEN** an object with aligned arrays for every given measure key and a World entity
- **WHEN** the guard runs
- **THEN** it returns true

#### Scenario: Misaligned array

- **GIVEN** an entity whose array length differs from `endYear - startYear + 1`
- **WHEN** the guard runs
- **THEN** it returns false

#### Scenario: Missing World or empty entities

- **WHEN** the payload has no `OWID_WRL` entity or an empty `entities` array
- **THEN** the guard returns false

#### Scenario: CO2 guard behavior is unchanged

- **WHEN** the existing `co2Emissions` suite runs
- **THEN** it passes with the same assertions

#### Scenario: Year range

- **WHEN** `listYears({ startYear: 2020, endYear: 2022 })` is called
- **THEN** it returns `[2020, 2021, 2022]`

### Requirement: CO2 page behavior is preserved

After the extraction, `/co2-emissions/` SHALL render the same DOM, texts, test ids, roles and behaviors as before (explorer card, metric toggle, key figures, chart title, live region, attribution, methodology note, collapsed table, JSON-LD block), and the existing CO2 unit suites and `co2-emissions.spec.ts` SHALL pass without assertion changes (only import paths and mocks of moved internals may change).

#### Scenario: Existing CO2 suites pass

- **WHEN** `npx nx test web` runs
- **THEN** the CO2 component, chart-option, structured-data, fetch and registry suites pass with unchanged assertions

#### Scenario: Existing CO2 E2E passes

- **WHEN** `npm run e2e` runs
- **THEN** `co2-emissions.spec.ts` passes in all five projects unchanged

### Requirement: A generic origin credit

`apps/web/src/components/OriginCredit.tsx` SHALL render a `DataSourceOrigin` as inline text: the producer, the title as an external link to `url` (`target="_blank"`, `rel="noopener noreferrer"`, `LINK_CLASS_NAME`), the license name as an external link to `license.url`, then `notice` and `disclaimer` when present (the `citation` is not repeated: it is listed on `/data-sources/`). It SHALL contain no origin text of its own and no category logic. `DataAttribution`'s `extra` slot is where callers place it.

#### Scenario: Full origin

- **GIVEN** an origin with notice, citation and disclaimer
- **WHEN** the component renders
- **THEN** the producer, the linked title, the linked license, the notice and the disclaimer are present and the citation is not

#### Scenario: Minimal origin

- **GIVEN** an origin without notice, citation and disclaimer
- **WHEN** the component renders
- **THEN** only the producer, the linked title and the linked license are present

#### Scenario: External links are safe

- **WHEN** the component renders
- **THEN** both links carry `target="_blank"` and `rel="noopener noreferrer"`
