# Design: OWID Data Foundation

## Technical Approach

### Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│ apps/api (BFF — NestJS 12, global prefix /api/v1)                 │
│                                                                   │
│ AppModule                                                         │
│ ├── AppConfigModule (@Global)                    [NEW]            │
│ │     └── AppConfigService — owidGrapherBaseUrl, owidApiBaseUrl,  │
│ │                          owidHttpTimeoutMs, owidCacheTtlSeconds │
│ ├── OwidModule                                   [NEW]            │
│ │     ├── CacheModule.registerAsync              [NEW]            │
│ │     │     ttl: owidCacheTtlSeconds * 1000 (ms — see D4)        │
│ │     ├── OutboundHttpModule                     [NEW]            │
│ │     │     └── OutboundHttpClient                               │
│ │     │           OUTBOUND_FETCH token (injectable fetch)        │
│ │     │           timeout · bounded retry · User-Agent           │
│ │     └── OwidClient (exported)                                  │
│ │           getIndicatorData(id)     → API v1 .data.json          │
│ │           getIndicatorMetadata(id) → API v1 .metadata.json      │
│ │           getGrapherSeries(slug, {country, timeRange, column}) │
│ │                                     → Grapher CSV → MetricSeries[]│
│ │           parseGrapherCsv · cache.wrap · structuredClone        │
│ ├── HealthModule (unchanged — indicator deferred to P1.1)        │
│ └── WaterFootprintModule (unchanged)                              │
└───────────────────────────────────────────────────────────────────┘
```

### Data flow (Grapher example)

1. A P1.1 service calls `owidClient.getGrapherSeries('annual-co2-emissions-per-country', { country: ['ARG', 'USA'], timeRange: { from: 1990, to: 2020 } })`.
2. `OwidClient` validates the parameters — invalid input throws `OwidInvalidParameterError` with **no network call**.
3. Cache lookup on `owid:grapher:annual-co2-emissions-per-country:c=ARG~USA:t=1990..2020` — a hit returns a `structuredClone` of the cached payload and never touches the transport.
4. A miss goes through `OutboundHttpClient.getText(url)` — per-attempt timeout, bounded retry, identifiable `User-Agent`.
5. `parseGrapherCsv(csv)` validates the header, maps the value column, groups rows per entity code, sorts points ascending by year → `MetricSeries[]`.
6. The parsed result is cached under the key; a deep copy is returned to the caller.

## D1 — HTTP client: `@nestjs/axios` vs Node 24 native `fetch`

| Criterion | `@nestjs/axios@12.0.1` (HttpModule/HttpService) | Native `fetch` wrapped in a Nest service |
| --- | --- | --- |
| New dependencies | +2 pinned packages (`@nestjs/axios`, `axios@1.x`) | 0 — Node 24 LTS ships stable fetch (undici) |
| Timeout | `timeout` request config | `AbortSignal.timeout(ms)` per attempt — native, no config plumbing |
| Retry | Not built in — needs `axios-retry` (+1 dep) or hand-written interceptor logic | Not built in — a ~15-line bounded loop in the service (the same hand-written code axios would need) |
| Testability with fixtures | Mock `HttpService`/`axiosRef` or add `axios-mock-adapter` (+1 dev dep) | `OUTBOUND_FETCH` DI token — `overrideProvider` swaps the transport for a fixture stub; no mocking library |
| Idiomatic NestJS | Official integration; RxJS observables (`firstValueFrom` on every call for async/await) | A plain `@Injectable()` service — equally idiomatic for a simple outbound GET client |
| Fit to the use case | Interceptors, instances, transforms, uploads — none needed for keyless GETs to a public API | Simple GETs with query params — exactly the use case |
| Bundle | axios + adapter machinery in the webpack bundle | nothing added |

**Recommendation: Node 24 native `fetch` wrapped in `OutboundHttpClient`.**

Justification: the BFF's outbound needs are simple, keyless GET requests to two OWID hosts — no auth flows, no interceptors, no streaming, no uploads. `@nestjs/axios` would add two pinned dependencies and RxJS ceremony (`firstValueFrom` on every call) for machinery this use case never exercises, and it does not even provide the required retry — that is `axios-retry` (a third dependency) or hand-written interceptor logic, i.e. the same amount of hand-written code as the fetch loop. Native fetch on Node 24 LTS is stable and maintained by the Node core team; `AbortSignal.timeout()` gives per-attempt timeouts with no plumbing. Testability is *better* with the DI token: `overrideProvider(OUTBOUND_FETCH)` swaps the transport for a fixture-returning stub with zero mocking libraries and zero network. It also matches the repo's dependency policy (minimal, exact-pinned).

Accepted trade-offs: fetch only rejects on network errors — HTTP error statuses must be checked explicitly via `response.ok`/`response.status` (done centrally in `OutboundHttpClient`); there is no interceptor chain (not needed).

## D2 — CSV parsing: minimal in-repo parser vs a CSV library

Candidates: `csv-parse` (the de facto Node standard), `papaparse` (browser-first), or a minimal in-repo RFC 4180 parser.

The Grapher CSV we consume is machine-generated, requested with `useColumnShortNames=true`, and shaped `entity,code,year,<value column(s)>`. Empirically (validated captures): quoted fields do not appear in the positions we read, but entity names can contain commas in principle (region labels), and line endings may be CRLF.

- A naive `split(',')` parser is rejected outright: it corrupts any quoted field and any CRLF file — a silent data-corruption risk, unacceptable under "correctness over convenience".
- `csv-parse`/`papaparse` are robust but add a pinned dependency for a format whose request shape the client itself controls, and pull in machinery (streams, option surfaces) unused here.

**Recommendation: a minimal in-repo RFC 4180 parser** — `parseGrapherCsv` in `apps/api/src/modules/providers/owid/parseGrapherCsv.ts` (~40 lines, pure function): handles quoted fields with `""` escapes, commas inside quotes, and CRLF/LF line endings; throws `OwidParseError` on malformed input (unterminated quote, ragged row, wrong header). Trivially unit-testable with fixtures, deterministic, zero dependencies. Documented boundary: it assumes well-formed RFC 4180 input from OWID's machine-generated endpoint; if malformed input ever appears in practice, swapping the function's internals for `csv-parse` is a local change behind the same signature (risk R2).

## D3 — Error handling strategy

### Timeout

- Per attempt: `AbortSignal.timeout(OWID_HTTP_TIMEOUT_MS)` (default 10 000 ms; Joi-bounded 1 000–60 000).
- A timed-out attempt rejects with a `TimeoutError`-shaped error → mapped to `OutboundTimeoutError` (carries `url`).

### Bounded retry

- Max 3 attempts total (1 initial + 2 retries); fixed exponential backoff 500 ms → 1 000 ms.
- No jitter: single-instance BFF (`--min-instances=0` on Cloud Run) — there is no herd to jitter against, and fixed delays stay deterministic under fake timers.
- Retry only transient failures: network errors (fetch rejection), timeouts, HTTP 408/429/5xx.
- Never retry other 4xx — retrying a 404 chart slug is waste.
- No `Retry-After` parsing (OWID has no rate limits).

### Failure mapping (error contract)

| Error | Thrown by | Meaning | P1.1 mapping hint |
| --- | --- | --- | --- |
| `OutboundHttpError` (base, carries `url`) | `OutboundHttpClient` | transport-level failure | 502/504 |
| `OutboundTimeoutError` | 〃 | every attempt timed out | 504 |
| `OutboundNetworkError` | 〃 | fetch rejected (DNS, socket) | 502 |
| `OutboundHttpStatusError` (carries `status`) | 〃 | final non-2xx after the retry policy | 502 (404 passthrough for unknown slugs) |
| `OwidClientError` (base) | `OwidClient` | OWID-level failure | 500 |
| `OwidInvalidParameterError` | 〃 | bad slug/codes/range/id/column — thrown before any network call | 400 |
| `OwidParseError` | 〃 | malformed CSV/JSON payload | 502 |
| `OwidUnsupportedChartError` | 〃 | 0 or 2+ value columns with no `column` selection | 400 |

All errors extend `Error` with descriptive messages and preserve `cause` where an underlying error exists. This change defines the contract only — P1.1 controllers map these to `ApiResponse` error shapes through the existing global exception filter.

## D4 — Caching design

- Packages (apps/api, exact pins): `@nestjs/cache-manager@12.0.0` + `cache-manager@6.x` + `keyv@5.x` (peer of both; `rxjs` and `@nestjs/common` peers are already satisfied).
- **In-memory store by default**: `CacheModule.registerAsync` with no `stores` option uses cache-manager v6's built-in memory store — no store package, no database (I04 stays backlog).
- **Module-scoped registration inside `OwidModule`** (not `isGlobal`): the TTL is OWID-specific (`OWID_CACHE_TTL_SECONDS`), so the cache instance belongs to the provider that owns it. A global cache configured by an OWID-specific env var would be a hidden coupling. Future providers (NOAA, World Bank) register their own, or a later change unifies them into a shared `DataCacheModule`.
- **TTL trap**: cache-manager v6 TTL is in **milliseconds** (v4 was seconds). The factory converts: `ttl: appConfig.owidCacheTtlSeconds * 1000`. The env var stays in seconds (operator-friendly, matches the "TTL 24 h" roadmap language).
- **What is cached**: the *parsed* result (`MetricSeries[]`, `OwidIndicatorData`, `OwidIndicatorMetadata`) — never raw text; cache hits skip re-parsing.
- **Keys** (deterministic, namespaced):
  - `owid:indicator-data:{id}`
  - `owid:indicator-metadata:{id}`
  - `owid:grapher:{slug}:c={country joined by ~ | all}:t={from}..{to} | all}`
- **Immutability**: `OwidClient` returns `structuredClone()` of cached payloads — a consumer can never mutate the cache through a returned reference.
- **Cold cache on deploy** is acceptable: in-memory means per-instance; the first request per key repopulates, and the data is annual.

## D5 — Configuration (env vars)

| Variable | Default | Joi rule | `AppConfigService` getter |
| --- | --- | --- | --- |
| `OWID_GRAPHER_BASE_URL` | `https://ourworldindata.org/grapher` | `uri()`, no trailing slash | `owidGrapherBaseUrl` |
| `OWID_API_BASE_URL` | `https://api.ourworldindata.org/v1` | `uri()`, no trailing slash | `owidApiBaseUrl` |
| `OWID_HTTP_TIMEOUT_MS` | `10000` | integer 1 000–60 000 | `owidHttpTimeoutMs` |
| `OWID_CACHE_TTL_SECONDS` | `86400` (24 h) | integer 60–604 800 | `owidCacheTtlSeconds` |

