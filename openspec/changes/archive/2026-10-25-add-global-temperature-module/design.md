# Design: global temperature module

Everything below was checked against the code and against live OWID responses on 25 Oct 2026 unless marked otherwise. The pattern being replicated is the archived `2026-10-25-add-co2-emissions-module`; only the differences and the extractions are described in depth.

## 1. Facts verified against OWID

| Fact                                                                                                                                                                                                                                                                                                                  | Evidence                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Chart `annual-temperature-anomalies` ("Annual temperature anomalies"), one value column, short name `temperature_anomaly`, unit and short unit `°C`, indicator id `1325256`                                                                                                                                           | filtered CSV header; chart `.metadata.json`; indicator metadata |
| Anomaly = a year's average surface temperature minus the **1991-2020 mean** of the same place, in °C. Baseline comes from the chart subtitle and the indicator's `descriptionShort` ("...from the 1991-2020 mean...")                                                                                                 | chart metadata; indicator metadata                              |
| Source: Copernicus Climate Change Service, ERA5 monthly averaged data on single levels (2 m temperature), v2. Required credit line: "Contains modified Copernicus Climate Change Service information (2026)". Origin licence name: `Copernicus License`. The indicator has `nonRedistributable: false`                | indicator metadata `origins[0]`; chart `citation`               |
| OWID dataset: `datasetName` = "Annual surface temperatures and anomalies by country", `datasetVersion` = `2026-10-12`, `updatedAt` = `2026-10-13T08:42:32.000Z`                                                                                                                                                       | indicator metadata                                              |
| Data span: 1940-2025 (the metadata `timespan` says 1940-2026 but no 2026 row exists), annual, 213 entities in the full CSV (570 KB): 193 countries (all in the shared crosswalk), `OWID_KOS`, `OWID_WRL`, and 18 `(NIAID)` land/sea regions with an **empty** code. Antarctica and a few micro-states are absent      | `csvType=full`                                                  |
| **Country values cover land inside the borders only; the World value covers land and ocean.** Small countries are less reliable (resolution of the grid)                                                                                                                                                              | indicator `descriptionProcessing`                               |
| **The chart opens on its map tab.** `csvType=filtered` without `tab` ignores `country` (all 180 countries returned) and, with `time=1940..2100`, returns only two rows per entity (1940 and 2025); without `time`, only 2025. `tab=chart` applies `country` and `time` normally (76 rows per entity for `1950..2026`) | requests with and without `tab=chart` / `tab=line`              |
| With `tab=chart&country=<allowlist>&time=1950..<year>` the response has 195 entities x 76 years = 14 820 rows, no missing value in the 1950-2025 window                                                                                                                                                               | analysis of the full CSV, filtered the same way                 |
| World: 2025 = +0.59 °C, warmest year in 1950-2025 = 2024 at +0.72 °C, coldest = 1956 at -0.85 °C. Negative values are common (65 of the 86 World years since 1940 are below zero), so the chart must handle polarity                                                                                                  | World series                                                    |
| Payload (year-aligned arrays, 2 decimals): 94 KB raw, **25.6 KB gzipped** (1 decimal: 16.4 KB, 3 decimals: 34.8 KB)                                                                                                                                                                                                   | built from the real data with a placeholder alpha-2             |
| The chart `.metadata.json` is 3.5 KB, HTTP 200, CORS open; the existing dependencies check keeps probing the CO2 chart's metadata, which covers the same host                                                                                                                                                         | headers                                                         |

### Why this chart

| Chart                                                                                                        | Verdict                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `annual-temperature-anomalies` (Copernicus ERA5, per country, baseline 1991-2020)                            | **Chosen.** The only OWID chart with per-country annual anomalies; reuses the country combobox with World as default; licence is usable commercially with a credit line |
| `temperature-anomaly` (HadCRUT5, World + hemispheres from 1850, baseline 1961-1990, with uncertainty bounds) | Rejected for this change: no countries, so the page would have no explorer. It stays the fallback if the per-country source ever disappears (World + hemispheres only)  |
| NOAA, NASA GISTEMP, Berkeley Earth (country series, CC BY)                                                   | Not OWID-backed; a different provider is a separate change                                                                                                              |

The fallback was not needed: per-country annual data exists under a licence that allows this use. Its caveat is the credit line (section 5).

## 2. API: shape of the endpoint

`GET /api/v1/global-temperature` -> `ApiResponse<GlobalTemperatureData>`:

```ts
// packages/shared/src/lib/country-series.ts
export interface CountryEntity {
  code: string; // alpha-3, or OWID_WRL / OWID_KOS
  iso2: string | null; // null for World
  name: string;
}
export interface DatasetIdentity {
  name: string;
  version: string;
}

// packages/shared/src/lib/global-temperature.ts
export interface GlobalTemperatureEntity extends CountryEntity {
  /** °C relative to the baseline, 2 decimals. Index i is the year startYear + i. null = no data. */
  anomaly: (number | null)[];
}
export interface GlobalTemperatureOrigin {
  notice: string; // 'Contains modified Copernicus Climate Change Service information (2026)'
  producer: string; // 'Copernicus Climate Change Service'
  title: string; // 'ERA5 monthly averaged data on single levels from 1940 to present'
  url: string; // dataset page at the Climate Data Store
  license: string; // 'Copernicus License'
  disclaimer: string; // Copernicus no-liability sentence
}
export interface GlobalTemperatureData {
  startYear: number; // 1950
  endYear: number; // latest year with any value
  unit: string; // '°C'
  baseline: { startYear: number; endYear: number }; // 1991-2020
  dataset: DatasetIdentity; // OWID dataset: name + version
  origin: GlobalTemperatureOrigin;
  entities: GlobalTemperatureEntity[]; // World first, then countries by name
}
```

