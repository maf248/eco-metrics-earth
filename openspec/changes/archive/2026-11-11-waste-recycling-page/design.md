# Design

## Context

Waste & Recycling is a placeholder. The World Bank's What a Waste 3.0 country dataset
(Excel workbook, CC BY 4.0, files last updated 2026-03-11) has, for 217 countries, municipal
waste generation (measured, harmonized 2022 estimate, projections to 2050), treatment shares
and material composition. It is one snapshot per country, not a time series, so the category
is a static dataset like water-footprint: bundled JSON, no provider, no snapshot fallback.

Workbook: `https://datacatalogfiles.worldbank.org/ddh-published/0039597/DR0095901/What_a_Waste_3.0_COUNTRY_Dataset_&_Codebook.xlsx`
(sheets `Country dataset`, row 1 labels, row 2 machine keys; `Codebook`, per-measurement
year and source). Catalog page:
`https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database`.

## Goals / Non-Goals

Goals: the content listed in the proposal, commercial-safe, server-rendered key text,
reusing the existing chart, map, combobox and table components.

Non-goals: see the proposal (no OWID/UN/OECD data, no cities, no history, no auto refresh).

## Decisions

### 1. Generator script with `fflate`

`scripts/generate-waste-recycling-data.mjs <workbook.xlsx>` unzips the workbook with
`fflate` and reads the sheet XML (`xl/workbook.xml` and its rels to find the sheets by name,
`xl/sharedStrings.xml`, `Country dataset`, `Codebook`) with a small cell reader that handles
shared strings (`t="s"`), inline strings, numbers in exponent notation (`3.89E-2`) and XML
entities. It addresses columns by the machine keys of row 2, never by letter, and fails with
the missing key's name if one is absent, so a new workbook layout never writes partial data.
It writes `apps/api/src/modules/waste-recycling/data/waste-recycling.json` with stable key
order and rounded values (shares to 0.1 %, kg to 0.01, tonnes to the unit), so the output is
deterministic. The retrieval date is a required `--retrieved YYYY-MM-DD` argument (never
`new Date()`) and the source's last-update date is a constant in the script, next to the
workbook URL, so a re-run on the same workbook is byte-identical.