- Trailing-slash base URLs are rejected at startup (they would produce `//` request URLs) — the same fail-fast philosophy as the CORS wildcard rejection, with an error message that says exactly that.
- All four have defaults → the Cloud Run deploy needs no workflow or env-var changes (explicit non-goal).
- `OWID_HTTP_TIMEOUT_MS` is one variable beyond the locked "TTL + base URLs" set — flagged in the proposal; rationale: an operator knob against a slow upstream, following the same pattern. One table row to delete if rejected at review.
- **`AppConfigModule` (new, `@Global()`)**: today `AppConfigService` is provided only in `AppModule` and consumed only from `main.ts` (`app.get`). `OwidModule` and the `CacheModule.registerAsync` factory need it injected — so the service moves behind a `@Global()` module (`providers: [AppConfigService], exports: [AppConfigService]`), imported by `AppModule`, which drops the bare provider. `main.ts`'s `app.get(AppConfigService)` keeps working unchanged.

## D6 — Backward compatibility of `ApiResponse<T>`

```ts
export interface ApiResponseMeta {
  source: DataSourceAttribution;
  fetchedAt: string; // ISO 8601
}

export type ApiResponse<T> =
  | { success: true; data: T; status: number; meta?: ApiResponseMeta }
  | { success: false; error: string; status: number; meta?: ApiResponseMeta };
```

