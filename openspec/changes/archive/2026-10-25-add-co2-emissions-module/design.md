# Design: CO2 emissions module

Everything below was checked against the code and against live OWID responses (24 Oct 2026) unless marked otherwise.

## Facts verified against OWID

| Fact                                                                                                                                                                                                                                                                 | Evidence                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Total chart: slug `annual-co2-emissions-per-country`, short-name column `emissions_total`, unit tonnes, indicator id `1119906`                                                                                                                                       | filtered CSV header; chart `.metadata.json` (`fullMetadata` link) |
| Per-capita chart: slug `co-emissions-per-capita`, column `emissions_total_per_capita`, unit tonnes per person, indicator id `1119914`                                                                                                                                | same                                                              |
| Both are single-value-column charts, so `getGrapherSeries` needs no multi-column handling; the explicit `column` option is still passed so a renamed column fails loudly                                                                                             | CSV headers                                                       |
| `csvType=filtered` **without** `country` returns only the chart's default selection (a handful of entities)                                                                                                                                                          | request without `country` returned 14 KB                          |
| `csvType=filtered` with an explicit `country=A~B~...` list of ~217 codes returns all of them; unknown codes are silently ignored; `time=1950..2100` is accepted, so an upper bound beyond the latest year works                                                      | 217 entities, 15 376 rows, HTTP 200                               |
| The full CSV has 247 entities: 215 ISO alpha-3 countries, `OWID_WRL` (World), `OWID_KOS` (Kosovo), 11 other `OWID_*` aggregates (continents, income groups, `OWID_EU27`) and ~19 entities with an **empty** code (GCP regions, international aviation/shipping, ...) | analysis of the full CSV                                          |
| `ATA` and `CXR` have total emissions but no per-capita value                                                                                                                                                                                                         | per-capita CSV                                                    |
| Indicator metadata (`getIndicatorMetadata`) works for both ids and carries `updatedAt` (provider timestamp), `datasetName` = `Global Carbon Budget`, `datasetVersion` = `2025-11-13`                                                                                 | `api.ourworldindata.org/v1/indicators/{id}.metadata.json`         |
| The grapher `co-emissions-per-capita.metadata.json` is 4 KB, HTTP 200                                                                                                                                                                                                | health probe candidate                                            |

## 1. API: shape of the endpoint

`GET /api/v1/co2-emissions` -> `ApiResponse<Co2EmissionsData>`:

```ts
// packages/shared/src/lib/co2-emissions.ts
export type Co2EmissionsMetric = 'total' | 'perCapita';

export interface Co2EmissionsEntity {
  /** ISO 3166-1 alpha-3 (e.g. 'ARG'), or the OWID codes 'OWID_WRL' (World) and 'OWID_KOS' (Kosovo). */
  code: string;
  /** ISO 3166-1 alpha-2 for flags ('AR'; 'XK' for Kosovo). null for World. */
  iso2: string | null;
  name: string;
  /** Million tonnes of CO2, 3 decimals. Index i is the year startYear + i. null = no data. */
  total: (number | null)[];
  /** Tonnes of CO2 per person, 2 decimals. Same indexing. */
  perCapita: (number | null)[];
}

export interface Co2EmissionsData {
  startYear: number; // 1950
  endYear: number; // latest year with any value
  units: { total: string; perCapita: string }; // 'Mt CO2', 't CO2 per person' (display strings)
  dataset: { name: string; version: string }; // from indicator metadata: 'Global Carbon Budget', '2025-11-13'
  entities: Co2EmissionsEntity[]; // World first, then countries by name (en collation)
}
```