Envelope: `{ success: true, status: 200, data, meta: { source: { ...OWID_PUBLISHER, lastUpdated }, fetchedAt } }`, with `lastUpdated` the indicator's `updatedAt`.

Decisions:

- **`unit` and `baseline` are in the payload**, as `units` and `dataset` are for CO2: the page never hard-codes a unit or a reference period.
- **The upstream `origin` is in the payload.** `meta.source` is OWID's publisher definition by contract; the Copernicus credit is a property of this dataset, so it lives in `data`. The strings are constants of the module (`global-temperature.constants.ts`); only the year of the notice is derived (from the start of `datasetVersion`, which equals the year OWID prints in its own citation). Reading `origins` from the metadata would widen the client for one consumer, and a drift is caught elsewhere (the baseline guard below, plus the manual check in the tasks).
- **No `-0`.** Rounding goes through `roundTo`, which normalizes the sign of zero; JSON would serialize `-0` as `0` anyway, but the unit test is on the in-memory value.

### The request

```
getGrapherSeries('annual-temperature-anomalies', {
  column: 'temperature_anomaly',
  tab: 'chart',                       // mandatory, see below
  country: listCountryEntityCodes(),  // same allowlist as CO2
  timeRange: { from: 1950, to: <current UTC year - 1> },
})
getIndicatorMetadata(1325256)
```

Two requests (CSV + metadata), both cached 24 h by `OwidClient`.

- **`to` is the previous calendar year.** CO2 passes the current year because annual totals are published after the year ends. An annual temperature mean for a year in progress would be a partial-year mean that looks like a full one; the provider's metadata already advertises a `timespan` of "1940-2026" while the data stops at 2025, so the provider itself is ambiguous about the current year. Capping at the previous year makes the contract independent of that. The cost: in early January the new last year may not be published yet, in which case `endYear` is simply the last year with data.
- **`tab: 'chart'` is a correctness requirement, and a trap.** Without it the call "works" (HTTP 200, valid CSV with the right header) but returns a single year for every entity and ignores `country`, which would silently produce a one-point chart. Two defences: the client option itself (section 3) and a `ProviderDataError` when World has fewer than two years of values.
- **Allowlist reuse.** `listCountryEntityCodes()` is the same list CO2 uses, so countries absent from this dataset (Antarctica, micro-states) are simply missing from the combobox. No per-category allowlist is needed.

### The baseline guard

The baseline (1991-2020) is not a field in the data; it is prose in the chart subtitle and in the indicator's `descriptionShort`. A site that labels every number "relative to 1991-2020" must not keep doing so after OWID or Copernicus move to a newer reference period (the WMO convention updates every 30 years, next in 2031). So `OwidIndicatorMetadata` gains `descriptionShort: string | null` and the service checks that it contains the baseline written `1991-2020` or `1991–2020`. A mismatch is a `ProviderDataError` (502 + an error log naming the expectation), the same treatment as any other provider contract change. This is stricter than CO2, which has no equivalent "label depends on prose" risk.

## 3. API: OWID client changes (backwards compatible)

- `OwidGrapherSeriesOptions.tab?: 'chart' | 'map' | 'table'`. When set, `tab=<tab>` is appended after `useColumnShortNames=true` and the cache key gets `:tab=<tab>` appended. When unset the URL and key are byte-identical to today, so every existing request, fixture and cached entry (CO2) is untouched. Validated against the allowed set before any network call (`OwidInvalidParameterError`).
- `OwidIndicatorMetadata.descriptionShort: string | null`: parsed when present (string), `null` when absent, `OwidParseError` when present with another type. Existing fixtures that lack it parse to `null`; the only existing assertions that change are whole-object comparisons of parsed metadata, which gain `descriptionShort: null`.
- No change to the CO2 request: its chart opens on the chart tab, and adding `tab=chart` there would change its URL, cache key and fixtures for no benefit (a non-goal).

## 4. What is generalized, and what is not

The test for extracting is: the same code, written a second time, with only names and a few strings different. Anything where the second category differs in structure stays in the category.

### API (`apps/api`)

