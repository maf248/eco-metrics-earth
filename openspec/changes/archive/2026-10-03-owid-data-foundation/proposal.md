# OWID Data Foundation (ROADMAP P1.0)

## Why

The BFF currently serves exactly one data source: the static water-footprint dataset. No external data provider is connected, and the 11 remaining category pages are placeholders (ROADMAP: "Datos reales — Ningún proveedor externo conectado"). Every P1 category module (P1.1 `co2-emissions`, P1.2 `global-temperature`, P1.3 `energy-sources`) needs the same three foundations: shared metric types, an outbound HTTP client, and a cached provider client for Our World in Data (OWID) — the first provider per the Estrategia de Proveedores de Datos (CC BY license, no API key, no rate limits, 11 of 12 categories covered, both consumption modes already validated in the Postman collection).

This change builds that foundation and nothing on top of it: no endpoints, no UI, no charts. It also lands the `ApiResponse<T>` metadata extension (ROADMAP I10) now — while no data-bearing endpoint exists — so the response contract never breaks retroactively: "Diseñarlo en P1.0 para no romper el contrato después."

## What Changes

- **Shared types (`@eco-metrics/shared`)**: new `MetricPoint`, `MetricSeries`, `DataSourceAttribution`, and `ApiResponseMeta` types; `ApiResponse<T>` gains an optional `meta?: ApiResponseMeta` on both union branches (I10). Optional means backward compatible: every existing response literal (water-footprint endpoint, its tests, frontend narrowing) remains type-valid and behavior-identical.
- **Outbound HTTP client (`apps/api/src/common/http/`)**: `OutboundHttpClient` — Node 24 native `fetch` wrapped in a Nest service (design.md D1 evaluates `@nestjs/axios` vs native fetch and recommends one), with per-attempt timeout (`AbortSignal.timeout`), bounded retry for transient failures, and an identifiable `User-Agent`. The fetch implementation is an injectable provider token (`OUTBOUND_FETCH`) so unit tests run with zero network calls.
- **`OwidClient` (`apps/api/src/modules/providers/owid/`)**: both consumption modes — API v1 JSON (`getIndicatorData(id)`, `getIndicatorMetadata(id)`) and Grapher CSV (`getGrapherSeries(slug, { country, timeRange })` with server-side CSV parsing to `MetricSeries[]`). Explicit parameter validation before any network call; a typed error contract for P1.1 to map.
- **Caching**: `@nestjs/cache-manager` with the built-in in-memory store, default TTL 24 h, registered module-scoped in `OwidModule`. TTL and base URLs (plus the HTTP timeout — see scope note) are typed env vars in `AppConfigService`, validated by the Joi startup schema. No database (I04 stays backlog).
- **Config wiring**: `AppConfigService` becomes importable by feature modules via a new `@Global()` `AppConfigModule` (today it is only reachable from `main.ts` via `app.get`).
- **Docs sync**: `apps/api/.env.example`, the Environment Variables tables in root `README.md` and `apps/api/README.md`, and a ROADMAP note recording the health-indicator deferral.

## Deviation from ROADMAP P1.0 (approved)

ROADMAP P1.0 item 5 — an OWID `HttpHealthIndicator` via `@nestjs/terminus` registered in `HealthModule` — is **deferred to P1.1** by explicit user decision. Rationale: Cloud Run deploys the API with a startup probe on `GET /api/v1/health` (`.github/workflows/deploy-api.yml`: `--startup-probe=httpGet.path=/api/v1/health` with `failureThreshold=15`). Coupling that probe to OWID availability *before any endpoint consumes OWID* would let an OWID outage fail the startup probe and roll back API deploys that have no functional dependency on OWID. The `@nestjs/terminus` install moves to P1.1 together with the indicator. This is the only P1.0 item not delivered by this change; it is recorded in ROADMAP.md as part of this change's docs task.

## Scope adjustments flagged for review

Two additions beyond the locked scope, both flagged for the review checkpoint (removing either is a one-line edit):