- `meta` is **optional on both branches** → every existing response literal (water-footprint controller, its tests, frontend narrowing) remains type-valid and behavior-identical. No endpoint starts emitting `meta` in this change.
- The `success` discriminant and narrowing semantics are untouched.
- `meta` on the error branch is permitted (a future stale-while-error scenario could attribute cached data) but unused for now.

## D7 — `OwidClient` API surface

```ts
getIndicatorData(indicatorId: number): Promise<OwidIndicatorData>;
getIndicatorMetadata(indicatorId: number): Promise<OwidIndicatorMetadata>;
getGrapherSeries(slug: string, options?: OwidGrapherSeriesOptions): Promise<MetricSeries[]>;

interface OwidGrapherSeriesOptions {
  country?: string[];                        // OWID entity codes: 'ARG', 'USA', 'OWID_WRL'
  timeRange?: { from: number; to: number };  // → time=1990..2020
  column?: string;                           // value-column short name — see scope note
}
```

- **API v1 JSON** (native JSON — ideal for the BFF): `GET {OWID_API_BASE_URL}/indicators/{id}.data.json` and `.metadata.json`. Verified upstream shapes:
  - `.data.json` is columnar: `{"values": [...], "years": [...], "entities": [...]}` — parallel arrays; `entities[i]` is an entity **id** resolved through the metadata's entity dimension. `OwidIndicatorData` is this payload validated (equal-length arrays; each value a finite number or null) plus the requested `indicatorId` (the data file itself carries no id).
  - `.metadata.json` is a flat indicator object with `dimensions.entities.values: [{id, name, code}]`. `OwidIndicatorMetadata` is a validated **subset** — indicator id, name, unit, shortUnit, dataset name/version, timespan, `updatedAt`, and the entity dimension entries — enough for P1.1 to build `DataSourceAttribution` and resolve entity ids → codes. Unknown extra upstream fields are ignored (additive upstream changes are harmless).