| Piece                                                                                                                                                                                                                                  | Decision                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `indexAllowed`, `alignValues`, end-year detection, per-entity assembly, all-null drop, `iso2`, World-first ordering, the two `ProviderDataError`s, `round`, `latestTimestamp`                                                          | **Generalized** into `common/series/build-year-aligned-entities.ts` as `buildYearAlignedEntities({ label, startYear, allowedCodes, measures })`, generic over the measure keys (`total`/`perCapita` for CO2, `anomaly` here). `roundTo` and `latestTimestamp` are exported next to it. `common/` does not import from `modules/` |
| `{ success, data, status, meta: { source: { ...OWID_PUBLISHER, lastUpdated }, fetchedAt } }`                                                                                                                                           | **Generalized** as `buildOwidEnvelope(data, lastUpdated)` in `providers/owid/`; both controllers use it                                                                                                                                                                                                                          |
| Units and rounding (tonnes -> Mt, 3 dp; per capita 2 dp; anomaly 2 dp), constants (slugs, columns, indicator ids, start year), the service (`Promise.all` of requests, `registerCategory`, `recordProviderUpdate`), controller, module | **Stay per category.** They are the category                                                                                                                                                                                                                                                                                     |
| The baseline guard, the origin constants, the `to: previous year` rule, the two-year World check                                                                                                                                       | **Stay in the temperature service**: they exist because of this dataset                                                                                                                                                                                                                                                          |
| `OwidProviderStatus`, health indicator, `ProviderError` mapping                                                                                                                                                                        | **Already generic, unchanged**                                                                                                                                                                                                                                                                                                   |

`buildCo2EmissionsData` keeps its name, input and output; it becomes about 25 lines composing the builder. The refactor is verified by serializing its output for the committed fixtures before and after (byte-identical) and by the untouched existing tests.

A generic _service_ base class was considered and rejected: the two services share a shape (a few `await`s and two calls on `OwidProviderStatus`) but not enough lines to pay for an inheritance hierarchy, and the third category may fetch differently (multi-column charts, indicator API).

### Web (`apps/web`)

| Piece                                                                                                          | Decision                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer card: section + `h2` + combobox + controls row + selected-code state (`Co2Explorer` minus the metric) | **Generalized** as `CountryExplorer` (`heading`, `entities`, `controls`, `children(entity)`). `Co2Explorer` keeps the metric state and the Total/Per capita radio group and renders into it  |
| `h3` chart title + `LazyEChart` + hidden live region                                                           | **Generalized** as `charts/ChartPanel`                                                                                                                                                       |
| `<details>` + scroll region + table with year rows newest-first and em dashes (`Co2DataTable`)                 | **Generalized** as `YearDataTable` (`caption`, `entityName`, years, `columns: { header, values, format }[]`). `Co2DataTable` becomes a wrapper that supplies its two columns and its caption |
| The "Data: ... version ... updated ... All data sources" paragraph                                             | **Generalized** as `DataAttribution` (`testId`, `meta`, `dataset`, optional `extra` for the upstream credit)                                                                                 |
| `isNumberOrNullArray`, `hasStrings`, the aligned-entities part of the guard, `listYears`                       | **Generalized** into `lib/payloadGuards.ts` (`isYearAlignedCountryData(data, measureKeys)`) and `lib/yearRange.ts`                                                                           |
| The `meta`-required fetch plus the `if (!meta) throw`                                                          | **Generalized** as `fetchPayloadFromBff` in `bffFetch.ts`                                                                                                                                    |
| schema.org skeleton and `licenseUrl` (`co2StructuredData.ts`)                                                  | **Generalized** as `datasetJsonLd.ts` (`buildDatasetJsonLd`, `licenseUrl`); `buildCo2DatasetJsonLd` is a wrapper returning the exact same object                                             |
| Key figures, chart options, number formatting, fetch lib, content component, structured-data fields, page copy | **Stay per category.** Their logic differs in kind: two measures vs one signed measure, tonnes vs °C, reference line vs none                                                                 |
| The `mt-8 w-full flex justify-center` wrapper in `categoryPages.tsx`                                           | **Stays duplicated** (three one-line wrappers); a helper would not remove any decision                                                                                                       |
| `CountryCombobox`, `CountryFlag`, `LazyEChart`, `EChart`, `JsonLd`, `SourceAttribution`                        | **Already generic, unchanged**                                                                                                                                                               |

`CountryExplorer` uses a render function rather than slots so the CO2 explorer can render its chart, attribution and table from the selected entity and its own metric state without lifting that state into the shell. The shell is deliberately small (state, layout, combobox): everything with a chart or a table in it stays outside, which is what keeps it from becoming a configuration language.

## 5. Web: the page

### Components and files

```
components/
  CountryExplorer.tsx            # generic, 'use client'
  YearDataTable.tsx              # generic
  DataAttribution.tsx            # generic, server
  charts/ChartPanel.tsx          # generic, 'use client' (h3 + LazyEChart + live region)
  co2-emissions/                 # Co2Explorer, Co2DataTable, Co2EmissionsContent rebuilt on the above
  global-temperature/
    GlobalTemperatureContent.tsx     # server: intro, key figures, explorer, attribution + Copernicus credit, note, JsonLd
    GlobalTemperatureKeyFigures.tsx  # server
    GlobalTemperatureExplorer.tsx    # 'use client': CountryExplorer + ChartPanel + YearDataTable
lib/
  globalTemperature.ts               # server-only fetch + guard
  globalTemperatureChartOption.ts    # pure option builder
  globalTemperatureStructuredData.ts # fields for the generic builder
  datasetJsonLd.ts  payloadGuards.ts  yearRange.ts
  formatNumber.ts                    # + formatAnomaly, formatAnomalyAxis
```

### Signed formatting