Envelope: `{ success: true, status: 200, data, meta: { source: { ...OWID_PUBLISHER, lastUpdated }, fetchedAt } }`. `lastUpdated` is the latest `updatedAt` of the two indicator metadata responses (the provider's own timestamp); `fetchedAt` is the time the BFF assembled the response.

### Why not `MetricSeries[]` (justified deviation)

`MetricSeries`/`MetricPoint` stay the shape between the OWID client and the service, and `ApiResponse`/`ApiResponseMeta`/`DataSourceAttribution` are reused as is. The **wire** shape of this endpoint is compact instead, because of the payload budget. Measured on the real data (217 entities x 75 years x 2 metrics):

| Shape                                                            | Raw    | Gzipped                                |
| ---------------------------------------------------------------- | ------ | -------------------------------------- |
| Year-aligned arrays (this design), per-capita 2 dp               | 201 KB | **70 KB**                              |
| Same, per-capita 3 dp                                            | 216 KB | 79 KB                                  |
| `MetricSeries` with `{year, value}` objects, **one** metric only | 441 KB | 73 KB (about 140 KB with both metrics) |

Per-point objects repeat `"year"` and `"value"` 32 000 times; the aligned arrays carry each year once. One entity object holds both metrics, so the page needs one structure for the toggle and the table. Missing observations are `null` (consistent with `MetricPoint`), so arrays never shift.

### Rounding and units

Totals are converted from tonnes to million tonnes and rounded to 3 decimals (kilotonne precision, enough for the smallest emitters); per capita is rounded to 2 decimals. The payload target is about 80 KB gzipped; the 2-decimal per-capita choice keeps it at about 70 KB. Rounding happens once, in the service, with `Math.round(x * 10^d) / 10^d`.

### Entity filtering and the crosswalk

The service does **not** request the chart's default selection and does not download the full history. It asks OWID for an explicit allowlist: `country = all ISO alpha-3 codes of the crosswalk + OWID_WRL + OWID_KOS`, `timeRange = { from: 1950, to: <current UTC year> }`. This excludes by construction every aggregate (continents, income groups, `OWID_EU27`, GCP regions, aviation and shipping), costs one request per metric, and keeps the cache key stable. Anything that still comes back with a code outside the allowlist is dropped (defense in depth). `ATA`/`CXR` are kept with an all-null `perCapita`; entities that are all-null in both metrics are dropped.

The allowlist and the alpha-2 mapping come from one structure, so a country can never have a flag code that disagrees with its request code.

### Where the crosswalk lives: `@eco-metrics/shared`

`packages/shared/src/lib/country-codes.ts` exports `ISO3_TO_ISO2` (the ISO 3166-1 table), `WORLD_ENTITY_CODE = 'OWID_WRL'`, `KOSOVO_ENTITY_CODE = 'OWID_KOS'` and helpers `iso2ForEntityCode(code): string | null` and `listCountryEntityCodes(): string[]`. Static data, no I/O.

- The BFF is the only runtime consumer (it adds `iso2` to the payload, so the browser never imports the table and flags need no lookup on the web side).
- It lives in `shared` rather than in the API because the web test suite must be able to assert that **every alpha-2 the table can emit has a flag in `flag-icons`**, and because the later world-map work needs the same entity vocabulary on the web side.
- World is `iso2: null` (the UI shows a globe). Kosovo, which has no ISO 3166-1 alpha-2 code, is the user-assigned `XK`, which `flag-icons` ships.

Alternatives considered: (a) API-only (`apps/api/src/common/geo/`) is simpler but makes the flag-coverage test impossible without a web-to-api import; (b) deriving alpha-2 on the web from `flag-icons/country.json` couples the contract to a presentation package and cannot map alpha-3; (c) asking OWID's indicator metadata for codes gives alpha-3 only.

## 2. API: provider failure contract

`apps/api/src/common/errors/provider-error.ts`:

- `ProviderError extends Error` — "the external provider failed or sent something unusable".
- `ProviderDataError extends ProviderError` — thrown by services when a provider answered but the semantic content is unusable (no World entity, no rows, ...).
- `OutboundHttpError` (so timeouts, network errors and non-2xx) and `OwidClientError` (so parse, unsupported-chart and parameter/column errors) now extend `ProviderError`. This is a one-line change of the base class each; their constructors and subclasses are untouched.

`AllExceptionsFilter` gets one branch before the generic one: `exception instanceof ProviderError` -> status `502`, body `{ success: false, error: 'Data provider unavailable or returned invalid data', status: 502 }`. The body is a constant string, so URLs and internals never leak; the filter logs the error class, message and `cause` chain at `error` level (the existing `status >= 500` logging path, extended to include non-`HttpException` provider errors).

Decisions:

- **502 for everything provider-side**, including `OwidInvalidParameterError`: the endpoint accepts no provider parameters from the caller, so an invalid parameter or an unknown column means our code and the provider's current contract disagree. That is "invalid data from the provider" from the client's point of view and must be visible in the logs, not a client error. `504` for timeouts was rejected: one code is easier for clients to handle, and the log carries the distinction.
- The filter keys on a base class in `common/`, not on `OwidClientError`, so `common/` never imports from `modules/` and a future provider only has to extend `ProviderError`.
- Unexpected non-provider errors remain `500`.
- Swagger: `@ApiBadGatewayResponse` on provider-backed endpoints.

Web impact: `fetchFromBff` already treats any non-2xx as a failed attempt, so a `502` ends in the existing path (two attempts, one `console.error`, thrown error, ISR keeps the last good page, `error.tsx` on a first render).

## 3. API: OWID as a data source, declared once

`DataSourcesService` rejects two contributions with the same `id` at boot. If every OWID-backed category module declared its own `owid` provider, adding the second category would crash the API. So:

- `OwidModule` provides `OwidProviderStatus`, decorated with `@DataSourceContributor()` and exported. It is the **only** place that builds the OWID `LiveDataSource` (`id: 'owid'`, name/license/URL from `OWID_PUBLISHER` in `owid.attribution.ts`, a description, `categories` from the registry below, `lastUpdated`/`lastUpdatedBasis`).
- A category module calls `status.registerCategory('co2-emissions')` in its constructor and `status.recordProviderUpdate(updatedAt)` after each successful assembly. With no registered category the contributor returns `[]`, so an app that does not use OWID lists nothing.
- `lastUpdated` is the latest recorded provider timestamp with basis `'provider'`. **Before any successful retrieval in this process** (the common state on a scale-to-zero instance) there is no honest value; the contributor falls back to the module start time with basis `'retrieval'`. This is flagged as an open question (below): it is a product decision, and the clean fix (making `lastUpdated` optional in the catalog contract, or the persisted last-good snapshot) is outside this change. The contributor must be synchronous in effect and never call OWID: the catalog is collected at application bootstrap.

This deviates from the literal "declare it in the module" of the brief only in _which_ module: the OWID module owns the declaration, each category module only registers itself. The category module still "declares OWID as a data source" through that registration, and removing it removes its category from the provider's list.

## 4. API: dependencies health

- New dependencies in `apps/api` (exact): `@nestjs/terminus@12.1.0` (peers `@nestjs/core`/`common` ^12 satisfied), `@nestjs/axios@12.0.1` and `axios@1.20.0`. Terminus' `HttpHealthIndicator` requires `@nestjs/axios` at runtime (`assertPackages`), and `axios` is a peer of `@nestjs/axios`. `axios@1.20.0` is the version the repository already forces with a root `overrides` entry; it is declared as a direct `apps/api` dependency because the pruned lockfile used by the Docker image does not inherit root overrides (the same trap documented for `multer`). `@nestjs/axios` is used **only** for this indicator; the outbound data client stays on native `fetch`.
- `HealthModule` imports `TerminusModule` and `HttpModule`, and adds `DependenciesHealthController` (`@Controller('health')`, `@Get('dependencies')`) plus `OwidHealthIndicator` (`apps/api/src/health/owid.health-indicator.ts`). The existing `HealthController` is not modified and gets no new dependency, so liveness cannot call OWID by construction.
- `OwidHealthIndicator.check()` calls `HttpHealthIndicator.pingCheck('owid', url, { httpClient: httpService, timeout: 3000, headers: { 'User-Agent': USER_AGENT } })` where `url = {OWID_GRAPHER_BASE_URL}/co-emissions-per-capita.metadata.json` (4 KB, and the very chart the module depends on, so a renamed or removed chart turns the check red). Passing `httpClient` (the injected `HttpService`) makes tests network-free and keeps the dynamic package load out of the picture. The timeout is a constant (3 s), not an env var.
- **Response shape:** Terminus' native result (`{ status: 'ok' | 'error', info, error, details }`), `200` when up and `503` when down. This is an explicit exception to the `ApiResponse` envelope, like the liveness `{ status: 'ok' }`, because this is the shape probes and monitors understand. Terminus signals failure by throwing `ServiceUnavailableException` whose response is the result object, which the global filter would flatten to `"Unknown error"`; the controller therefore catches that exception, sets status `503` and returns the result body.
- Not `@SkipThrottle()`: unlike liveness it triggers an outbound request, so it stays under the global 60/min limit.
- One indicator per **provider**, not per category: five OWID categories still produce one OWID check. Future providers (NOAA, World Bank) add their own indicator class and one line in the controller.

## 5. API: file structure

```
apps/api/src/
  common/errors/provider-error.ts           # ProviderError, ProviderDataError
  common/filters/all-exceptions.filter.ts   # + 502 branch
  common/http/outbound-http-errors.ts       # OutboundHttpError extends ProviderError
  modules/providers/owid/owid-errors.ts     # OwidClientError extends ProviderError
  modules/providers/owid/owid-provider-status.ts   # registry + @DataSourceContributor
  modules/providers/owid/owid.module.ts     # + provide/export OwidProviderStatus
  modules/co2-emissions/
    co2-emissions.constants.ts              # slugs, columns, indicator ids, start year, rounding
    co2-emissions.service.ts
    co2-emissions.controller.ts
    co2-emissions.module.ts                 # imports OwidModule
  health/dependencies-health.controller.ts
  health/owid.health-indicator.ts
  health/health.module.ts                   # + TerminusModule, HttpModule
packages/shared/src/lib/co2-emissions.ts
packages/shared/src/lib/country-codes.ts
```

Service flow: `Promise.all` of four calls — `getGrapherSeries(total slug, { country, timeRange, column })`, the same for per capita, and `getIndicatorMetadata` for both ids — then `buildCo2EmissionsData(...)` (a pure function, unit-tested against fixtures) merges by entity code. All four are cached 24 h by `OwidClient`, so the service does no caching of its own; assembly of cached data takes milliseconds. Any thrown `OwidClientError`/`OutboundHttpError` propagates to the filter; `ProviderDataError` is thrown when the result has no `OWID_WRL`, no rows, or no usable year.

The API does not compress responses (no `compression` middleware) and this change does not add it: the BFF response (about 200 KB) is fetched server-to-server by Vercel, and the HTML that reaches browsers is compressed by Vercel.

## 6. Web: page architecture

### Registry (replaces the per-category `if`)

`apps/web/src/lib/categoryPages.tsx`:

```ts
export interface CategoryPageDefinition<T = unknown> {
  load: () => Promise<T>; // server-side data fetch (fetchFromBff based)
  Content: ComponentType<{ data: T }>; // server component (may contain client islands)
}
export const CATEGORY_PAGES: Partial<Record<EcoCategory, CategoryPageDefinition>>;
```

A small `defineCategoryPage<T>()` helper keeps each entry type-safe without `any`. `water-footprint` is migrated into the registry (its `load` is `getWaterFootprintProducts`, its `Content` wraps `WaterFootprintContent` in the same `mt-8 w-full flex justify-center` container) with no behavior change; `co2-emissions` is the second entry. In `[category]/page.tsx`: `const definition = CATEGORY_PAGES[category]`; with one, `const data = await definition.load()` and render `<definition.Content data={data} />` under the common header; without one, render the unchanged placeholder. `generateStaticParams` returns every `ECO_CATEGORIES` slug **not in the registry**, so adding a registry entry is what takes a category out of build-time pre-rendering (no list to keep in sync). The Suspense boundary for the awaited fetch is the segment's existing `loading.tsx`; the chart has its own `next/dynamic` loading state. `revalidate = 86400`, `dynamicParams = true` and `maxDuration = 30` are unchanged.

### Envelope helper

`fetchFromBff` returns only `data`, but attribution must come from the API (`meta.source`). `bffFetch.ts` gains `fetchEnvelopeFromBff<T>({ path, label, isData })` returning `{ data, meta }`, with the same retry/timeout/headers/failure rules; the guard additionally requires `meta.source` and `meta.fetchedAt` to be present and well-typed when the caller asks for `requireMeta`. `fetchFromBff` is reimplemented on top of it (returning `.data`), so every existing caller and test is unchanged. `getCo2Emissions()` in `lib/co2Emissions.ts` uses the envelope variant with a guard that checks the payload shape (arrays of equal length to `endYear - startYear + 1`, World present).

### Components

```
components/charts/
  chartTokens.ts        # CHART_COLOR_TOKENS, UI token names the theme uses
  chartTheme.ts         # resolveColor() (1x1 canvas), buildChartTheme()
  echartsSetup.ts       # echarts.use([...]) — line, grid, tooltip, legend, aria, SVGRenderer
  EChart.tsx            # 'use client' wrapper: init(svg), ResizeObserver, setOption then setTheme, MutationObserver on <html class>, dispose
  LazyEChart.tsx        # 'use client': next/dynamic(() => import('./EChart'), { ssr: false, loading: skeleton })
  ChartSkeleton.tsx     # same-height placeholder (tokens: bg-skeleton)
components/
  CountryCombobox.tsx   # generic WAI-ARIA combobox (options: { code, name, iso2 })
  CountryFlag.tsx       # imports flag-icons CSS; <span class="fi fi-xx">; lazy-in-lists variant; globe for null iso2
  GlobeIcon.tsx         # monochrome currentColor inline SVG (not in icons/: it is not a category icon)
  co2-emissions/
    Co2EmissionsContent.tsx   # server: intro, key figures, explorer, attribution, note
    Co2KeyFigures.tsx         # server: World latest total + per capita
    Co2Explorer.tsx           # 'use client': selection + metric state, combobox, toggle, chart, table, live region
    Co2DataTable.tsx          # <details><table> for the selected entity
lib/co2Emissions.ts
lib/co2ChartOption.ts         # pure: (entity, metric, data) -> ECharts option (no colors)
lib/categoryPages.tsx
```

`GlobeIcon` is deliberately outside `components/icons/`: that folder is the set of multicolor category icons governed by the `svg-icon-components` and `light-mode-styling` specs ("one per category"). The globe is a monochrome UI glyph that inherits `currentColor`. No existing icon in the repository is a globe (the site logo is a hands/leaf mark), so there is nothing to reuse.

### Chart foundation

- **Tokens.** `globals.css` declares only `--chart-1..8` on `:root` and `.dark` with the hex values from `docs/design-system.md` (they are hex, as validated, while UI tokens are `oklch()`; the `design-tokens` spec is modified for that). They are not mapped in `@theme inline` (no utilities: chart colors never go through Tailwind). The sequential ramp is not declared: it is added by the first change that uses it (the world map), so no unused token exists.
- **Adapter.** `chartTheme.ts` reads each token with `getComputedStyle(document.documentElement).getPropertyValue('--name')`, resolves any CSS color to `rgba()` by painting it into a 1x1 canvas and reading the pixel back, and returns the ECharts theme: `color` (the 8 categorical), axis line/label/split colors from `line`, `fg-muted`, `line-subtle`, tooltip background/border/text from `surface-raised`, `line-strong`, `fg`, legend text from `fg-secondary`. Chart options (`lib/co2ChartOption.ts`) never name a color: the series takes `chart-1` from the theme palette.
- **Wrapper.** `EChart` calls `echarts.init(el, undefined, { renderer: 'svg' })`, `setOption(option)` **then** `setTheme(theme)` (rule 2), observes size with `ResizeObserver`, re-resolves and re-applies the theme when the `dark` class on `<html>` changes (`MutationObserver`), and `dispose()`s on unmount. `prefers-reduced-motion: reduce` turns animation off.
- **Lazy.** `LazyEChart` (client) wraps `next/dynamic(..., { ssr: false })` and renders `ChartSkeleton` with exactly the chart height (`h-72 sm:h-96`) while loading, so nothing shifts.
- **Option defaults.** A `baseChartOption()` helper applies the mobile-safe defaults (rule 6: `tooltip.confine`, `axisLabel.hideOverlap`, `legend.type: 'scroll'` for the future multi-series case) and `aria.enabled`; the CO2 option adds the line series, `showSymbol: false`, `connectNulls: false`, a `valueFormatter` with the unit, and a year category axis.
- **Jest.** `next/jest` prepends `/node_modules/` to `transformIgnorePatterns`, so the config is exported as an async function that post-processes the generated config to allow `echarts` and `zrender` through the transformer. `jest.setup.ts` injects an approximate `measureText` through zrender's platform API (importing only zrender's platform module, not all of echarts, to keep every other test file fast). Chart tests initialise with explicit size and assert on SVG output. jsdom has no canvas 2D context: the adapter test stubs `HTMLCanvasElement.prototype.getContext` (an un-stubbed call makes jsdom print a "not implemented" error, which the zero-warning rule forbids).
- **`designTokens.test.ts`.** Chart tokens are exempt from the "must be mapped in `@theme inline`" check and the "must be used by a utility or `var()`" check; instead the test asserts that the set of `--chart-*` names declared in `globals.css` equals `CHART_COLOR_TOKENS` exported by the adapter (so a token nobody reads, or one the adapter reads but nobody declared, fails), and that each has both a light and a dark value. The palette-utility regex is untouched, so `fi fi-ar` and ECharts code do not trip it (flags are images, not color utilities).

