# Design

## Context

`getWaterFootprintProducts()` makes one fetch with `AbortSignal.timeout(5000)` and, on any failure, returns `{ products: [], fetchFailed: true }`. The page renders an alert notice with HTTP 200, and `[category]/page.tsx` pre-renders all 12 slugs at build time with `revalidate = 86400`, so a failed render is stored in the ISR cache for a day. The API on Cloud Run scales to zero and its cold start (~6–7 s, measured) exceeds the 5 s timeout. On 2026-10-09, both production and a preview served the notice; a preview rebuilt while the API was warm rendered the data with the same code and configuration, and a fetch replayed against the cold dev service failed after 5003 ms and succeeded in 0.77 s one second later.

Constraints: no paid features (GCP free tier, Vercel Hobby); CI and local `next build` run without an API server.

## Goals / Non-Goals

**Goals:** a cold start never breaks the page; a failed fetch is never cached as a good page; `next build` never depends on the API.

**Non-Goals:** keeping the API warm, staleness indicators, a provider-failure contract between BFF and web (ROADMAP).

## Decisions

### D1 — 2 attempts × 10 s, no delay, retry on any failure

The first attempt usually wakes the instance; a second attempt then finds it ready (measured: 0.77 s). 10 s covers a typical cold start on its own, and the retry covers a slower one or a dropped connection. A delay adds nothing because the first attempt already waited up to 10 s. Every failure kind is retried: the request is an idempotent GET and one extra attempt on a non-transient failure (e.g. malformed payload) costs one request, which is simpler than classifying errors.

The retry is a real second request, verified against Next.js 16: passing a `signal` opts a `fetch` out of render-pass memoization (each attempt creates its own `AbortSignal.timeout`), and the Data Cache only stores `200` responses (`next/dist/server/lib/patch-fetch.js`), so a failed attempt is never replayed from a cache.

Rejected: only raising the timeout (a failure would still be cached for 24 h); exponential backoff or more attempts (no benefit for a single cold start, longer worst case).

### D2 — Throw instead of a fallback state (stale-if-error)

Next.js documents that when an error is thrown during revalidation, the last successfully generated page keeps being served and revalidation is retried on a later request. Throwing therefore turns any failure into "keep the good page", while a fallback state would overwrite it. Consequences: the `fetchFailed` flag, the alert notice and the HTTP-200-with-notice behavior are removed; the page code no longer branches on failure. The helper logs one `console.error` only when both attempts fail (the first failure is expected on a cold start and is not noise-worthy). The log never includes request headers, so the internal API key cannot leak.

### D3 — Generate `/water-footprint/` on first request, not at build time

With D2, a pre-rendered page would make `next build` fail whenever the API is unreachable: always in CI and in local builds, and in Vercel builds during an outage. Excluding the slug from `generateStaticParams` and setting `dynamicParams = true` keeps the route under ISR but defers the first render to the first request after a deploy. Unknown slugs must keep a real 404. With `dynamicParams = true` they are rendered on demand, and the segment's `loading.tsx` wraps the page in a Suspense boundary, so a `notFound()` inside the page fires after the response started streaming as 200 (verified with `next start`: 200 + `noindex`, also for Googlebot). A `[category]/layout.tsx` validates the slug above that boundary and returns a real 404 (verified), which is the placement the Next.js streaming guide prescribes. `proxy` was rejected as an extra moving part for a check the layout already covers. The trade-offs: the first visitor after a deploy waits for the fetch (worst case ~20 s, once), and requests for unknown slugs now run a function before returning 404 instead of being rejected statically — negligible at this traffic and free on Hobby.

Rejected: rendering the fallback only at build time (reintroduces a cached broken page whenever a Vercel build hits a cold API) and detecting the build phase with `NEXT_PHASE` (couples page code to build internals); starting the API during the CI build (couples CI to the backend).

### D4 — `maxDuration = 30`

Vercel Hobby functions default to 10 s without Fluid compute. Exporting `maxDuration = 30` from the segment guarantees that the worst case (2 × 10 s plus render) completes, independent of the project's Fluid setting, within the Hobby maximum. It does not change billing.

## Risks / Trade-offs

- **First request after a deploy is slower** when the API is cold (once per deploy). Accepted.
- **API down on that first request** shows `error.tsx` (not cached; the next request retries). Accepted: after the first successful render, outages are covered by stale-if-error.
- **Silent staleness during a long outage**: visitors see the last good data without notice. Accepted for a static dataset; external providers are a future ROADMAP item.
- **ISR cache eviction during an outage**: if Vercel evicts the cached page and the API is down, there is no stale page to serve. Very unlikely for a visited page.