- **Grapher CSV**: `GET {OWID_GRAPHER_BASE_URL}/{slug}.csv?v=1&csvType=filtered&useColumnShortNames=true` plus optional `country={codes joined by ~}` and `time={from}..{to}`.
  - **`csvType=filtered` is required for the filters to apply** — empirically verified: `csvType=full` *ignores* `country`/`time` (a full request with `country=USA~ARG&time=1990..1992` still returns all 26 509 rows). The Postman collection's filtered examples use exactly this combination; the client always uses `filtered`.
  - Omitted `country` → the request omits the parameter and OWID's chart-default entity selection applies server-side (pass-through of OWID semantics, documented as a spec scenario); omitted `timeRange` → all available years for the selected entities.
  - Rows with an empty `code` (region aggregates that appear in unfiltered responses) are skipped — they cannot be addressed by entity code.
  - Empty value cells → `value: null` (`MetricPoint.value: number | null`).

### Scope note — the `column` option (flagged for review)

The locked signature is `{country, timeRange}`. Empirical capture shows P1.2's chart (`temperature-anomaly`) is **multi-column**: `entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower,near_surface_temperature_anomaly_upper`. A client that only auto-maps single-column charts would force P1.2 to modify the client before reading its primary chart. The design therefore adds an **optional, explicitly validated `column` selector**: omitted + exactly one value column → that column (ergonomic for the CO₂ charts); omitted + 2+ value columns → `OwidUnsupportedChartError` listing the available columns (explicit, never a silent wrong column); provided + not in the header → `OwidInvalidParameterError` listing the columns. A strict superset of the locked signature — flagged here and in the proposal for approval at review.

## State Management

- No shared mutable state: `OutboundHttpClient` and `OwidClient` are stateless services; the only stateful component is the cache-manager instance owned by `OwidModule` (library-managed).
- Cached payloads are treated as immutable; every return path deep-copies (`structuredClone`).
- No frontend state changes (no UI in this change).

## File structure