### Flags

`flag-icons@7.6.0` (MIT, verified with `npm view`; unpacked package: `css/flag-icons.min.css` 28 KB, `flags/4x3/*.svg` 271 files, 1.93 MB total raw / about 610 KB gzipped, largest `rs.svg` 181 KB). The package has no `exports` map, so `import 'flag-icons/css/flag-icons.min.css'` resolves, and the CSS references each SVG with `background-image: url(../flags/4x3/xx.svg)`: Next's CSS pipeline emits the files as static assets and the browser requests **only the flags of elements that are actually rendered**. The CSS is imported from `CountryFlag.tsx` (a client component used only by the CO2 page), so the 28 KB stylesheet does not load on other routes. CSP is unaffected (`img-src 'self' data: blob:`; the assets are same-origin or inlined as `data:`).

The catch measured above is that opening a listbox of 217 options with every flag rendered would request all 217 SVGs (about 1.5 MB, with some above 80 KB). So in the listbox `CountryFlag` renders its `fi fi-xx` span only once the row intersects the listbox viewport (`IntersectionObserver`, with a neutral placeholder box of the same size before that; when `IntersectionObserver` is unavailable, as in jsdom, it renders immediately). The selected country's flag in the input is always rendered. The `.fi` rules require `display: inline-block; width: 1.333em` (4:3); the combobox sets a fixed size and `rounded-sm` with a `ring-1 ring-line-strong` outline so pale flags (Japan, Finland) stay visible on both surfaces. Flags are decorative (`aria-hidden`): the country name is always adjacent text.

