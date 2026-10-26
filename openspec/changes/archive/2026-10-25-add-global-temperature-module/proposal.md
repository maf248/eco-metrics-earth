# Add the global temperature module (second OWID-backed category)

## Why

`/global-temperature/` is still an icon, a title and "coming soon". `co2-emissions` proved the whole path for an OWID-backed category (provider client -> category module -> endpoint -> Server Component -> chart) and `AGENTS.md` now documents it as a recipe. Global temperature is the first category to follow the recipe, which does two things at once:

- it gives the site its second real dataset, one that readers expect to find on a climate site;
- it is the first honest test of the "replicable pattern" claim. Several pieces written for CO2 are generic in nature but live under CO2 names (the year-aligned assembly in the API, the explorer card, the data table, the attribution paragraph, the payload guard and the JSON-LD `Dataset` builder in the web app). A second copy would be pure duplication, so this change extracts them once, behind the unchanged CO2 tests, before the third category (energy sources) copies them again.

Verifying the data against live OWID (25 Oct 2026) also showed what the recipe does not yet cover, which this change handles:

- the per-country chart (`annual-temperature-anomalies`) opens on its **map tab**, where `csvType=filtered` silently ignores the `country` filter and returns one year per entity; the client needs a way to ask for the chart tab;
- the measurements come from **Copernicus ERA5**, whose licence asks for a credit line, so the page must credit the upstream origin and not only OWID;
- the values are **anomalies against 1991-2020** (not against pre-industrial times), country values cover **land only** and World covers land and ocean, so the copy must be careful about what the numbers mean.

## Goals

1. **Endpoint:** `GET /api/v1/global-temperature` returns, in one response, the annual temperature anomaly (degrees Celsius against 1991-2020) of World and every country the provider covers, from 1950, rounded to 2 decimals, in a compact year-aligned shape (about 26 KB gzipped, measured on real data), with the same envelope, attribution (`meta.source`) and `502` failure contract as CO2.
2. **Page:** `/global-temperature/` follows the CO2 layout: intro, server-rendered key figures (World latest-year anomaly and the warmest year since 1950), a chart-scoped explorer with the country combobox (World by default), a line chart with a zero reference line labelled with the baseline, a collapsed data table as text equivalent, "Data:" attribution from the API plus the Copernicus credit, a methodology note, and schema.org `Dataset` JSON-LD. Anomalies carry an explicit sign with a real minus sign everywhere.
3. **Reuse over duplication:** extract the generic pieces once (API: a year-aligned country-entity builder and the OWID envelope; web: country explorer shell, chart panel, year data table, data attribution, payload guards, generic Dataset JSON-LD builder, fetch-with-meta helper), without changing CO2's observable behavior.
4. **OWID client:** add the `tab` option to `getGrapherSeries` and the indicator `descriptionShort` to the metadata, both backwards compatible.
5. **Honest baseline:** the API verifies the baseline against the provider's own description and fails with `502` rather than serving mislabelled data if it changes.
6. **Docs and roadmap:** record the new presentation conventions, update the recipe and structure tree, record the verified chart in the data-source notes, and close the phase in the roadmap.

## Non-Goals