```
packages/shared/src/lib/
  metric-series.ts                 (NEW — MetricPoint, MetricSeries)
  data-source-attribution.ts       (NEW — DataSourceAttribution)
  api-response.ts                  (MODIFIED — ApiResponseMeta + optional meta)
  ../index.ts                      (MODIFIED — new exports)

apps/api/src/config/
  app-config.module.ts             (NEW — @Global, provides + exports AppConfigService)
  app-config.service.ts            (MODIFIED — four owid getters)
  env-validation.schema.ts         (MODIFIED — four OWID_* rules)

apps/api/src/common/http/
  outbound-http-client.service.ts  (NEW — service + OUTBOUND_FETCH token)
  outbound-http-errors.ts          (NEW — OutboundHttpError hierarchy)
  outbound-http.module.ts          (NEW — provides the token + service, exports the service)

apps/api/src/modules/providers/owid/
  owid.module.ts                   (NEW — imports OutboundHttpModule + CacheModule.registerAsync)
  owid-client.service.ts           (NEW — the client)
  owid.types.ts                    (NEW — OwidIndicatorData, OwidIndicatorMetadata, options)
  owid-errors.ts                   (NEW — OwidClientError hierarchy)
  parseGrapherCsv.ts               (NEW — pure CSV → MetricSeries[] parser; camelCase per the utility convention)

apps/api/src/app/app.module.ts     (MODIFIED — imports AppConfigModule + OwidModule)

apps/api/__tests__/
  common/http/                     (NEW — client tests: stubbed fetch, fake timers)
  providers/owid/                  (NEW — client, parser, module tests)
  providers/owid/fixtures/          (NEW — static OWID captures)
  config/                          (MODIFIED — schema + getter tests extended)
```

## Test strategy

- **Zero network**: every test injects stubs — `OUTBOUND_FETCH` for `OutboundHttpClient`/`OwidClient` (via `overrideProvider`), inline/file fixtures for parsing. No test URL ever resolves.
- **Fixtures** under `apps/api/__tests__/providers/owid/fixtures/`, derived from the endpoints validated in the Postman collection (the collection stores request definitions, not response bodies): captured once during implementation from the exact validated URLs, trimmed to a few entities/years, committed as static data — e.g. `grapher-co2-per-capita.csv` (2 entities × 3 years, filtered + short names), `grapher-temperature-anomaly.csv` (multi-column), `indicator-1146696-data.json`, `indicator-1146696-metadata.json`.
- **Fake timers** for the retry/backoff matrix (deterministic 500/1000 ms assertions) and the timeout path (the stub rejects with a `TimeoutError`-shaped error, matching what `AbortSignal.timeout` produces).
- **Coverage**: api thresholds (80% statements/functions/lines; branches intentionally omitted per AGENTS.md) must hold with the new code — the retry matrix, parser branches, and validation branches are all stub/fixture-covered. Shared: type-only additions have no coverage impact; the `api-response` compile-level tests extend with `meta` cases.
- **Jest/ESM wiring**: `@nestjs/cache-manager` is ESM-only; the api jest config's `transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)']` already transforms `@nestjs/*` (the scoped name matches the exception), and `cache-manager`/`keyv` ship CJS builds — no jest config change expected. The gate task verifies; if adjustment is needed, extend the existing exception rather than adding a new mechanism.
- **Webpack**: bundling the ESM-only package through the existing webpack build is standard bundler behavior; the build gate verifies.
- **E2E**: no new E2E specs (no user-facing behavior changed); the full existing suite re-runs as a regression gate.

## Risks

| Risk | Mitigation |
| --- | --- |
| R1: OWID changes response shapes (API v1 is young) | The client validates payloads and throws `OwidParseError` with field context instead of returning garbage; subset typing ignores unknown extra fields, so additive upstream changes are harmless. |
| R2: In-repo CSV parser meets malformed input | The parser throws `OwidParseError` — it never silently corrupts; fixtures cover quotes/CRLF/ragged rows; swapping to `csv-parse` behind the same signature is a local change if it ever triggers in practice. |
| R3: ESM-only `@nestjs/cache-manager` vs webpack/jest | Node 24 `require(esm)` + the existing `@nestjs` transform exception; build and test gates verify before merge. |
| R4: OWID outage degrades future endpoints | Bounded retry + the 24 h cache make a short outage invisible to cached keys; P1.1 decides the HTTP error mapping (this change defines the contract). |
| R5: `column` option and `OWID_HTTP_TIMEOUT_MS` drift from the locked scope | Both flagged in the proposal; strictly additive — one row/option to remove if rejected at review. |
