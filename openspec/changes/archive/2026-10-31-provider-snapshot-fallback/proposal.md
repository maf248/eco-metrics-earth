# Serve the last good provider data when the provider is down

## Why

The three OWID-backed categories (`co2-emissions`, `global-temperature`, `energy-sources`) depend on a third party through our NestJS BFF. When OWID is unreachable the BFF answers `502` and the web either throws (`error.tsx`) or, at best, keeps an older ISR page. Cloud Run scales to zero, so the in-memory cache (`OWID_CACHE_TTL_SECONDS`, 24 h) is lost on every cold start and cannot bridge an outage. The `ProviderError` -> `502` contract already exists; what is missing is persistence of the last good data and a web that can decide, per section, between showing old data, warning about it, or saying the data is unavailable.

Water footprint uses our own dataset and is not affected.

## Goals

- **Persist a last-known-good snapshot** of each provider-backed category payload (the assembled payload the endpoint serves, not raw upstream files) in Google Cloud Storage, one object per category per environment (`production/` and `development/` prefixes in one bucket), staying 100% inside the GCS Always Free tier.
- **Make it generic.** A storage abstraction (injection token) with a GCS implementation and a disabled/no-op implementation, plus one shared wrapper so any future provider-backed category opts in with a few lines. Nothing in it is OWID-specific.
- **Write policy:** after a successful provider fetch, write only if the content hash changed or the stored snapshot is older than about 24 h. At most about one write per day per category per environment, however many cold starts happen.
- **Read policy:** read the snapshot payload lazily, only when the provider fails, and keep it in memory afterwards.
- **Response contract:** provider failure plus snapshot -> `200` with the stored payload and `meta.stale: true` plus `meta.fetchedAt` (time of the last successful provider fetch). Provider failure and no snapshot -> the existing `502`. The BFF applies no age threshold.
- **Degrade gracefully:** with no bucket configured, or when GCS errors or lacks permission, the BFF behaves exactly as today; a storage failure never turns a good provider response into an error and never affects `GET /api/v1/health`.
- **Web decides per section** from `meta.fetchedAt` when `meta.stale` is true, with configurable thresholds (global default, optional per-category override): age <= 7 days shows the data silently; 7 to 30 days shows the data under a stale notice; over 30 days, or a provider `502`, shows an "unavailable" state in place of the section content. The page and the build never fail because of the provider.
- **Reusable UI:** a stale notice and an unavailable state shared by every provider-backed category, new warning tokens (light and dark), both documented in `docs/design-system.md`.
- **Ops:** a copy-paste Cloud Shell runbook to create and secure the bucket, grant the Cloud Run runtime service account access, and set the GitHub variable; the deploy workflow passes the bucket and environment prefix.

## Non-Goals

- Water footprint (own dataset), monitoring/Sentry, new categories, Firestore, any paid service or any usage outside the GCS Always Free tier.
- Storing raw upstream CSV/JSON, keeping version history of snapshots, or serving snapshots older than the latest one (soft delete and object versioning stay off).
- Age thresholds in the BFF. It always serves the snapshot it has; the web decides.
- A retry button or client-side refetch in the unavailable state (ISR handles retries server-side).
- Persisting anything for the data-sources catalog, health checks or the in-memory OWID client cache (that cache stays as is).
- A negative cache in the BFF for provider failures, and any change to the OWID client, its retry policy or its TTL.
- An E2E failure mode for the OWID fixture server (see `design.md`, Decision 11); stale paths are covered by unit tests.
- Changing the `502` body, the global exception filter or `error.tsx`. Failures of our own BFF (unreachable, non-`502`) keep today's behavior.
- Per-category copy overrides for the notice or unavailable state, or a visual redesign of the category pages.

## Impact

- **`packages/shared`:** `ApiResponseMeta` gains an optional `stale?: boolean`; `fetchedAt` is redefined as the time of the last successful provider fetch.
- **`apps/api`:** new `common/snapshots/` (store token and interface, GCS store, disabled store, `ProviderSnapshotService`, module); the three OWID services/controllers use it; `buildOwidEnvelope` takes `fetchedAt` and `stale`; new env vars `SNAPSHOT_BUCKET` and `SNAPSHOT_PREFIX` (Joi, `AppConfigService`); new dependency `@google-cloud/storage` (exact version, `apps/api/package.json` only).
- **`apps/web`:** provider-aware BFF read (distinguishes a provider `502` from our own failures), freshness evaluation with thresholds, `StaleDataNotice`, `DataUnavailable`, a `WarningIcon`, warning tokens in `globals.css`, registry entries for the three categories, page-level handling that keeps degraded renders out of the 24 h ISR slot.
- **Ops/docs:** `deploy-api.yml` (optional repo variable `SNAPSHOT_BUCKET`, per-target prefix), `docs/deploy/cloud-run.md` (new one-time setup section), `.env.example`, `README.md` env table, `docs/design-system.md`, `AGENTS.md` (recipe and structure tree), `ROADMAP.md` (close-out).
- **Rollout:** run the Cloud Shell setup, then push to `develop`; verify the dev service writes `development/*.json`; then PR `develop` -> `main`. Deploy the API before the web (payload contract and Next Data Cache note in `AGENTS.md`). The code is safe in any order because an unset or failing bucket disables persistence.