1. **`OWID_HTTP_TIMEOUT_MS` env var** — the locked set was "TTL and base URLs". A timeout knob follows the same typed-env pattern and gives operators a lever against a slow upstream on Cloud Run; the default (10 000 ms) applies when absent.
2. **Optional `column` selector on `getGrapherSeries`** — the locked options object is `{ country, timeRange }`. Empirical capture of P1.2's chart (`temperature-anomaly`) shows it is multi-column (`entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower,..._upper`): a client that only auto-maps single-column charts would force P1.2 to modify the client before reading its primary chart. The `column` option is a strictly additive, explicitly validated superset: omitted + exactly one value column → that column; omitted + 2+ value columns → `OwidUnsupportedChartError` listing the columns (never a silent wrong column); provided but absent from the header → `OwidInvalidParameterError` listing the columns.

## Non-Goals / Out of scope

- **No UI** — no pages, charts, populated sections, country selector, loading or error states. All 11 placeholder pages stay placeholders (P1.1+).
- **No visible attribution** (ROADMAP I09) — the `DataSourceAttribution` type ships, but the attribution footer component and the `/data-sources/` page are P1.1 (the legal requirement lands with the first data-bearing page).
- **No new HTTP endpoints** — no category routes, no Swagger tag changes. `OwidClient` is consumed programmatically starting in P1.1.
- **No health indicator and no `@nestjs/terminus`** — deferred to P1.1 (see deviation above).
- **No database / persistence** — in-memory cache only (I04 stays backlog).
- **No silent multi-metric chart mapping** — charts with 2+ value columns require an explicit `column` selection or throw; no guessing.
- **No NOAA / World Bank clients** — the HTTP client is generic, but only the OWID provider ships in this change.
- **No deploy workflow or Cloud Run runbook changes** — every new env var has a default, so `deploy-api.yml` and `docs/deploy/cloud-run.md` are untouched.
- **No auth or secrets for OWID** — OWID needs no API key and no authentication; none is invented.
- **No `Retry-After` handling, no jitter, no request coalescing** — bounded fixed-backoff retry only.
- **No frontend changes at all** — not even tests; the web app is untouched by this change.

## Capabilities

### New Capabilities

- `api-data-layer` — the outbound HTTP client (timeout, bounded retry, identifiable User-Agent, injectable fetch), the in-memory response cache with configurable TTL, and the OWID env-var configuration (Joi schema rules, `AppConfigService` getters, `AppConfigModule`).
- `owid-provider-client` — the `OwidClient` service: both consumption modes, explicit parameter validation, Grapher CSV parsing to `MetricSeries[]`, the typed error contract, and the fixture-based zero-network tests.

### Modified Capabilities

- `shared-types` — ADDED requirements: `MetricPoint`/`MetricSeries`, `DataSourceAttribution`, `ApiResponseMeta`.
- `api-response-type` — MODIFIED requirement: the discriminated union gains the optional `meta` field on both branches (backward compatible; narrowing semantics untouched).

## Impact

- **Code**: `packages/shared/src/lib/` (new `metric-series.ts`, `data-source-attribution.ts`; modified `api-response.ts`, `index.ts`), `apps/api/src/config/` (new `app-config.module.ts`; modified `app-config.service.ts`, `env-validation.schema.ts`), new `apps/api/src/common/http/` (service, errors, module), new `apps/api/src/modules/providers/owid/` (module, client, types, errors, CSV parser), modified `apps/api/src/app/app.module.ts` (imports `AppConfigModule`, `OwidModule`).
- **Dependencies** (apps/api only, exact pins): `@nestjs/cache-manager@12.0.0`, `cache-manager@6.x`, `keyv@5.x` (peer of both). Zero HTTP-client dependencies — native `fetch` (design.md D1).
- **Runtime behavior**: none externally visible — no endpoint changes; the water-footprint contract is untouched (optional `meta` only).
- **Tests**: new unit tests and fixtures in `apps/api/__tests__/` (`common/http/`, `providers/owid/`, extended `config/`) and `packages/shared/__tests__/lib/`; zero network calls; existing suites unaffected.
- **Docs**: `apps/api/.env.example`, root `README.md`, `apps/api/README.md`, `ROADMAP.md` (P1.0/P1.1 deferral note).