`formatAnomaly(value)`: `Intl.NumberFormat('en-US', { signDisplay: 'exceptZero', minimumFractionDigits: 2, maximumFractionDigits: 2 })` with the ASCII `-` replaced by U+2212 (`+0.59`, `−0.45`, `0.00`). `formatAnomalyAxis(value)`: same with at most 1 decimal (`+0.5`, `−1`, `0`). The real minus sign is required by the brief and avoids the hyphen being read, or wrapped, as a separator in a tooltip or a screen reader line. Fixed `en-US` keeps server and client identical. These two functions are the only place a sign is produced.

### Key figures

Two server-rendered sentences from the World entity of the same payload:

- "In **2025** the world's average surface temperature was **+0.59 °C** relative to the 1991–2020 average."
- "The warmest year since 1950 was **2024**, at **+0.72 °C**."

Wording decisions beyond the brief: (a) "relative to" instead of "above" keeps the sentence true for negative values and for countries; (b) "since 1950" instead of "on record" because the page's series starts in 1950 (the provider has 1940), so "on record" would overclaim; (c) the year in the first sentence is the latest year with a World value, skipping trailing nulls; ties for the maximum name the most recent year; (d) the baseline and first year come from the payload. The brief's example "+1.2 °C" does not match this dataset: the World anomaly against 1991-2020 is +0.59 °C. The familiar "about 1.2-1.5 °C of warming" is against pre-industrial times and belongs to another dataset; the methodology note says so explicitly.

### Chart option

`buildGlobalTemperatureChartOption(entity, data)`: `baseChartOption()` plus a year category axis (`listYears`), a value axis with signed compact labels (`formatAnomalyAxis`), one line series (`showSymbol: false`, `connectNulls: false`, first palette color from the theme, no `color` in the option), tooltip with `valueFormatter` -> `−0.45 °C` / "No data", no legend, and on the series a `markLine` at `yAxis: 0` (`silent`, `symbol: 'none'`, dashed, label `1991–2020 average` built from `data.baseline`). The option names no color.

The reference line's stroke and label need theme colors, and ECharts takes them from series-level `markLine` defaults. The theme adapter gains two roles in `CHART_UI_TOKENS` (`referenceLine` -> `fg-muted`, `referenceLabel` -> `fg-secondary`, both existing tokens, validated surfaces) and emits them as the theme's `markLine` entry. This is the one place the design relies on ECharts behavior that was not exercised in this repository, so the task list starts with a short spike (stop if it fails); the fallback is the horizontal axis line at zero (`axisLine.onZero`, already themed through `line`), with the label as a text element, which keeps the "no colors in options" rule either way. `MarkLineComponent` is registered in `echartsSetup.ts` (the module every chart page loads); its gzipped cost is measured with the `analyze` target and recorded in `libraries.md`. Rule 3 of the design system ("heavier features register where used") is not violated: the component is a few KB, and `echartsSetup` is only loaded by chart pages.

Single categorical color on purpose. A blue-red diverging encoding of the sign is the "first change that encodes polarity" the design system anticipates for the divergent palette, and that palette needs validation that is not part of this change. A line crossing a labelled zero line already encodes polarity without color, which also holds up for color-vision deficiency.

### Data table

`YearDataTable` with one column: "Anomaly (°C vs 1991–2020 average)", signed values, em dash for `null`. Caption: "Argentina: annual temperature anomaly relative to 1991–2020, 1950–2025". Rows newest first, collapsed by default, same a11y behavior as CO2.

### Attribution, credit and methodology

`DataAttribution` renders "Data: Our World in Data (CC BY 4.0). Annual surface temperatures and anomalies by country, version 2026-10-12, updated 13 Oct 2026. All data sources". Its `extra` carries the upstream credit from `data.origin`: "Contains modified Copernicus Climate Change Service information (2026): ERA5 monthly averaged data on single levels from 1940 to present (Copernicus License)", with the title linked to `origin.url`, followed by the disclaimer text. The licence asks for the credit wherever the information is shown, so it sits with the attribution under the chart, not on `/data-sources/`.

