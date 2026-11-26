# Design: add-ocean-health-module

Read first: `AGENTS.md` ("Adding an OWID-backed category", Known Constraints), `docs/design-system.md` (Chart rules, Degraded provider states), the archived `2026-10-25-add-global-temperature-module` (closest precedent) and `docs/technical/libraries.md`.

## 1. Architecture at a glance

```
Copernicus Climate Pulse CSV ─► CopernicusClimatePulseClient ─┐
OWID grapher CSV (3 charts)  ─► OwidClient (+ dated series)   ├─► OceanHealth*Service (5, pure builders)
NOAA LSA CSV                 ─► NoaaLsaClient                 ┘        │ ProviderSnapshotService.resolve(<key>, assemble)
                                                                        ▼
                          GET /api/v1/ocean-health/{sea-surface-temperature | sea-surface-anomaly |
                                                    ocean-heat-content | sea-level | ocean-ph}
                                                                        ▼  (5 envelopes, 5 meta.source, 5 snapshots)
web: oceanHealth.ts (5 fetchProviderPayloadFromBff) ─► defineSectionedProviderCategoryPage
     ─► OceanHealthContent: key figures, 5 sections, each wrapped in ProviderBackedContent
```

The unit of resilience is the **section**, not the category: one endpoint, one snapshot key, one `meta` and one freshness state per section. This reuses every existing mechanism (`ProviderSnapshotService`, `fetchProviderPayloadFromBff`, `evaluateFreshness`, `StaleDataNotice`, `DataUnavailable`, `ProviderBackedContent`) unchanged; only the registry helper is new.

## 2. Decisions

**D1. Five endpoints under `/ocean-health`, not one aggregate.** One envelope has one `meta.source` (one publisher, one licence, one `lastUpdated`), one snapshot and one `502`. An aggregate over three providers would lose all three in the first outage with no snapshot, or need a per-section status wrapper that `ApiResponse` does not have. Five endpoints cost five cheap BFF reads per ISR regeneration (at most daily), each with its own attribution. Routes: `sea-surface-temperature` (Copernicus), `sea-surface-anomaly` (OWID HadSST), `ocean-heat-content` (OWID, both depths in one payload so the toggle never fetches), `sea-level` (NOAA LSA), `ocean-ph` (OWID). Snapshot keys: `ocean-health-sea-surface-temperature`, `ocean-health-sea-surface-anomaly`, `ocean-health-heat-content`, `ocean-health-sea-level`, `ocean-health-ph` (kebab, `^[a-z0-9-]+$`).

**D2. One provider module per new provider, mirroring `providers/owid/`.** `providers/copernicus-climate-pulse/` and `providers/noaa-lsa/` each hold: a client on `OutboundHttpClient` (getText) with its own `CacheModule` TTL, a pure CSV parser, a status class decorated with `@DataSourceContributor()` (one catalog entry each, ids `copernicus-climate-pulse` and `noaa-lsa`, `registerCategory` and `recordProviderUpdate` like `OwidProviderStatus`), the publisher constant and origin constants, and the module. The category module `modules/ocean-health/` imports `OwidModule`, both new provider modules and `SnapshotsModule`. The `OutboundHttpClient` keeps using `OWID_HTTP_TIMEOUT_MS` (the name is historical; renaming is out of scope).

**D3. Generic envelope.** `common/envelope/provider-envelope.ts` exports `buildProviderEnvelope(publisher, data, lastUpdated, { fetchedAt, stale })`; `buildOwidEnvelope` becomes a one-line call with `OWID_PUBLISHER`, with output byte-identical (existing CO2, temperature and energy controller tests pass unmodified). `common/` does not import from `modules/`: the helper takes the publisher as an argument.

**D4. Publishers mechanism.** `common/publishers/publishers.ts` gains `COPERNICUS_CLIMATE_PULSE_PUBLISHER` (provider `Copernicus Climate Pulse`, license `CC BY 4.0`, sourceUrl `https://pulse.climate.copernicus.eu`) and `NOAA_LSA_PUBLISHER` (provider `NOAA Laboratory for Satellite Altimetry`, license `Public domain`, sourceUrl `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/`). `resolve-publisher.ts` maps `pulse.climate.copernicus.eu`, `sites.ecmwf.int` and `www.star.nesdis.noaa.gov` to them. Exact license names and URLs are verified against the provider pages while writing the constants (task 2.2); a mismatch stops the task.

