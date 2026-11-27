# Add the ocean health category (first multi-provider category)

## Why

`/ocean-health/` is still an icon, a title and "coming soon". The live provider-backed categories each read one provider through one BFF endpoint. A credible ocean page needs three independent providers:

- **Copernicus Climate Pulse** (C3S, ERA5): daily sea surface temperature, about two days behind real time.
- **Our World in Data** (already integrated): annual sea surface temperature anomaly (HadSST), ocean heat content (0-700 m and 0-2000 m) and ocean pH at Hawaii.
- **NOAA Laboratory for Satellite Altimetry**: global mean sea level per satellite mission.

The existing patterns are single-provider, so three gaps have to be closed: OWID-specific helpers (envelope, status, health indicator, env settings) need non-OWID equivalents; the page needs per-section failure so one provider outage does not blank it; and the OWID client cannot read the date-indexed pH chart. `design.md` has the detail.

## What

Ship `/ocean-health/` with global series only, in this order: key figures (latest daily SST with its anomaly and date, the daily record and the gap to it), a daily SST chart overlaying every year since 1979, the annual SST anomaly with uncertainty band and region toggle, ocean heat content with a depth toggle and every source overlaid, sea level per satellite mission with the trend and the data end date, and Hawaii ocean pH with its rolling average and an explanatory note. A data table sits under every chart. Each source is credited next to its chart and in the catalog.

## Non-Goals

- No per-country, per-basin or map view, no country explorer: global series only.
- No other ocean providers or datasets (NOAA Coral Reef Watch, OISST, ERDDAP, Tides & Currents, Open-Meteo Marine, Ocean Health Index stay documented only). No gridded or netCDF processing.
- No OWID `sea-level` (stops at 2020-Q4) and no `coral-bleaching-events` (stops at 2016).
- No FAO fish-stock charts (CC BY-NC-SA) and no Sea Around Us data (CC BY-NC): not commercial-safe, recorded as such in the docs and never integrated.
- No change to the 24 h page revalidation (`loadCategoryData`), the outbound HTTP client, `OWID_HTTP_TIMEOUT_MS`, the snapshot store or its write policy.
- No failure-injection mode in the E2E fixture server: degraded states are covered by unit and API integration tests, as for the existing categories.
- No new runtime dependency, no new color token, no change to `ApiResponse`, `ApiResponseMeta` or the existing categories' payloads.
- No alerting or uptime configuration changes, no forecasts, no `CHANGELOG.md` edits (release automation owns it).

## Impact

- **API:** two new provider modules (`copernicus-climate-pulse`, `noaa-lsa`), an `ocean-health` module with five endpoints, a generic provider envelope, two health indicators, publisher entries, four optional environment variables; additive changes to `OwidClient`, `OwidProviderStatus`, `buildOwidEnvelope` (same output), `HealthModule`, `AppModule`, config.
- **Shared:** `packages/shared/src/lib/ocean-health.ts`.
- **Web:** `lib/oceanHealth.ts`, `components/ocean-health/`, `RowDataTable`, chart option builders, `defineSectionedProviderCategoryPage`, the registry entry, skeleton, summary, metadata, a muted series role in the chart theme.
- **Tests and E2E:** fixtures and tests for every builder, client, endpoint and failure independence; `apps/web/e2e/ocean-health.spec.ts` on extended fixture servers; tests that used `/ocean-health/` as the placeholder move to another placeholder.
- **Site:** home card, sitemap entry, placeholder count 7 to 6, `/data-sources/` lists two more providers and OWID's new origins.
- **Specs:** 4 new capabilities and 15 existing ones touched (see `design.md`).
- **Deploy:** API before web, as for every payload change; all new variables have defaults; five more snapshot objects per environment.