Methodology note, four sentences: what an anomaly is (a year's average surface air temperature minus the baseline-period average for the same place); that the baseline is a recent reference period, so the values are not warming since pre-industrial times; that country values cover land inside borders while World covers land and ocean, so a country and the world are not directly comparable; that small countries are less reliable because of the data's resolution.

### Metadata and JSON-LD

Description (141 characters): "Global temperature by country since 1950: how far each year's surface temperature is from the 1991–2020 average. Data from Our World in Data." Title and `<h1>` stay "Global Temperature". JSON-LD through `buildDatasetJsonLd` with `name` "Annual temperature anomalies by country, 1950–2025", a description that states the baseline and the land-vs-World coverage, one `variableMeasured` (unit `°C`), and `isBasedOn` as a list of two datasets: the OWID dataset (name, version, publisher OWID) and the upstream ERA5 dataset (publisher Copernicus Climate Change Service, URL from `origin`). Validated with the Schema.org validator against real data, as for CO2.

### Registry and rendering mode

`CATEGORY_PAGES['global-temperature']` with `load: getGlobalTemperature` and the same wrapper. Registering removes it from `generateStaticParams` (9 placeholders left). ISR, `revalidate = 86400`, `maxDuration = 30` unchanged. A BFF `502` is a failed attempt exactly as for CO2.

## 6. E2E and fixtures

- `e2e/fixtures/owid/annual-temperature-anomalies.csv`: header `entity,code,year,temperature_anomaly`, rows for World, Argentina, United States and Kosovo for 1950-2025 trimmed from the real full CSV, with Argentina's 1960 value blank (the null year) and negative values in the early years. The fixture server ignores the query string, so the `tab=chart` request is asserted in API unit tests, not in E2E.
- `e2e/fixtures/owid/indicator-1325256-metadata.json`: trimmed capture (`datasetName`, `datasetVersion`, `updatedAt`, `descriptionShort` with the 1991-2020 text, entities used).
- `OWID_FIXTURE_ROUTES` gains `/grapher/annual-temperature-anomalies.csv` and `/v1/indicators/1325256.metadata.json`; its unit test is extended. `run-dev-servers.ts` and `api-env.ts` need no change (the server is generic).
- `global-temperature.spec.ts` mirrors `co2-emissions.spec.ts` minus the toggle and flag-network cases (the flag request budget is already covered by the CO2 spec; the shared combobox is unchanged), plus: signed key figures in the raw HTML, U+2212 and an em dash in Argentina's table, the Copernicus credit text, the single JSON-LD `Dataset` with two `isBasedOn` entries, and the absence of any radio group. `a11y.spec.ts` adds the page in light, dark and with the listbox open.

## 7. Documentation

- `docs/design-system.md`: signed formatting rule, labelled zero reference line, no toggle for single-measure charts, one color + pending divergent, upstream credit line, chart rule 3 (mark line registered). `docs/technical/libraries.md`: measured mark line cost; second chart page.
- `docs/data-sources/global-temperature.md`: record the verified OWID chart (slug, column, indicator id, baseline, span, licence/credit, the `tab=chart` trap, land-only vs World) in the OWID section and correct "pre-industrial baselines" in the intro.
- `AGENTS.md`: the recipe gains the generic pieces ("start from `buildYearAlignedEntities`, `CountryExplorer`, `YearDataTable`, `DataAttribution`, `buildDatasetJsonLd`") and a line on checking the chart's default tab; the structure tree gains `common/series/`, `modules/global-temperature`, `components/global-temperature/` and the new shared files. READMEs: endpoint tables and trees.
- `ROADMAP.md` (Spanish, IDs allowed inside it): delete the completed `global-temperature` phase block; the remaining energy-sources phase becomes the first phase and every cross-reference is renumbered (see tasks); the "Datos reales" row and the success criterion say two OWID-backed categories are live; the action plan item and the difficulty line refer to the remaining phase only; the energy-sources visualization note stays; test counts and date refreshed.

## 8. Alternatives considered

| Topic                 | Chosen                                                     | Rejected and why                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart                 | `annual-temperature-anomalies`                             | `temperature-anomaly` (World + hemispheres only; no explorer). Kept as fallback                                                                                                                                                                                 |
| Getting all countries | `tab=chart` on `csvType=filtered`                          | (a) `csvType=full`: 570 KB with 18 unaddressable regions and the whole history, and it needs a client contract change anyway; (b) indicator API (`1325256.data.json`, 427 KB): needs entity-id resolution through the metadata and ships aggregates and 1940-49 |
| Client change         | Optional `tab` on the existing method                      | A new `getGrapherMapSeries` method: duplicates the cache and URL logic for one parameter                                                                                                                                                                        |
| Upstream credit       | In the payload (`data.origin`), shown with the attribution | Hard-coded in the web app (violates "names and licenses come from the API"); new fields on `meta.source` (changes the shared attribution type used by water footprint and the catalog)                                                                          |
| Baseline label        | Constant + guard against the provider's description        | Constant only (silent mislabel on a baseline change); parsing the baseline out of prose into the payload (brittle and still unverifiable)                                                                                                                       |
| Upper year bound      | Previous calendar year                                     | Current year (a partial-year mean could be served as an annual value)                                                                                                                                                                                           |
| Explorer extraction   | Shell with a render function                               | A fully configurable explorer (controls, chart, table by config): a configuration language for two users. Duplicating the explorer: the whole point of this change                                                                                              |
| Anomaly color         | One categorical color + zero line                          | Diverging blue/red: needs the pending divergent palette and its validation                                                                                                                                                                                      |
| Key figure phrase     | "relative to the 1991–2020 average"                        | "above": wrong for negative values; "warmer than pre-industrial": a different baseline                                                                                                                                                                          |

## 9. Risks

| Risk                                                                                                | Mitigation                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A request without `tab=chart` looks valid and returns one year per entity                           | The option is explicit in the service; unit test on the URL; `ProviderDataError` when World has < 2 years; the manual check against real OWID records the row count; the recipe in `AGENTS.md` mentions the default tab |
| OWID changes the baseline or the chart structure                                                    | Baseline guard -> 502 + log; column and header checks already exist                                                                                                                                                     |
| The Copernicus licence terms differ from what OWID's metadata implies                               | OWID flags the data as redistributable and names the licence; the page carries the credit and disclaimer. **Open question 1**: confirm the licence for the site's use before release                                    |
| Country values are land-only and World is land + ocean; a reader may compare them                   | Methodology note says so; the chart title names the entity; World is the default                                                                                                                                        |
| Provider data for the current year is partial or revised                                            | Upper bound is the previous year                                                                                                                                                                                        |
| ECharts does not apply the theme's `markLine` entry to series mark lines                            | Spike first; fallback uses the themed axis line at zero. Either way no color in options                                                                                                                                 |
| Refactoring CO2 breaks its behavior                                                                 | Extraction first, with the existing CO2 unit and E2E suites as the safety net and a before/after serialization check on the API; no assertion changes allowed except imports and mocks of moved internals               |
| `CountryExplorer` grows options until it is a framework                                             | The shell stays state + layout + combobox; anything with a chart or a table is outside it. A third category that needs more adds it deliberately                                                                        |
| Payload / bundle growth                                                                             | 26 KB gzipped payload; mark line measured and recorded                                                                                                                                                                  |
| Combobox lists World plus the 194 countries the dataset covers (195 entities), fewer than CO2's 217 | Natural consequence of data coverage; no empty entries                                                                                                                                                                  |
| Year rollover changes the cache key (`time` upper bound)                                            | One cache miss per year; accepted (same as CO2)                                                                                                                                                                         |
| Existing tests that count placeholders (10) or name the placeholder copy of this category           | Listed in the tasks (`categoryMetadata`, `categoryPages`, `[category]/page`, `seo.spec`, `pages.ts`)                                                                                                                    |

## 10. Test strategy

- `shared`: type-level tests for the new types; CO2 type tests untouched.
- `api`: client (`tab` in URL and key, omitted tab unchanged, invalid tab, `descriptionShort` present/absent/wrong type); generic builder (merge, gaps, allowlist, ordering, errors with label, `roundTo(-0.001)`); CO2 suites untouched plus the before/after serialization check; envelope helper; temperature builder and service (fixtures captured once; negative, near-zero, null year, aggregate, unknown code; request URL carries `tab=chart`, `column`, `country`, `time=1950..<previous year>`; failures and the map-tab response -> 502; baseline mismatch/absent -> 502; dataset version without a year -> 502; catalog lists both categories under one `owid` entry; `AppModule` boots with both; dependencies check still one `owid`); payload-size sanity test (< 40 KB gzipped on a synthetic full-size dataset); Swagger assertions.
- `web` unit: tokens test (UI tokens still used), adapter (reference line colors light/dark), `EChart` with a mark line, `ChartPanel`, `CountryExplorer`, `YearDataTable`, `DataAttribution`, `payloadGuards`, `yearRange`, `datasetJsonLd` (+ CO2 wrapper equality), `fetchPayloadFromBff`, `formatAnomaly`/`formatAnomalyAxis`, the temperature fetch lib, chart option (no colors, mark line label from the baseline, gaps, signed tooltip), key figures (signs, ties, trailing nulls, baseline from payload), explorer, content (credit, methodology, one `/data-sources/` link, one JSON-LD), registry and metadata counts. CO2 suites run unchanged.
- `web` E2E: as section 6; the full suite in five projects, including the unchanged CO2 spec.
- Manual: real OWID check (row count, `tab=chart`, baseline guard passes, payload size, gzipped size) and the Schema.org validator.

## 11. Decisions beyond the brief

1. `tab` option on `OwidClient` (the brief did not anticipate the map-tab behavior) and its trap guard (World needs >= 2 years).
2. Baseline guard through `descriptionShort`.
3. Upper bound = previous calendar year.
4. Upstream Copernicus credit in `data.origin` and on the page; `CountryEntity`/`DatasetIdentity` shared types.
5. Key-figure wording ("relative to", "warmest year since 1950") and the fact that the real World anomaly is +0.59 °C, not +1.2 °C.
6. `MarkLineComponent` registered in the shared chart setup, reference-line colors via two new chart UI token roles (existing tokens, no new CSS variable).
7. Extraction list (section 4), including `buildOwidEnvelope` and `fetchPayloadFromBff`, which the brief did not name.
8. 1950 as the start year although the provider has 1940 (matches CO2; flagged as a product question).

## 12. Open questions

**Technical**

1. The Copernicus licence text was not read in full during this proposal (OWID's metadata names it `Copernicus License` and marks the data redistributable). A task asks the coder to read the licence page and confirm that commercial use with advertising needs only the credit line and disclaimer implemented; stop and ask if it says otherwise.
2. The mark line theme spike (section 5) may need the fallback.
3. Should the dependencies health check also probe the temperature chart's metadata? Not done: one indicator per provider, and the OWID host is the same. A renamed temperature chart would surface as `502` on the endpoint and in logs, not in the dependencies check.

**Product**

1. Start year: 1950 (as CO2) or 1940 (all the provider offers, +10 years, about +3 KB gzipped)?
2. The key-figure framing against 1991-2020 gives a modest number (+0.59 °C) next to the well-known pre-industrial figures. Is that the intended headline, or should the page add a second, pre-industrial figure from a different dataset in a later change?
3. Should `/data-sources/` list upstream origins such as Copernicus (needs a catalog model change), or is the credit on the page enough?
4. Country values are land-only while World includes the ocean. Keep World as the default, or open on a country to avoid the comparison?

## 13. Amendment: 1940 start, pre-industrial series, upstream origins in the catalog

Orchestrator decisions, verified against live sources on 25 Oct 2026. Where this section differs from sections 1-12, **this section wins**; the earlier text is kept as the record of the first implementation.

### 13.1 Decisions that supersede earlier text

| Earlier text                                                                           | Now                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-country series starts in 1950; "warmest year since 1950"; description "since 1950" | Starts in **1940**, the provider's full span (about +3 KB gzipped); "warmest year since 1940"; description "...by country since 1940: ..." (141 characters). CO2 stays at 1950                                                    |
| Product question 1 (start year), 3 (catalog origins), 4 (World default)                | Decided: 1940; origins in the catalog for all OWID categories; World stays the default and the land-only vs land-and-ocean note stays                                                                                             |
| ERA5 license `Copernicus License`; `GlobalTemperatureOrigin` with a string license     | ERA5 is listed as **CC BY 4.0** (the Climate Data Store page lists CC-BY; OWID's metadata still says "Copernicus License"). One shared `DataSourceOrigin` type with `license: { name, url }`, replacing `GlobalTemperatureOrigin` |
| `data.origin` strings are constants of the temperature module, catalog untouched       | The static origin constants are the **single source of truth**: they feed `registerCategory` (catalog) and the payload (`data.origin`, `data.global.origin`). Nothing else writes origin text                                     |

### 13.2 Verified facts for the pre-industrial series

| Fact                                                                                                                                                                                                   | Evidence                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Chart `temperature-anomaly` (Met Office Hadley Centre, HadCRUT5), "Temperature change relative to the pre-industrial period"; entities `OWID_WRL`, `OWID_NH`, `OWID_SH` (hemispheres ignored)          | chart metadata, filtered CSV |
| Columns: `near_surface_temperature_anomaly` (indicator **1325020**, the mean), `..._lower` (**1325021**) and `..._upper` (**1325022**), the 95% confidence bounds, unit degrees Celsius                | chart and indicator metadata |
| Baseline **1861-1890** ("pre-industrial", as recommended by the source); indicator 1325020's `descriptionShort` says "...compared to the 1861-1890 mean"; the bound indicators have no description     | indicator metadata           |
| Span 1850-2026; **2026 is a partial year** (a row exists with 1.41) so the upper bound is the previous year, as for ERA5. 176 World rows for 1850-2025. World 2025 = +1.41 °C, warmest 2024 = +1.53 °C | `tab=chart&country=OWID_WRL` |
| `updatedAt` 2026-10-13T08:33:29Z, dataset "Climate Change Impacts - Annual" version 2026-10-12; origin license in OWID: Open Government Licence v3 (Met Office terms page)                             | indicator metadata           |
| `tab=chart` works here as for ERA5; the three columns come from one CSV (the client caches the full table, so three `getGrapherSeries` calls with different `column` are one download)                 | existing client behavior     |
| Added payload size: 2.8 KB raw, **0.9 KB gzipped**; whole `data` about 106 KB + 3 KB raw and about **30 KB gzipped** (entities from 1940: 28.6 KB)                                                     | built from the real data     |

### 13.3 Payload

```ts
interface GlobalTemperatureGlobal {
  startYear: number; // 1850
  endYear: number;
  baseline: { startYear: number; endYear: number }; // 1861-1890
  mean: (number | null)[]; // °C vs baseline, 2 decimals, index i = startYear + i
  lower: (number | null)[]; // 95% bound
  upper: (number | null)[];
  dataset: DatasetIdentity;
  origin: DataSourceOrigin; // HadCRUT5
}
// GlobalTemperatureData gains `global: GlobalTemperatureGlobal`; `origin` becomes a DataSourceOrigin (ERA5).
// Co2EmissionsData gains `origin: DataSourceOrigin` (Global Carbon Project), attached by the service so
// buildCo2EmissionsData output stays identical.
```

The global block is World-only, so it does not use the entity builder; it reuses the same year alignment through a small exported `alignSeriesToYears`. The service makes the global calls in the same `Promise.all` (three `getGrapherSeries` calls sharing one cache entry, plus `getIndicatorMetadata(1325020)`); any failure is a `502` for the whole endpoint, never a partial payload. A baseline guard on indicator 1325020 (`1861-1890`) works exactly like the ERA5 one. `meta.source.lastUpdated` becomes the latest `updatedAt` of all indicators used.

### 13.4 Origins as catalog data

`LiveDataSource.origins: LiveDataSourceOrigin[]` with `DataSourceOrigin = { producer, title, url, license: { name, url }, notice?, citation?, disclaimer? }` plus `categories`. `OwidProviderStatus.registerCategory(category, origins)` stores them statically; `getDataSources()` merges an origin registered by several categories (key `producer + title`) and sorts by producer, title. The catalog needs no OWID call (the notice year of ERA5 is appended only in the payload, where the dataset version is known). `/data-sources/` renders them under OWID in a "Data produced by" sub-list. Deploy-skew tolerance: the web guard for the catalog accepts a provider without `origins` and renders none, so a web deploy ahead of the API does not break the page. Origins registered: CO2: Global Carbon Project (CC BY 4.0); temperature: C3S ERA5 (CC BY 4.0, notice + disclaimer + DOI citation) and Met Office HadCRUT5 (OGL v3.0, notice + Morice et al. 2021 citation).

### 13.5 Page additions

- **Key figure:** "In 2025 the world was +1.41 °C warmer than the 1861–1890 (pre-industrial) average." next to the 1991–2020 sentence; non-positive values read "relative to". Both baselines are named, so the two figures cannot be confused.
- **Second section** below the explorer, no selector: `h2`, a `ChartPanel`-style title, a chart mounted through the new generic `RenderWhenVisible` (skeleton until it intersects the viewport, then the lazy ECharts chunk; design-system chart rule 5), its own `YearDataTable` (mean, lower, upper), attribution with `DataAttribution` + `OriginCredit` for Met Office, and the methodology sentence on the 1.5 °C threshold (a long-term average, not a single year).
- **Chart option** `buildGlobalSeriesChartOption(global)`: mean line (first palette color), band as two stacked series (invisible base at `lower`, `upper - lower` with `areaStyle.opacity` about 0.2, series color via the theme palette, nothing named), a `markLine` with two entries (0, labelled with the baseline; 1.5, labelled "1.5 °C (Paris Agreement limit, long-term average)", dotted so the two are distinguishable without color). Tooltip via a formatter that prints the year, the signed mean and "95% range −x to +y" so the band is not listed as a series. The theme's reference-line colors already exist (task 4.2).
- **Generic additions:** `OriginCredit` (renders a `DataSourceOrigin`), `RenderWhenVisible`, and the band capability in the chart foundation. The attribution paragraph on both CO2 and temperature pages now carries an origin credit through `DataAttribution.extra`.
- **JSON-LD:** still one Dataset; `temporalCoverage` becomes the union `1850/endYear`, two `variableMeasured` entries, `isBasedOn` with three datasets (OWID, ERA5, HadCRUT5), name/description cover both baselines.
- **E2E:** fixture server gains `temperature-anomaly.csv` (World with bounds from 1850, one blank bound, hemisphere rows that must be ignored, no partial-year row) and indicator 1325020 metadata; the per-country fixture starts in 1940. CO2 and data-sources specs gain only the new origin assertions.

### 13.6 Additional alternatives and risks

| Topic / risk                                                          | Decision / mitigation                                                                                                                                                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate endpoint for the global series                               | Rejected: one page, one fetch, one JSON-LD; 0.9 KB gzipped does not justify a second request or cache path                                                                                                      |
| Reading origins from OWID metadata (`origins[]`) instead of constants | Rejected: needs OWID calls at boot for the catalog and widens the client; constants are the single source and a drift is visible in review. OWID's license names differ from the ones adopted (Copernicus, OGL) |
| Band as a `custom` series or `visualMap`                              | Rejected: the stacked-area technique needs only registered components and the theme                                                                                                                             |
| Interval drawn on the first (per-country) chart                       | Out of scope: the per-country chart has no intervals                                                                                                                                                            |
| The 1.5 °C line suggests a breach in single years                     | Label says "long-term average" and a methodology sentence states that single years above it do not by themselves breach the limit                                                                               |
| License adopted for ERA5 (CC BY 4.0) differs from OWID's text         | Decided by the orchestrator from the Climate Data Store page; the notice and disclaimer are kept as the license asks                                                                                            |
| Two data tables and two charts on one page                            | Second chart is lazy and below the fold; tables are collapsed `<details>`; payload +0.9 KB gzipped                                                                                                              |
| Web deployed before the API sees no `origins`                         | Catalog guard tolerates a missing `origins`; payload guards are strict only for the temperature/CO2 payloads that ship together with their API change (deploy API first)                                        |
| CO2 payload gains `origin`                                            | Additive; guard requires it, so the API must deploy before the web, as for any payload change                                                                                                                   |

### 13.7 Data Cache outlives deployments (found after the first dev run)

Next's fetch Data Cache (`revalidate: 86400`) persists across deployments and dev restarts. After the CO2 payload gained `origin`, cached CO2 responses written earlier failed the new strict guard on both attempts (the retry read the same entry), and the page threw. Decisions:

- **Retry past the cache on a shape mismatch.** `fetchEnvelopeFromBff` marks shape/meta failures (`BffShapeError`) and makes the next attempt with `cache: 'no-store'`; transport failures keep `next.revalidate`. A stale entry heals on the first request and the fresh response then refreshes the cache.
- **Deploy order: API first, then web**, for every payload change (CO2, temperature, catalog), so a new web never meets an older API.
- **The catalog guard is strict too.** `/data-sources/` previously tolerated a missing `origins` and silently showed a stale catalog. The guard now requires `origins` (valid origins whose categories are known categories); the "older API" tolerance is removed and a stale cached entry heals through the retry above.
- **Compact page attribution.** The page attribution is "Data: OWID link (license), updated date. Producer: title link (license link). Notice. Disclaimer. All data sources"; the OWID dataset name/version and the origin citation stay on `/data-sources/` and in the JSON-LD.
- **Chart labels and axes.** Reference-line labels are short ("1991–2020 average", "1861–1890 average", "1.5 °C") and placed away from the data line; the full explanation lives in the methodology sentence. Year axes label decades only, through one shared helper.