**D5. Copernicus reduction in the BFF.** The CSV (about 650 KB, 17.5k rows) is parsed once per cache TTL into rows (`#` lines skipped, header validated, `status` mapped). The service reduces them to a calendar-day-aligned payload: one array of 366 slots per year (slot index = day of year in a leap year, so 1 Mar is the same slot in every year and 29 Feb is a slot that is `null` in common years), the 1991-2020 climatology as one 366-slot array (identical per month-day across years in the source, verified), the `latest` row, the `record` row (highest absolute `sst`; ties name the most recent date), and the `recent` rows (last 90 calendar days of data, ascending) for the table. Values keep the source's 3 decimals. Budget: gzipped payload under about 80 KB (test on the real-size synthetic dataset). The browser never receives the CSV, never parses it and the page stays within the existing ISR model.

**D6. For the daily Copernicus series, "current year" means the year of the latest row, never the clock** (deterministic in tests and E2E). The record year is the year of `record.date`. When both are the same year the line is drawn once with the current-year style and the legend and tooltip say so.

**D7. OWID additions.** (a) `getGrapherDatedSeries(slug, { tab, country, columns })` for charts whose header is `entity,day,<columns>` (no `code`): ISO `YYYY-MM-DD` dates only, one entity expected, rows sorted ascending, cache key namespace `owid:grapher-dated:`; `getGrapherSeries` and `parseGrapherTable` stay byte-identical. (b) HadSST needs `country=OWID_WRL~OWID_NH~OWID_SH` (the default filtered request returns World only). (c) The heat-content charts are requested with `country=OWID_WRL`. (d) Baseline and unit guards follow the temperature module: the HadSST indicator description must mention the 1861-1890 baseline or the section fails with `ProviderDataError` (hyphen or en dash); the heat-content unit must be `10²² J`-like (`shortUnit` check) and every expected column must exist, else `ProviderDataError`. (e) Indicator ids are captured once from the OWID chart/indicator metadata while recording fixtures (task 3.1) and stored as constants; dataset identity and `updatedAt` come from the indicator metadata exactly as in `buildGlobalTemperatureData`. (f) The current partial year is not served: only the annual OWID series (sea surface temperature anomaly and heat content) are capped at `current UTC year - 1`, from an injectable clock so tests are deterministic. The cap never applies to the dated pH series or the daily Copernicus series, whose own latest rows define their end (D6).

