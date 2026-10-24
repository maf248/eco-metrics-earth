# Proposal: data-sources-attribution

## Why (Goals)

The site publishes data that others produced, and part of it is licensed CC BY, which requires visible attribution. Today the only attribution is a per-row citation inside `WaterFootprintTable`, and nothing tells a visitor who republished the data, under what license, or when it was last updated. The first live-provider module (OWID) cannot ship legally before this exists.

Goals:

1. Show legally sufficient, visible attribution for every data source in use: provider/publisher, license, link and date (the provider's last update for live providers, the publication year for cited publications).
2. Add a `/data-sources/` page that lists every source in use, with the **API as the single source of truth**: each API module declares its own sources, a `DataSourcesModule` aggregates them and serves `GET /api/v1/data-sources`. Removing a module from the API removes its sources from the page with no other edit; there is no hand-maintained list anywhere (API, shared package or web).
3. Keep two kinds of source distinct in the contract and the UI: **live providers** (consumed through an external API at runtime) and **static datasets** (compiled from publications and bundled with the API; their bibliography is derived from the dataset itself).
4. Attribute Our World in Data (OWID, CC BY 4.0) now: ~37 water-footprint rows (Poore & Nemecek 2018) cite OWID grapher charts, i.e. data republished by OWID. The citation stays a citation; the publisher/license is attributed. OWID's attribution is defined **once** in the API and reused later for `meta.source` on live OWID responses.
5. Pull forward the generic BFF fetch helper (retry / cold-start / shape validation) currently embedded in `apps/web/src/lib/waterFootprint.ts`, migrate water-footprint to it without behavior change, and use it for data-sources.
6. Add a minimal semantic site footer (landmark `contentinfo`) with a "Data sources" link, so the page is reachable from every page.

## Non-Goals

- No live OWID endpoint, no `meta.source` on any response in this change, no chart. OWID is not registered as a live provider here (nothing is served from it live yet); it appears as the publisher of republished static data. The first live endpoint will declare OWID as a provider using the attribution defined here.
- No NOAA / World Bank / any other provider.
- No breaking change to `GET /api/v1/water-footprint/products`: the only change is an additive optional `publisher` per row. The per-row `Attribution` in `WaterFootprintTable.tsx` keeps citation + methodology and only gains a "via <publisher>" line when a publisher exists.
- No dataset-level "last updated" for static data and no metadata file: dates are the publication years parsed from the citations.
- No empty-state UI for missing live providers: that section is simply not rendered.
- No re-typing of the bibliography: the water-footprint sources are derived from `water-footprint.json`, never copied into another file.
- No JSON-LD / structured data (justified in `design.md`).
- No per-request timestamp tracking for live providers, no persistent caching, no provider health/stale marking (a separate resilience item covers that).
- No footer content beyond the brand line, tagline, "Data sources" link and copyright/signature line (no social links, newsletter, legal pages). No nav-item entry for `/data-sources/` in the sidebar/bottom nav.
- No new color tokens, no change to `NAV_ITEMS`, no change to `ECO_CATEGORIES`.
- No change to rate limiting, security headers or CORS.

## Impact

- **`packages/shared`**: new wire types for the sources catalog (`DataSourcesCatalog`, `LiveDataSource`, `StaticDataSource`, `DataSourcePublication`, `DataSourcePublisher`, `DataSourceTimestampBasis`). `DataSourceAttribution` and `ApiResponse` are unchanged; `WaterFootprintProduct` gains an optional `publisher`. Types only, no data.
- **`apps/api`**: new `DataSourcesModule` (decorator + `DiscoveryService` aggregation, controller, Swagger); `WaterFootprintService` becomes a contributor and derives its bibliography; a single `resolvePublisher` used for an additive optional `publisher` on products and for the bibliography, plus fail-fast parsing of each citation's publication year; OWID attribution defined once in `providers/owid/`; `AppModule` imports `DataSourcesModule`.
- **`apps/web`**: new route `/data-sources/`; generic `lib/bffFetch.ts` (water-footprint migrated); `lib/dataSources.ts`; shared attribution component; per-row "via <publisher>" and a section-level attribution note under the water-footprint table (no extra fetch); footer in the root layout; sitemap entry; E2E specs.
- **Docs**: `ROADMAP.md` (close the attribution item, renumber, update the first-module item), `AGENTS.md` (project structure, "adding a module declares its sources"), `docs/design-system.md` (footer layout, attribution presentation).
- **Specs touched**: ADDED capabilities `data-sources-api`, `data-sources-page`, `site-footer`, `bff-fetch-helper`; ADDED requirements in `shared-types`, `owid-provider-client`, `water-footprint-api-data`, `water-footprint-page`; MODIFIED `web-api-client`, `sitemap` and `water-footprint-table`.
