# Add the deforestation category (forest area and tree cover loss)

## Why

`/deforestation/` is still an icon, a title and "coming soon". The category can now be built on data that is already reachable through the OWID provider the project integrates, with licences that allow commercial use:

- **FAO Global Forest Resources Assessment 2025** (FRA 2025, via Our World in Data, CC BY 4.0): forest area by country, 1990 to 2025, in hectares and as a share of land area. It answers "how much forest is the world losing, and where?" as a **net** change in forest land use.
- **Global Forest Watch tree cover loss by dominant driver** (WRI and Google DeepMind, Sims et al. 2025, via Our World in Data, CC BY 4.0): satellite-detected annual tree cover loss, 2001 to 2024, split into seven drivers, by country. It answers "why?", with a measure that is **not** deforestation and is not comparable with the FAO series.

The closest precedents are `ocean-health` (one section and one endpoint per source, each with its own snapshot, `502` and freshness state) and `co2-emissions` (country explorer, key figures as server-rendered prose, world choropleth map, ranking table). This change mirrors both and adds only what is new: a divergent colour palette (the design system has kept it pending until a chart encodes polarity with colour, which a loss-versus-gain map does), a stacked-bar breakdown, and a ranking with a threshold rule for percentages.

`docs/data-sources/deforestation.md` also states that Global Forest Watch is non-commercial. The datasets used here are CC BY 4.0 (verified against the GFW Data API metadata), so the doc is corrected in the same change.

## Goals

- Ship `/deforestation/` with: an intro line, server-rendered key figures, a country explorer for forest area (hectares or % of land), a world map of the % change in forest area since 1990, a ranking table of countries by net change, a stacked-bar chart of tree cover loss by cause with a country selector, and a methodology note.
- Two endpoints, one per source, each isolated: `GET /api/v1/deforestation/forest-area` and `GET /api/v1/deforestation/tree-cover-loss`. A failure of one only takes its own section down.
- Reuse the existing resilience stack unchanged: OWID client, `ProviderError` to `502`, GCS snapshot fallback, provider freshness (stale notice, unavailable state), `GET /api/v1/health/dependencies` (the OWID indicator already covers it), the data sources catalog and `/data-sources/` page, `DataAttribution` and `OriginCredit`, `Dataset` JSON-LD, sitemap and the category page registry.
- State every figure, label, unit and caveat accurately: net versus gross change, interpolated years, approximate driver attribution, and the fact that the two sources measure different things (see `design.md`, "Accuracy and wording").
- Define and validate the divergent palette (the design system's pending item) as the colour of the map, and record it in `docs/design-system.md` in this change.
- Correct the GFW licence statement in the data source docs and update the roadmap.

## Non-Goals

- No GLAD or RADD weekly deforestation alerts, no Hansen raster or GeoTIFF processing, no GFW Data API integration, no real-time data.
- No direct FAOSTAT integration: FAO data arrives only through OWID.
- No FAO annual deforestation or net-change-rate series (`annual-deforestation`, `annual-change-forest-area`): they are period averages repeated each year or only five reference years (see `design.md`, Decision 3).
- No `reforestation` category content: gain, expansion and plantations belong to that later category. Net change appears here only as context and may appear there too.
- No regrouping of the seven GFW drivers (for example no "permanent versus temporary" series): drivers are shown as published.
- No "total deforestation" number built by combining FAO and GFW, no comparison chart between them, and no GFW series labelled "deforestation".
- No regional or income-group aggregates in the map and ranking (countries only); the explorer offers World and countries only, like the other OWID categories.
- No new runtime dependency, no new environment variable, no change to `ApiResponse`, `ApiResponseMeta`, the OWID client's public methods, the snapshot store or its write policy, the 24 h page revalidation or the existing categories' payloads.
- No new health indicator (OWID is already probed), no failure-injection mode in the E2E fixture server, no forecasts or targets, no `CHANGELOG.md` edits.
- No wording changes to the agreed page copy beyond what `design.md` records.

## Impact

- **API:** new module `apps/api/src/modules/deforestation/` (constants, controller, module, two services with pure builders); `AppModule` import. Two origins registered on `OwidProviderStatus`. No client change (one CSV download serves every column; the three charts are requested with `tab: 'chart'`).
- **Shared:** `packages/shared/src/lib/deforestation.ts`, exported from the root.
- **Web:** `lib/deforestation.ts` (server reads and shape guards), pure helpers for key figures, ranking, map option and chart options, `components/deforestation/`, the registry entry (`defineSectionedProviderCategoryPage`), skeleton, live meta description and title override, home card summary, structured data; divergent ramp in the chart theme and `ChoroplethMap`/`MapLegend`; a stacked-bar option builder.
- **Design system:** divergent palette tokens (`--chart-div-*`) declared, validated and documented; deforestation conventions recorded.
- **Tests and E2E:** unit tests for every builder, service and component; OWID fixtures (CSV and indicator metadata) in `apps/web/e2e/fixtures/owid/`; `apps/web/e2e/deforestation.spec.ts`; additions to the axe, SEO, navigation and data sources specs; tests that used `/deforestation/` as the placeholder move to another placeholder.
- **Site:** home card, sitemap entry, placeholder count 6 to 5, `/data-sources/` lists two more origins under OWID.
- **Docs:** `docs/data-sources/deforestation.md` licence fix, `README.md` files, `AGENTS.md` structure tree, `ROADMAP.md` (pending categories, "real data" status 7 of 12), Postman OWID collection (new slugs).
- **Specs:** 2 new capabilities (`deforestation-api`, which also holds the shared wire types, and `deforestation-page`) and 4 existing ones touched (`page-metadata` MODIFIED; `chart-foundation`, `design-tokens` and `presentation-docs` with ADDED requirements).
- **Deploy:** API before web, as for every payload change; no new variables; two more snapshot objects per environment.