**D8. Sea level (NOAA LSA).** Parse `#` header lines first: the `#trend = 3.11 mm/year (...)` line is required (`ProviderDataError` otherwise, like a baseline mismatch: a changed header must not become a mislabelled chart), the acknowledgment is a constant of the origin `notice`, not parsed. Columns after `year` are the missions in file order, ids are slugified names, a mission with no values is dropped, unknown extra mission columns are accepted. Decimal years convert to ISO UTC dates (year start plus the fraction of that year's milliseconds), served per mission as `dates[]`/`values[]` with no nulls. `startDate`/`endDate` come from the data. `meta.source.lastUpdated` uses retrieval time (`lastUpdatedBasis: 'retrieval'`): the file has no timestamp.

**D9. Page registry: `defineSectionedProviderCategoryPage`.** Extract the state resolution of `defineProviderCategoryPage` into an exported `resolveProviderPageState(result, provider)` (behavior unchanged, existing tests untouched) and add a helper taking `{ sections: Record<key, { provider: { name, freshness? }, load }>, Content }`. Its `load` runs every section's `load` with `Promise.all` and returns `{ [key]: ProviderPageState }`; `Content` receives that map. `isDegraded` is true when any section is `unavailable` without a payload, so the page leaves the 24 h cache within minutes (existing rule). Other failures (our own BFF unreachable, shape mismatch, an HTML 502) still throw for the whole page, exactly as today: provider outages are per section, BFF outages are not. Worst case remains two attempts of 10 s in parallel, inside `maxDuration = 30`.

**D10. Section rendering.** Each section is a card with its own `<h2>` heading, wrapped by `ProviderBackedContent` so fresh shows the section, stale-notice shows `StaleDataNotice` then the section, and unavailable shows `DataUnavailable` in place of the section body under the same heading (with the section's `DataAttribution` when `meta` is known). `StaleDataNotice` and `DataUnavailable` are reused as they are; if their outer margin or `max-w-4xl` does not fit inside a card, an optional `className` prop (default unchanged) may be added, nothing else. Copernicus feeds two blocks (key figures and the daily chart) from one state: the notice shows once above the key figures, and when unavailable the key-figures slot shows `DataUnavailable` and the daily chart section is omitted (no duplicate panels). Freshness: Copernicus overrides to `{ silentDays: 2, noticeDays: 30 }` (the section is about the latest day); the others use the default `7 / 30`.

**D11. Charts.** All on `LazyEChart` with pure, color-free option builders (rule 1). The daily chart is the page's first chart (not deferred); the other four use `RenderWhenVisible` (rule 5). Per chart: (a) daily SST: category axis of 366 calendar days with month ticks, 47 earlier-year lines `silent`, no symbols, outside legend and tooltip, drawn with the new **muted** role; current year and record year highlighted with categorical colors; 1991-2020 climatology a dashed reference series (not a `markLine`: it is a curve); legend limited to the highlighted entries plus a sentence under the chart for the grey lines; axis tooltip lists only the highlighted series. (b) anomaly: `buildYearAxis`, `buildConfidenceBandSeries`, zero line labelled `1861-1890 average` as in the long-run chart, region toggle through `MeasureToggle`. (c) heat content: one line per source, shared year axis, `connectNulls: false`, legend always on (4 or 3 series), `MeasureToggle` for depth, series names carry their span in the table, not the legend. (d) sea level: `time` axis, one line per mission in palette order, legend on, no zero line (values are relative to the file's own reference). (e) pH: monthly points as a scatter-like line without connecting lines (`lineStyle` width 0, symbols on) and the rolling average line on top; the value axis follows the data (rule 12 analogue: pH changes by about 0.1; a zero baseline would hide it). ECharts' aria description prints `null` as "NaN": every chart that can hold `null` sets `aria.label.description` itself (rule 7).

**D12. Muted role in the theme adapter.** Options cannot name colors and ECharts themes cannot color individual series, so the adapter exposes a resolved `mutedLine` color (from `line-strong` at low opacity, exact blend decided against both surfaces and recorded in the design system) and the lazy chart wrapper applies it to series flagged `muted: true` by the option builder before `setOption`, re-applying on theme change. The flag is the only thing the builder writes.

**D13. Tables.** Every chart has a collapsed `DataTableDisclosure`. Year-keyed tables reuse `YearDataTable` (anomaly regions as columns for the selected region, heat content columns for the selected depth, "Tables follow the toggle"). Date-keyed data (daily, sea level, pH) uses a new generic `RowDataTable` (same disclosure and `ScrollRegion`, row header text, em dash for `null`). Daily table: last 90 days, newest first, columns Date / SST / Anomaly / 1991-2020 average / Status, with a note "Showing the most recent 90 days". Sea level table: every observation (about 1,200 rows) newest first: Date / Mission / Value. pH table: every monthly row (about 440) newest first: Date / Monthly / Yearly average.

**D14. Web contracts.** `src/lib/oceanHealth.ts` (`server-only`) exports five loaders on `fetchProviderPayloadFromBff` with shape guards (`isNumberOrNullArray` for slot and year-aligned arrays, `isDataSourceOrigin` plus the required `notice`, new small guards for dates). Guards verify lengths (366 slots, series/aligned arrays equal) so the page never guards every access. Provider-name mirrors for a `502` without `meta` live in `categoryPages.tsx` next to `OWID_PROVIDER_NAME`.

**D15. Structured data.** One `Dataset` JSON-LD for the page (rule 8), built from the sections present: temporal coverage from the earliest start to the latest end, `variableMeasured` per present section, `isBasedOn` through `buildSourceWork` for each present provider and origin. A section that is unavailable contributes nothing; with every section unavailable no JSON-LD is rendered.

**D16. Health.** The only uptime monitor targets the web home (`docs/deploy/sentry.md`), so a 503 from the dependencies endpoint alerts nothing. `CopernicusClimatePulseHealthIndicator` (key `copernicus-climate-pulse`) and `NoaaLsaHealthIndicator` (key `noaa-lsa`) use `pingCheck` with `method: 'HEAD'` (both servers answer 200 to HEAD; a GET would download 650 KB per probe) and the same 3000 ms timeout and User-Agent. `DependenciesHealthController` lists three indicators. The endpoint is already the Terminus-native exception; liveness is untouched.

**D17. Configuration (all optional, all with defaults, validated at startup).**

| Variable                                     | Default                                                      | Bounds                 |
| -------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `COPERNICUS_CLIMATE_PULSE_BASE_URL`          | `https://sites.ecmwf.int/data/climatepulse/data/series`      | URI, no trailing slash |
| `COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS` | `21600` (6 h)                                                | 60 to 86400            |
| `NOAA_LSA_BASE_URL`                          | `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr` | URI, no trailing slash |
| `NOAA_LSA_CACHE_TTL_SECONDS`                 | `604800` (7 days)                                            | 3600 to 2592000        |

OWID keeps `OWID_CACHE_TTL_SECONDS` (86400). The web revalidates pages every 24 h as for every category, so the latest daily value on the page lags the source by up to about one more day. `AppConfigService` gets four typed getters; `.env.example`, both READMEs and the E2E wrapper are updated.

**D18. E2E.** The existing fixture server gains routes `/copernicus/era5_daily_series_sst_60S-60N_ocean.csv` and `/noaa-lsa/slr_sla_gbl_free_ref_90.csv` plus the OWID charts and indicator metadata of this change; the E2E wrapper starts the API with the two new base URLs pointing at it. Fixtures are trimmed real captures (Copernicus: header comments kept, three full years and a partial fourth; NOAA LSA: a few hundred rows across three missions with the `#trend` line), recorded once, never in a test.

## 3. Wire types (`packages/shared/src/lib/ocean-health.ts`)

```ts
export type OceanSstStatus = 'preliminary' | 'final';
export interface OceanSstDailyPoint {
  date: string;
  sst: number;
  climatology: number;
  anomaly: number;
  status: OceanSstStatus;
}
export interface OceanSstDailyData {
  unit: string; // '°C'
  coverage: string; // '60°S–60°N' (ocean only)
  baseline: { startYear: number; endYear: number }; // 1991-2020
  startYear: number;
  endYear: number; // first year; year of the latest row
  /** One entry per year, ascending; `values` has 366 slots (index = day of year in a leap year). */
  years: { year: number; values: (number | null)[] }[];
  climatology: (number | null)[]; // 366 slots
  latest: OceanSstDailyPoint;
  record: OceanSstDailyPoint; // highest absolute daily sst
  recent: OceanSstDailyPoint[]; // last 90 days, ascending
  origin: DataSourceOrigin;
}
export interface OceanSstAnomalyRegion {
  code: string;
  name: string;
  mean: (number | null)[];
  lower: (number | null)[];
  upper: (number | null)[];
}
export interface OceanSstAnomalyData {
  startYear: number;
  endYear: number;
  unit: string;
  baseline: { startYear: number; endYear: number }; // 1861-1890
  dataset: DatasetIdentity;
  origin: DataSourceOrigin;
  regions: OceanSstAnomalyRegion[]; // World, Northern Hemisphere, Southern Hemisphere
}
export interface OceanHeatSource {
  id: string;
  name: string;
  values: (number | null)[];
}
export interface OceanHeatDepth {
  id: '700m' | '2000m';
  label: string;
  dataset: DatasetIdentity;
  sources: OceanHeatSource[];
}
export interface OceanHeatContentData {
  startYear: number;
  endYear: number;
  unit: string;
  depths: OceanHeatDepth[];
  origins: DataSourceOrigin[];
}
export interface OceanSeaLevelMission {
  id: string;
  name: string;
  dates: string[];
  values: number[];
}
export interface OceanSeaLevelData {
  unit: string; // 'mm'
  startDate: string;
  endDate: string; // ISO dates derived from the data
  trend: { value: number; unit: string; note: string }; // 3.11, 'mm/year', 'no glacial isostatic adjustment correction'
  missions: OceanSeaLevelMission[];
  origin: DataSourceOrigin;
}
export interface OceanPhData {
  unit: string;
  station: string; // 'pH', 'Hawaii'
  dates: string[]; // ISO, ascending
  monthly: (number | null)[];
  yearlyAverage: (number | null)[]; // aligned to dates
  dataset: DatasetIdentity;
  origin: DataSourceOrigin;
}
```

Heat-content source ids come from the column short names (`ocean_heat_content_<id>_700m`: `iap`, `noaa`, `mri`, `csiro`), names are `IAP`, `NOAA`, `MRI/JMA`, `CSIRO`. The shapes above are the contract; names of helpers are free, field names are not.

## 4. File structure

```
apps/api/src/
  common/envelope/provider-envelope.ts            # buildProviderEnvelope
  common/publishers/publishers.ts                 # + two publishers; resolve-publisher.ts hosts
  modules/providers/owid/{owid-client.service.ts,parseGrapherCsv.ts,owid.types.ts,owid-envelope.ts}  # dated series; delegate envelope
  modules/providers/copernicus-climate-pulse/     # client, parser, status, constants, module
  modules/providers/noaa-lsa/                     # client, parser, status, constants, module
  modules/ocean-health/                           # constants, controller, module, 5 services
  health/{copernicus-climate-pulse,noaa-lsa}.health-indicator.ts
  config/{env-validation.schema.ts,app-config.service.ts}
packages/shared/src/lib/ocean-health.ts
apps/web/src/
  lib/{oceanHealth.ts,oceanHealthStructuredData.ts,oceanHealthKeyFigures.ts,oceanSstDailyChartOption.ts,
       oceanSstAnomalyChartOption.ts,oceanHeatChartOption.ts,oceanSeaLevelChartOption.ts,oceanPhChartOption.ts}
  lib/{categoryPages.tsx,categorySkeletons.ts,categoryMetadata.ts,liveCategories.ts}   # edits
  components/RowDataTable.tsx
  components/ocean-health/{OceanHealthContent,OceanSstKeyFigures,OceanSstDailySection,OceanSstAnomalySection,
                           OceanHeatContentSection,OceanSeaLevelSection,OceanPhSection}.tsx
  components/charts/{chartTheme.ts,EChart.tsx}    # muted role
apps/web/e2e/ocean-health.spec.ts, utils/owid-fixture-server.ts, utils/api-env.ts, run-dev-servers.ts, fixtures/{owid,copernicus,noaa-lsa}/
docs/{data-sources/ocean-health.md,design-system.md}, ROADMAP.md, AGENTS.md, READMEs, apps/api/.env.example
```

## 5. Alternatives considered

- **One aggregate `/ocean-health` endpoint.** Rejected (D1): one `meta`, one snapshot and one `502` for three providers; either all sections fail together or a new per-section status wrapper changes `ApiResponse`.
- **Ship the Copernicus CSV (or all rows as objects) to the browser.** Rejected (D5): 650 KB, parsing on the client, no server-rendered key figures, breaks the "payload compact, one fetch per page" convention.
- **Reduce to monthly or weekly means.** Rejected: the daily record and the latest value are the point of the section.
- **Pull the Copernicus data through OWID or ERDDAP.** Rejected by the user's decisions: only Climate Pulse is both daily and current.
- **Make the OWID client's `parseGrapherTable` accept `day`.** Rejected: it would loosen the guard that makes a map-tab response fail loudly. A separate dated method keeps the existing one byte-identical.
- **Single `OwidProviderStatus`-like class for all three providers.** Rejected: the catalog needs one entry per provider with its own publisher, license and timestamp basis.
- **Per-section `loading.tsx` or `<Suspense>`.** Rejected by Known Constraints (no streaming of category data).
- **`markLine` for the climatology.** Rejected: it is a daily curve, not a constant; a dashed series carries it.
- **A color literal for grey lines.** Rejected by chart rule 1 and `designTokens.test.ts`; a theme-adapter role is the only compliant route (D12).
- **Bounded Copernicus table by default 365 days.** 90 days keeps the table about 16 KB of HTML.

## 6. Risk assessment

| Risk                                                                      | Mitigation                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copernicus or NOAA changes its file layout (header text, columns, units)  | Parsers validate the header and the `Units: deg. C` / `#trend` lines and throw `ProviderDataError`; the section serves its snapshot or the unavailable state, never a mislabelled chart. Fixture-based tests pin the format.                            |
| Copernicus credit or licence wording differs from the assumption          | Task reads the Climate Pulse terms before writing the origin; stop and ask if it says otherwise.                                                                                                                                                        |
| NOAA LSA feed is frozen (last modified Feb 2025) and could disappear      | The section shows its derived end date; a failure falls back to snapshot then unavailable.                                                                                                                                                              |
| 47-series chart heavy on mobile                                           | `silent`, no symbols, `animation` off for earlier years, SVG renderer; verified at 360 px in E2E for no overflow; if it drops frames the fallback is to draw earlier years as one decimated series per decade (decision recorded in the design system). |
| Five BFF calls per regeneration hit the throttler                         | Keyed tier is far above 5 per day; the page regenerates at most daily (or every 5 min while a provider is down). Called out in the E2E rate-limit spec: no change expected.                                                                             |
| Heavy payload in snapshots (about 100 KB daily payload changes every day) | One write per day per environment by the existing policy (hash changed or 24 h); inside the free tier.                                                                                                                                                  |
| Duplicate `data-testid` and headings in degraded states across sections   | Sections are named regions; E2E and unit tests scope queries to the region. `DataUnavailable` keeps its `<h2>` under the section's `<h2>` (same level, documented in the design system).                                                                |
| Day-of-year alignment off by one after Feb 29                             | 366-slot calendar-day alignment with an explicit 29 Feb slot; unit tests for a common year, a leap year and 1 Mar.                                                                                                                                      |
| Partial current year in OWID annual series                                | Capped at the previous UTC year (D7f).                                                                                                                                                                                                                  |
| Contract change while the web has cached old payloads                     | Deploy API before web (existing rule); `fetchEnvelopeFromBff` heals shape mismatches.                                                                                                                                                                   |

## 7. Resolved decisions

1. Daily table: the most recent 90 days.
2. "Record": the highest absolute daily SST in the series (ties name the most recent date), not the highest anomaly.
3. Caching: Copernicus API cache 6 h with web freshness `{ silentDays: 2, noticeDays: 30 }`; OWID 24 h with the default 7/30; NOAA LSA 7 days with the default 7/30. Each section fails on its own (snapshot, stale notice, unavailable state).
4. Attribution lives in origin constants plus the publishers mechanism: C3S/ECMWF notice and disclaimer (verified on the Climate Pulse terms), Met Office HadSST (OGL v3), NOAA NCEI and US EPA for heat content with IAP, MRI/JMA and CSIRO named per series and in the citation (not separate catalog origins), the verbatim NOAA acknowledgment, Hawaii Ocean Time-series (SOEST). Origins are checked against the OWID indicator `origins` while recording fixtures.
5. The daily CSV is reduced in the BFF.
6. Annual OWID series stop at the previous year.
7. Page revalidation stays 24 h.
8. The NOAA LSA section stays, showing the end date derived from the data.
9. Heat-content copy says each source uses its own reference period (OWID states none): shape and trend are comparable, not level.
10. Sea level and pH tables are unbounded (about 1,200 and 440 rows).
11. The muted role is a theme-adapter role plus a series flag (D12).
