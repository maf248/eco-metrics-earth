# Add the CO2 emissions module (first end-to-end OWID-backed category)

## Why

The BFF has an OWID client with a cache, an attribution definition and a data-sources catalog, and the web app has a generic BFF fetch helper, but no category consumes a live provider yet: `/co2-emissions/` is still an icon, a title and "coming soon". Nothing has exercised the whole path (provider client -> category module -> endpoint -> Server Component -> chart), and several cross-cutting pieces that every later category needs do not exist:

- a defined failure contract when the provider is down (today an `OwidClientError` becomes a generic `500` through the global exception filter);
- a dependencies health check that is separate from the liveness probe Cloud Run uses to start instances;
- the first chart (Apache ECharts 6 is decided in `docs/design-system.md` but not installed, the `--chart-*` tokens are not declared, there is no theme adapter, wrapper or Jest setup);
- a per-category dispatch on the web side (today `[category]/page.tsx` has a hard-coded `if` for water-footprint);
- a country selector with flags.

This change builds all of it once, through the `co2-emissions` category, so the remaining categories only add pieces.

## Goals

1. **Endpoint:** `GET /api/v1/co2-emissions` returns, in one response, annual CO2 emissions (total) and CO2 per capita for every country plus World, from 1950, rounded, in a compact year-aligned shape (about 70 KB gzipped, measured on real OWID data).
2. **Provider failure contract:** when OWID fails or returns invalid data the API answers `502` in the `ApiResponse` error format. The mechanism is generic (a `ProviderError` base class mapped by the global filter) and is reused by every later provider-backed category.
3. **Dependencies health:** `GET /api/v1/health/dependencies` (Terminus `HttpHealthIndicator` against a light OWID URL) reports provider reachability. `GET /api/v1/health` stays liveness-only and never calls OWID.
4. **Attribution:** OWID is declared once as a live data source through `@DataSourceContributor()`, and the endpoint carries `meta.source` / `meta.fetchedAt`; the page shows "Data:" plus `SourceAttribution` next to the chart.
5. **Page:** `/co2-emissions/` becomes a Server Component page with ISR (`revalidate = 86400`), server-rendered key figures, a line chart of the selected country over time, a "Total / Per capita" toggle, a searchable country combobox (WAI-ARIA pattern, flag per country, globe for World), and a collapsible data table equivalent.
6. **Chart foundation:** first ECharts integration exactly as the design system prescribes (tokens, theme adapter, shared wrapper, lazy loading with skeleton, mobile-safe defaults, Jest setup).
7. **Replicable pattern:** a per-category registry on the web side and a documented recipe in `AGENTS.md`, so the next categories (global temperature, energy sources, ...) only add pieces.
8. **Flags:** country flags come from the `flag-icons` package (SVG via CSS classes), not emoji, which render as two letters on Windows. The decision is recorded in `docs/design-system.md` and `docs/technical/libraries.md`.

## Non-Goals

- **No country comparison** (multiple lines), **no world map**, no choropleth, no table library.
- **No stale-data persistence** when the provider is down (last-good snapshot in Cloud Storage/Firestore and a `stale` marker). Out of scope here; the web ISR stale-if-error behavior already keeps serving the last good page.
- **No other categories** and no other providers (NOAA, World Bank).
- **No per-country endpoint** and no query parameters: the page never requests a single country, and the endpoint accepts none (so there is no DTO to validate).
- **No sectoral, cumulative or consumption-based CO2**, and no land-use change: only OWID's annual territorial CO2 (fossil fuels and industry) and its per-capita version.
- **No URL state for the selection:** the selected country and metric are client state only, with no query string and no path segment (`/co2-emissions/` stays the single canonical URL).
- **No visitor-country detection** (Vercel geo headers); it is added to the roadmap backlog as a separate idea, not built.
- **No persistence of the user's last selection** (no localStorage, no cookie).
- **No change to the liveness probe, the Cloud Run deploy workflow, security headers or CORS.**
- **No live OWID in E2E, no sequential/divergent chart tokens** (the sequential ramp comes with the world map).
- **No new UI component library:** the combobox is hand-built.
- **No divergent color palette** (still pending in the design system).
- **No JSON-LD / structured data** for the dataset.

## Impact

- **`packages/shared`:** new wire types for the endpoint (`Co2EmissionsData`, `Co2EmissionsEntity`, `Co2EmissionsMetric`), the static ISO 3166-1 alpha-3 -> alpha-2 crosswalk with its World and Kosovo handling, and exports.
- **`apps/api`:** new `Co2EmissionsModule` (controller, service, constants); new `common/errors/` (`ProviderError`, `ProviderDataError`) mapped to `502` by `AllExceptionsFilter`; `OutboundHttpError` and `OwidClientError` extend `ProviderError`; `OwidModule` gains `OwidProviderStatus` (the single OWID data-source contributor); `HealthModule` gains the Terminus-based dependencies endpoint; new dependencies `@nestjs/terminus`, `@nestjs/axios`, `axios` (exact versions, `apps/api`).
- **`apps/web`:** `echarts` and `flag-icons` (exact versions); `--chart-*` tokens in `globals.css`; chart foundation under `components/charts/`; `CountryCombobox`, `CountryFlag`, `GlobeIcon`; CO2 page components; `lib/co2Emissions.ts`; a category registry replacing the per-category `if`; an envelope variant of the BFF fetch helper that exposes `meta`; Jest configuration for ECharts; `designTokens.test.ts` recognizes chart tokens; updated category description copy.
- **Docs:** `docs/design-system.md` (chart tokens declared, flags decision, combobox and key-figure conventions), `docs/technical/libraries.md` (flags candidates, measured asset weights, five-project interaction result), `AGENTS.md` (replicable category recipe, project structure), `README.md` and the app READMEs (endpoints, structure), `ROADMAP.md` (closes the first-category phase, adds the visitor-country idea).
- **Specs:** ADDED capabilities `co2-emissions-api`, `provider-failure-contract`, `chart-foundation`, `category-page-registry`, `co2-emissions-page`, `country-combobox`; ADDED requirements in `health-module`, `owid-provider-client`, `bff-fetch-helper`, `shared-types`, `presentation-docs`; MODIFIED requirements in `static-category-pages`, `page-metadata`, `design-tokens`.
- **Runtime/ops:** first production traffic to OWID from the BFF (cached 24 h in memory per instance); E2E runs against a local OWID fixture server started by the existing webServer wrapper (no live OWID dependency).
