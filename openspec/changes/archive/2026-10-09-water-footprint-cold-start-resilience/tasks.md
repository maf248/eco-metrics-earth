# Tasks

## 1. Fetch helper

- [x] 1.1 `apps/web/src/lib/waterFootprint.ts`: return `Promise<WaterFootprintProduct[]>`; make up to 2 attempts, each with `AbortSignal.timeout(10000)`, the internal API headers and `next: { revalidate: 86400 }`; treat network error, timeout, non-2xx, malformed JSON and a failed shape guard as a failed attempt; if both fail, log one `console.error` (no headers) and throw an `Error` with `cause`.

## 2. Page and content

- [x] 2.1 `apps/web/src/app/[category]/page.tsx`: `generateStaticParams` excludes `water-footprint`; `dynamicParams = true`; export `maxDuration = 30`; keep `revalidate = 86400`; pass the products array (no `fetchFailed`).
- [x] 2.2 `apps/web/src/app/[category]/layout.tsx`: call `notFound()` for slugs not in `ECO_CATEGORIES` (real 404 above the `loading.tsx` boundary), with a unit test.
- [x] 2.3 `apps/web/src/components/water-footprint/WaterFootprintContent.tsx`: remove the `fetchFailed` prop and the unavailability notice; keep the empty-dataset message.

## 3. Tests

- [x] 3.1 `apps/web/__tests__/lib/waterFootprint.test.ts`: success on first attempt (1 call); first attempt fails then succeeds (2 calls, no `console.error`); both attempts fail for each failure kind (2 calls, one `console.error`, throws with `cause`); per-attempt 10 s signal and headers.
- [x] 3.2 `apps/web/__tests__/app/[category]/page.test.tsx`: `generateStaticParams` returns 11 slugs without `water-footprint`; exports `dynamicParams = true` and `maxDuration = 30`; water-footprint renders products from the mocked helper; the page propagates a helper rejection.
- [x] 3.3 `apps/web/__tests__/components/water-footprint/WaterFootprintContent.test.tsx`: drop the notice tests; keep the data and empty-dataset tests.

## 4. Docs

- [x] 4.1 `docs/deploy/cloud-run.md`: fix the "Cold-start first request" troubleshooting entry (measured duration, retry + stale-if-error, first request after a deploy).
- [x] 4.2 `ROADMAP.md`: add an item for BFF-level resilience to external providers (BFF signals provider failure, web decides what to show; persistent cache needed because of scale-to-zero).

## 5. Validation

- [x] 5.1 `npx openspec validate water-footprint-cold-start-resilience --strict`.
- [x] 5.2 Format, lint, typecheck, unit tests, `npx nx build web` without an API server (water-footprint not pre-rendered, build green), and E2E. Also verified with `next start`: unknown slug → 404 (also as Googlebot); API down on first request → 500, not cached; MISS → HIT; with a temporary `revalidate = 10` build and the API killed → stale page with data always served; regeneration after the API recovers.
- [x] 5.3 Reviewer audit (CHANGES REQUESTED → fixed: stale `apps/web/README.md` routing docs, canonical Purpose lines, key-leak assertion via `util.inspect`, duplicated slug check extracted to `isEcoCategory`, post-deploy verification wording).