The workbook (~7 MB, World Bank's file) is not committed: the API README documents the
download URL and the regeneration command (`npm run data:waste-recycling -- <path>
--retrieved <date>`).

`fflate@0.8.3` (MIT, zero dependencies) is added as a pinned root `devDependency`; it is
only used by the script. Rejected: `exceljs` (stale, many transitive dependencies), `xlsx`
(SheetJS npm package is unmaintained on npm), shelling out to `unzip` (not portable on CI
runners and Windows).

### 2. Grouping and normalization

Treatment (eight groups) and composition (six groups) are grouped as in the
`waste-recycling-api` spec. A country "reports treatment" when any `waste_treatment_*` or
`waste_uncollected_percent` cell is non-blank.

**Blank is `null`, never 0.** The workbook has no explicit 0 % recycling at all; 51 of the
181 countries that report treatment, China and India among them, leave recycling blank and
put what the source did not separate into "other" or "unaccounted for" (India: 50 % other,
27 % unaccounted, "Treatment not specified in source"). Reading those blanks as 0 would show
China and India recycling nothing and pull the world figure from ~18 % to ~11 %. So a group
whose source columns are all blank is `null`; a group with some blank columns sums the
reported ones. The reported groups are scaled to sum to 100 (Bolivia reports 109 %), then
rounded with largest-remainder rounding so they still sum to exactly 100.0. Composition
follows the same rule.

Data year: max `date_of_measurement` of the country's treatment (or composition) rows in
`Codebook`; the workbook states that, without a measurement date, it is the source's
publication year, so the UI says "data year", not "measured in".

Coverage under these rules: recycling 130 countries (46 % of the world's population),
recycled or composted 134, uncollected 80, waste per person 217. "Share mismanaged" (open
dump + uncollected) was dropped: open dumping is reported by 52 countries, both parts by 30,
and a partial sum understates it. Open dumping stays visible in the treatment bars.

### 3. API module

`apps/api/src/modules/waste-recycling/` mirrors water-footprint: module, controller
(`GET /api/v1/waste-recycling`), service that loads the JSON once at start-up and validates
its shape (fails fast on a malformed file), and a data-sources contributor: one
`StaticDataSource` with `id: 'waste-recycling'`, one publication (the World Bank's suggested
citation, the catalog URL, `publishedYear: 2026`, `entryCount: 217`,
`license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }`).
`meta.source`: `{ provider: 'World Bank', license: 'CC BY 4.0', sourceUrl: <catalog URL>,
lastUpdated: '2026-03-11' }`. World totals are computed by the script, not at request time.

### 4. Optional publication license

`DataSourcePublication.license?: DataSourceLicense` (`{ name, url }`). The aggregator's
validation rejects `publisher` and `license` together. `/data-sources/` renders it after the
entry count. Water-footprint publications are unaffected.

### 5. Web page

`lib/wasteRecycling.ts` (`getWasteRecycling` via `bffFetch` + payload guard) and
`components/waste-recycling/`:

- `WasteRecyclingContent` — layout and attribution (`DataAttribution`), `Dataset` JSON-LD
  through `datasetJsonLd`.
- `WasteKeyFigures` — server-rendered text. The recycled share is tonnage-weighted over the
  130 countries that report recycling (17.63 %), with their population share (46.47 %); both
  computed by the script, stored with two decimals in the world block and rounded once, here
  ("about 18 %", "about 46 %"), so 46.47 does not read as 47.
- `WasteWorldMap` — `ChoroplethMap` with `MeasureToggle` for the four measures. Recycled and
  recycled-or-composted use a new good-is-high green ramp (`--chart-seq-good-1…5`); uncollected
  and kg per person use the existing heat ramp (fixed breaks per measure). The map, the
  legend and the chart theme take a `ramp`. Tooltip: value, data year (or "2022 estimate") and
  any part not reported. Clicking a country selects it; the table shares the selection.
- `WasteCountryTable` — collapsed (`DataTableDisclosure`, shared with the other data tables),
  search by name, competition ranks, sortable value headers with `aria-sort` (sorted by the
  selected measure until a header is pressed), "—" for no data and countries without the
  measure last, a flag beside each country that has one; the text equivalent of the map.
- `WasteComparison` — the shared selection, with `CountryCombobox` to add/remove countries
  (only countries with treatment). Default: the five most populous with treatment data — CHN,
  IND, USA, IDN, BRA. At most ten countries: when ten are selected the search is unavailable
  (`aria-disabled`, read-only) and its placeholder says so, so one must be removed to add
  another, and a live status says so.
- `WasteTreatmentBars` and `WasteCompositionBars` — thin wrappers over one generic
  `WasteGroupBars` (ECharts horizontal stacked bars, one per country, 100 %, loaded when they
  scroll near the viewport, with the table under the chart as the text equivalent). The chart and
  its placeholder (a `bars` skeleton) are as tall as the number of bars asks for (`--bar-rows`),
  and country names get a label width that fits "Russian Federation" on one line. Selected
  countries without composition are listed below as "No composition data".
- `WasteProjectionChart` — line chart 2022–2050 for the world or one country chosen with
  `CountryCombobox`, loaded when it scrolls near the viewport; the value axis follows the data
  (`scale`, padded) so the line is not squeezed against a zero baseline; note that 2030–2050 are
  World Bank projections; table equivalent.

Registry entry via `defineCategoryPage` (no provider freshness), `CATEGORY_SKELETONS` entry
(intro, key figures and the map card, down to the first chart, with neutral sample copy and
the page's own intro constant), `LIVE_CATEGORY_SUMMARIES` entry, the live meta description
and the title override in `generateMetadata`. The dataset title and citation come from the
payload (`dataset`), never from a literal in the web.

### 6. Palettes

Two palettes made of existing tokens (green and teal for recovery, brown for incineration,
blue and violet for landfills, amber and red for open dump and uncollected, charcoal for
other; six tokens for composition), chosen by searching the existing tokens for the order
with the best separation over every pair, not only the adjacent ones. Every adjacent pair
clears the CVD target (ΔE ≥ 8, protan, deutan and tritan) and the normal-vision floor (≥ 15)
in both themes. Over all pairs, tritan separation is ≥ 9.6; normal-vision separation is
≥ 15 except one dark treatment pair (12.0); and protan/deutan separation over all pairs is not
attainable for six or eight series (a green sits near a brown or a red), which is recorded as
an exception: identity is carried by the legend, tooltip and table. The numbers and every
exception are in `docs/design-system.md`.

One new sequential ramp, `--chart-seq-good-1…5` (green, light and dark values, lightness
monotonic with every adjacent gap ≥ 0.06 L), for the shares where more is better: the heat
ramp would paint the best recyclers red. The waste map uses both ramps: green for the two
recycling measures, heat for uncollected and kg per person.

## Risks / Trade-offs

- Snapshot years differ by country (2005–2024): every tooltip and table row shows its year,
  and the key figures say "latest reported".
- The workbook format may change in a future release: the script fails loudly on a missing
  machine key instead of writing partial data.
- A new dev dependency (`fflate`) — small, zero-dependency, used only by the script.
- Payload size: 217 countries ≈ 103 KB of JSON on the wire (≈ 17 KB gzip); acceptable for a cached ISR page.

## Migration Plan

None: additive. Placeholder → live through the registry.

## Open Questions

None.