- **No metric toggle.** The dataset has one measure; the explorer has nothing to switch.
- **No hemispheres, no ocean/land split, no regions or continents.** The per-country chart offers World and countries only. Hemispheric series exist in a different OWID chart (HadCRUT5, World only, different baseline) and are not mixed in.
- **No warming-since-pre-industrial figure.** That needs a different dataset and baseline; the page says explicitly that its baseline is 1991-2020.
- **No warming stripes, bar or area styles, no divergent palette.** One categorical color and a zero line; the divergent palette stays pending in the design system, and polarity-by-color styles are a later refinement.
- **No comparison of countries** (multiple lines), **no world map**, no table library, no per-country endpoint, no query parameters.
- **No monthly or seasonal data, no uncertainty bands, no projections.**
- **No per-country years before 1940** (the provider's full span). The per-country series starts in 1940 (decided in the amendment); CO2 stays at 1950.
- **No other providers** (NOAA, NASA GISTEMP, Berkeley Earth) and no live-provider freshness work.
- **No stale-data persistence** when the provider is down (same as CO2: ISR keeps the last good page).
- **No URL state, no persistence of the selection, no visitor-country detection.**
- **No change to the liveness probe, deploy workflows, security headers or CORS, and no new health indicator** (one per provider; the OWID one is reused).
- **No change to the `/data-sources/` catalog model.** The Copernicus credit lives on the page and in the payload; listing upstream origins in the catalog is a separate idea (see open questions).
- **No behavior change to CO2** beyond internals and imports.
- **No live OWID in E2E** and no new dependency.

## Impact

- **`packages/shared`:** new `country-series.ts` (`CountryEntity`, `DatasetIdentity`, with `Co2EmissionsEntity` extending the former) and `global-temperature.ts` (`GlobalTemperatureData`, `GlobalTemperatureEntity`, `GlobalTemperatureOrigin`); exports.
- **`apps/api`:** new `GlobalTemperatureModule` (controller, service, constants); new `common/series/` (generic builder, `roundTo`, `latestTimestamp`); `buildCo2EmissionsData` recomposed on it; `buildOwidEnvelope` in `providers/owid/`; `OwidClient` gains the `tab` option and `descriptionShort`; `AppModule` imports the module. No new dependency.
- **`apps/web`:** generic `CountryExplorer`, `ChartPanel`, `YearDataTable`, `DataAttribution`; `lib/datasetJsonLd.ts`, `lib/payloadGuards.ts`, `lib/yearRange.ts`, `fetchPayloadFromBff`; CO2 components rebuilt on them; new `components/global-temperature/`, `lib/globalTemperature*.ts`, signed formatters; mark line registered in `echartsSetup.ts` and reference-line colors in the theme adapter; registry entry; live meta description.
- **E2E:** the OWID fixture server gains the temperature chart CSV and indicator metadata; new `global-temperature.spec.ts`; `a11y.spec.ts`, `seo.spec.ts` and `utils/pages.ts` updated.
- **Docs:** `docs/design-system.md`, `docs/technical/libraries.md`, `docs/data-sources/global-temperature.md`, `AGENTS.md` (recipe and structure tree), `README.md`, the app READMEs, `ROADMAP.md` (close the phase, renumber, refresh status).
- **Specs:** ADDED capabilities `global-temperature-api`, `global-temperature-page`, `year-aligned-country-series`, `country-explorer`, `dataset-structured-data`; ADDED requirements in `owid-provider-client`, `shared-types`, `chart-foundation`, `bff-fetch-helper`, `presentation-docs`; MODIFIED requirements in `chart-foundation`, `category-page-registry`, `static-category-pages`, `page-metadata`.
- **Runtime/ops:** two more OWID requests per cache window per instance (one CSV, one metadata), cached 24 h; no new production dependency or secret.

## Amendment (orchestrator decisions, 25 Oct 2026)

- **Per-country series starts in 1940** (the provider's full span, about +3 KB gzipped). CO2 stays at 1950.
- **Pre-industrial context:** a second OWID series (HadCRUT5, World only, 1850-present, baseline 1861-1890, 95% confidence bounds) is served in the same endpoint and shown in a second, lazily rendered chart with a labelled 1.5 degree reference line, next to a pre-industrial key figure. The earlier non-goal about a warming-since-pre-industrial figure no longer applies; the other non-goals (hemispheres, warming stripes, divergent palette, comparisons, map) stand.
- **Upstream origins in the catalog for every OWID category:** `LiveDataSource.origins`, declared statically per category, listed on `/data-sources/` and credited next to each chart (Global Carbon Project for CO2; Copernicus C3S ERA5 and Met Office HadCRUT5 for temperature). The non-goal "no change to the data-sources catalog model" no longer applies. The static origin constants are the single source for catalog and payloads.
- CO2's behavior is unchanged except its attribution and the catalog now also show the Global Carbon Project origin.
- Impact additions: `packages/shared` (`DataSourceOrigin`, `LiveDataSourceOrigin`, `LiveDataSource.origins`, `Co2EmissionsData.origin`, `GlobalTemperatureGlobal`), `apps/api` (`OwidProviderStatus.registerCategory(category, origins)`, global series in the temperature service, `alignSeriesToYears`), `apps/web` (`/data-sources/` origins, `OriginCredit`, `RenderWhenVisible`, long-run chart section), specs ADDED `data-sources-api`/`data-sources-page` requirements and MODIFIED `owid-provider-client`, `co2-emissions-api`, `co2-emissions-page`, `shared-types`.
