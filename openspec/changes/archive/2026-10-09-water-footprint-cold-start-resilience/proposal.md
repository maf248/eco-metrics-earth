# Proposal

## Why

The API runs on Cloud Run with scale-to-zero, and a cold start takes ~6–7 s (measured on 2026-10-09: 6.6 s on production; on the dev service the web's exact fetch failed with `TimeoutError after 5003 ms` and succeeded in 0.77 s one second later). The web fetches the water-footprint dataset with a single 5 s attempt and, on any failure, renders an "unavailable" notice with HTTP 200 that the ISR cache keeps as a good page for 24 h. A single cold start during a build or a revalidation therefore breaks `/water-footprint/` for a day, in production and in previews, even though the API recovers a second later.

## What Changes

- The water-footprint fetch makes **2 attempts of 10 s each** (no delay between them: the first attempt wakes the instance). If both fail it logs one `console.error` and **throws**.
- **BREAKING (page behavior):** a failed fetch is never rendered or cached. During an ISR revalidation, Next.js keeps serving the last good page (stale-if-error) and retries on a later request. The "Water footprint data is temporarily unavailable" notice and the `fetchFailed` flag are removed.
- **BREAKING (build):** `/water-footprint/` is no longer pre-rendered at build time. It is generated on the first request after a deploy and then cached with ISR, so `next build` never depends on the API (CI and local builds keep working without it). The other 11 category pages are still pre-rendered. `dynamicParams` becomes `true`; unknown slugs still return 404 through the existing `notFound()` checks.
- The `[category]` segment exports `maxDuration = 30` so the worst case (2 × 10 s) fits the function limit on Vercel Hobby.
- `revalidate` stays at 86400 (24 h).
- Runbook: the cold-start numbers and the "ISR absorbs it" claim are corrected.
- ROADMAP: a new item for BFF-level resilience to external providers (future categories), where the BFF tells the web that a provider is down and the web decides what to show.

## Non-Goals

- No infrastructure or paid features: no `--min-instances`, no `--cpu-boost`, no Vercel plan change.
- No "last updated" or staleness indicator (the dataset is static).
- No change to the API, to other categories, or to the empty-dataset message.
- No provider-failure contract between BFF and web (future ROADMAP item).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `water-footprint-page`: fetch helper retries and throws; failures are never rendered or cached; the page is generated on demand instead of at build time.
- `static-category-pages`: 11 pages pre-rendered at build time, water-footprint on demand; `dynamicParams = true` with 404 via `notFound()`; `maxDuration = 30`.
- `web-api-client`: the fetch options in the internal-key scenario change from a 5 s to a 10 s per-attempt timeout.
- `api-cloud-run-deploy`: the scale-to-zero scenario states the measured cold start and how the web absorbs it.

## Impact

- `apps/web/src/lib/waterFootprint.ts`, `apps/web/src/app/[category]/page.tsx`, `apps/web/src/components/water-footprint/WaterFootprintContent.tsx`.
- Tests: `apps/web/__tests__/lib/waterFootprint.test.ts`, `apps/web/__tests__/app/[category]/page.test.tsx`, `apps/web/__tests__/components/water-footprint/WaterFootprintContent.test.tsx`.
- Docs: `docs/deploy/cloud-run.md`, `ROADMAP.md`.
- Runtime: the first request to `/water-footprint/` after each deploy renders on demand (up to ~20 s in the worst case, once); unknown category slugs now invoke a function before returning 404 instead of being rejected statically. No cost on Vercel Hobby or GCP free tier.