Verification that the build bundles and fetches as claimed is an explicit task (build output contains the media files; the network log of the E2E test shows only a handful of flag requests after opening the list).

### Combobox

`CountryCombobox` is generic (`options: { code; name; iso2 }[]`, `value`, `onChange`, `label`), so later categories reuse it. Pattern: WAI-ARIA 1.2 editable combobox with list autocomplete.

- `<label>` + `<input role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant autocomplete="off">`; popup `<ul role="listbox">` with `<li role="option" id aria-selected>`; `aria-selected` marks the active option (as in the APG), and the currently chosen entity gets a check glyph. A polite live region (`role="status"`, visually hidden) announces "N countries found" / "No countries found".
- Keys: ArrowDown opens and moves (wraps), ArrowUp moves, Home/End jump to first/last option **while the popup is open** (otherwise they move the text caret), Enter selects the active option, Escape closes the popup (and, when already closed, restores the selected name), Tab closes and keeps the current selection; blur restores the input text to the selected name. A clear button (`aria-label="Clear search"`, hidden when empty) empties the query and keeps focus in the input.
- Filtering: case- and diacritic-insensitive (`normalize('NFD')`), name prefix matches first then substring matches, plus alpha-3 code prefix; empty query lists World first, then everything.
- Mobile: `text-base` (>= 16 px so iOS does not zoom), `min-h-11` input and options (44 px touch targets), `max-h-60 overflow-y-auto` listbox, full width up to `max-w-sm`, option text truncates. Colors only from tokens: `bg-surface-raised`, `border-line-strong`, `text-fg`, `bg-hover` for the active option, `text-accent` for the check, the focus-ring pattern already used in the repo (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset`). Active option is highlighted by background plus a leading bar so it is not color-only.

### Page content and SEO

Server-rendered: `<h1>CO2 Emissions</h1>` (unchanged by `co2-title-override`), an intro paragraph, a key-figures block ("In <year> the world emitted <N> million tonnes of CO2, <M> tonnes per person", numbers formatted with `Intl.NumberFormat('en-US')` so server and client agree), the explorer card, the attribution line and a methodology note (fossil fuels and industry only, land-use change excluded, territorial). The explorer (`'use client'`) is server-rendered too (client components SSR) with World selected: the heading, toggle and the collapsed data table's 75 rows are in the HTML, the chart area holds the skeleton. Key figures are derived from the World entity of the same payload; there is no second fetch. The Server -> Client boundary carries the payload once (about 200 KB raw, 70 KB gzipped in the HTML).

Data table: `<details><summary>View data table</summary><table>` for the **selected** entity only, columns Year / Total (Mt CO2) / Per capita (t CO2), newest year first, scrollable container with a caption. It re-renders on selection, stays collapsed by default, and is light (75 rows).

Metadata: `CATEGORY_DESCRIPTIONS['co2-emissions']` is replaced by live-content copy (146 characters: "CO2 emissions by country since 1950: total annual emissions and emissions per person for every country and the world. Data from Our World in Data."), `<title>` stays `CO2 Emissions | eco-metrics earth`, canonical `/co2-emissions/`.

### Rendering mode and failure behavior

Identical to water-footprint: excluded from `generateStaticParams`, generated on first request, ISR 24 h, `fetchFromBff` (two attempts, 10 s each). A BFF `502` is a failed attempt; on revalidation the last good page is kept. `maxDuration = 30` already covers 2 x 10 s.

## 7. Alternatives considered

| Topic                    | Chosen                                                  | Rejected and why                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wire shape               | Year-aligned arrays                                     | `MetricSeries[]` with point objects: about 140 KB gzipped for both metrics, double the budget                                                                                                                                                                                                                                  |
| All-countries retrieval  | `csvType=filtered` with an explicit allowlist           | (a) Add `csvType=full` to `OwidClient` and filter server-side: pulls 800 KB x 2 from 1750 and needs a client contract change; (b) `getIndicatorData` (API v1 columnar): includes aggregates, full history, needs entity-id resolution through a third response; (c) omit `country`: returns only the chart's default selection |
| Provider failure mapping | Base class + one filter branch                          | Per-service try/catch wrapping: repeated in every module and easy to forget; mapping `OwidClientError` in the filter: couples `common/` to a module                                                                                                                                                                            |
| Dependencies health      | Terminus `HttpHealthIndicator` + injected `HttpService` | Custom indicator over `OutboundHttpClient`: viable, but the brief fixed Terminus; the `HttpService` injection costs one extra dependency                                                                                                                                                                                       |
| Provider declaration     | One contributor in `OwidModule` + category registration | Each category declares `owid`: duplicate-id crash at the second category                                                                                                                                                                                                                                                       |
| Crosswalk location       | `@eco-metrics/shared`                                   | API-only (no flag-coverage test), web-derived (couples the contract to presentation)                                                                                                                                                                                                                                           |
| Flags                    | `flag-icons` CSS                                        | Emoji flags (two letters on Windows); inline SVG React components for 250 countries (bundle); `circle-flags`/`country-flag-icons` were not evaluated by measurement and stay candidates if asset weight becomes a problem                                                                                                      |
| Selection state          | Client state                                            | Query string or path segment: more URLs to canonicalize and cache, unnecessary for one chart                                                                                                                                                                                                                                   |
| Table scope              | Selected entity                                         | Full country x year table: 217 x 75 rows, heavy; deferred to the table-library evaluation                                                                                                                                                                                                                                      |
| Chart wrapper            | Own thin wrapper                                        | `echarts-for-react` (forbidden by design-system rule 2)                                                                                                                                                                                                                                                                        |

## 8. Risks

| Risk                                                                                                              | Mitigation                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listbox renders 217 flags and downloads about 1.5 MB (largest `rs.svg` 181 KB)                                    | Render flags only for rows that intersect the listbox; E2E asserts a small number of flag requests after opening; documented as a known cost, with alternatives noted in `libraries.md`                                                                                   |
| First request after a deploy: Cloud Run cold start plus four OWID calls can exceed the web's 10 s attempt timeout | The first attempt still populates the BFF cache (the handler keeps running), so the second attempt is served from cache; `maxDuration = 30`; same pattern as the water-footprint cold-start change                                                                        |
| OWID changes a chart slug, column or header                                                                       | `column` is passed explicitly and validated against the CSV header; failures become `502` plus an error log; the dependencies check probes the per-capita chart metadata                                                                                                  |
| Year rollover changes the cache key (`time` upper bound = current year)                                           | One cache miss per year; accepted                                                                                                                                                                                                                                         |
| `@nestjs/terminus` 12 / `@nestjs/axios` 12 are ESM and Terminus loads `@nestjs/axios` dynamically                 | The api Jest config already transforms `@nestjs/*`; `@nestjs/axios` is imported statically by `HealthModule` so the pruned lockfile and the webpack externals keep it; verify with `nx build api` and the prune-lockfile guard (`npm ci --dry-run` on the pruned package) |
| `axios` version drift in the pruned lockfile                                                                      | Declared as a direct dependency at the pinned override version                                                                                                                                                                                                            |
| E2E reaching live OWID would be flaky                                                                             | E2E uses a local OWID fixture server started by the existing webServer wrapper (section 11); real OWID is verified manually                                                                                                                                               |
| Theme adapter in jsdom: no canvas                                                                                 | Resolver is injectable; tests stub `getContext`; adapter logic is covered with a deterministic fake                                                                                                                                                                       |
| Hydration mismatch from number/date formatting                                                                    | Fixed `en-US` locale, no `Date` in rendered output                                                                                                                                                                                                                        |
| Chart interactions across the five Playwright projects were only spiked on Chromium                               | The E2E spec runs in all five projects and the result is recorded in `docs/technical/libraries.md`                                                                                                                                                                        |
| `lastUpdated` of the OWID data source before any retrieval                                                        | See open question 1                                                                                                                                                                                                                                                       |
| ROADMAP is written in Spanish, specs in English                                                                   | Roadmap edits follow the roadmap's language; artifacts and code stay English                                                                                                                                                                                              |

## 9. Test strategy

- `shared`: crosswalk table well-formed (alpha-3 to two uppercase letters, unique alpha-2), World and Kosovo handling, allowlist helper.
- `api`: fixtures captured once from the real URLs (trimmed to a few entities, years 1950-1952, including `OWID_WRL`, `OWID_KOS`, `ATA` with no per-capita, an aggregate `OWID_EUR`, and the two indicator metadata responses); service (merge, rounding, filtering, ordering, World-first, all-null dropped, `ProviderDataError` cases), controller (envelope, `meta`), filter (502 for outbound/OWID/data errors, 500 unchanged for others), `OwidProviderStatus` (category registration, fallback timestamp, duplicate-free catalog with two categories), health (liveness never touches the stub; dependencies up/down with `HttpService` stubbed), module wiring in `AppModule`. No network.
- `web` unit: tokens test, adapter (stubbed canvas), wrapper (explicit size, SVG output, `setTheme` after `setOption`, dispose, dark-class re-theme), option builder, combobox (roles, filtering, every key), flag component, explorer (state, toggle, live region, no fetch), key figures, table, registry and page dispatch, envelope helper, flags coverage (every crosswalk alpha-2 has a `.fi-xx` rule in the installed CSS).
- `web` E2E (`test(...)`, real BFF reading OWID from the local fixture server, five projects): render, server-rendered key figures in raw HTML, metadata, combobox typing and full keyboard flow, toggle, selection does not change the URL, flags (class `fi-ar`, no emoji, small number of flag requests), table, attribution, theme toggle repaints, axe, no console errors.

## 10. Decisions on the former open questions (orchestrator, final)

1. **OWID `lastUpdated` in the catalog:** keep the default of section 3 (recorded provider timestamp with basis `'provider'`, else retrieval basis); no shared-type change.
2. **Chart tokens:** only the eight categorical `--chart-1..8` are declared now. The sequential ramp is added by the first change that uses it (the world map), so no unused token exists; the divergent palette stays pending.
3. **E2E does not depend on live OWID** (section 11). Real-OWID verification is a manual check (task 2.14).
4. **Roadmap:** delete the completed phase block, renumber, update the status table and action plan, and add the visitor-country idea.
5. **Flag weight** and **6. rounding/units:** accepted as designed. Per-capita values that round to 0.00 are shown as "< 0.01" (never "0.00") in the table, tooltip and key figures.

## 11. E2E fixture server for OWID

The E2E environment must be deterministic and offline-safe, so the E2E API is pointed at a small local server that mimics the OWID endpoints it uses.

- `apps/web/e2e/utils/owid-fixture-server.ts` starts a plain `node:http` server on a fixed local port (for example 3999; fail fast if it is taken) and serves, from committed static files in `apps/web/e2e/fixtures/owid/`:
  - `GET /grapher/annual-co2-emissions-per-country.csv` and `GET /grapher/co-emissions-per-capita.csv` (the query string is ignored): a handful of entities (World `OWID_WRL`, Argentina `ARG`, United States `USA`, Kosovo `OWID_KOS`, one entity with null years and a per-capita value that rounds to 0.00), years 1950-2024 so the key figures and the table are stable;
  - `GET /grapher/co-emissions-per-capita.metadata.json` (the health probe path, which derives from `OWID_GRAPHER_BASE_URL`);
  - `GET /v1/indicators/1119906.metadata.json` and `1119914.metadata.json` (trimmed), served under the API base path.
- `run-dev-servers.ts` (the existing webServer wrapper) starts the fixture server before the API, passes `OWID_GRAPHER_BASE_URL=http://localhost:<port>/grapher` and `OWID_API_BASE_URL=http://localhost:<port>/v1` in the API environment (both pass the existing Joi validation: valid URIs, no trailing slash), waits for it with the existing readiness helper, and closes it in the existing cleanup path. The values live next to the other E2E environment constants in `utils/api-env.ts`.
- The CSV rows are the real format (`entity,code,year,<column>`), so the fixture exercises the real parser. Fixtures are hand-trimmed from the captures of task 2.9 and committed; no spec reads live OWID.
- Consequences: no CI network dependency, E2E cannot catch an upstream OWID format change (covered by the manual check and by the dependencies check in production), and the entities named in the spec (World, Argentina) are guaranteed to exist.

## 12. SEO: schema.org `Dataset` structured data

The page describes its data as one schema.org `Dataset` in JSON-LD, the type Google Dataset Search reads; there is no chart-specific type, and one block covers both metrics because the page has one chart with a toggle. It is built by a pure function from the same payload the page renders, so years, units and the upstream dataset version never drift, and rendered by a generic `JsonLd` server component following the Next.js guide (`<` escaped). `distribution` is omitted because the site offers no download (Google requires `contentUrl` only for downloadable data); `isBasedOn` points at the upstream dataset and `includedInDataCatalog` at `/data-sources/`. `BreadcrumbList` is not added: the site shows no visible breadcrumbs, and the markup must match visible content. Validated with the Schema.org Markup Validator against real OWID data (0 errors, 0 warnings).
