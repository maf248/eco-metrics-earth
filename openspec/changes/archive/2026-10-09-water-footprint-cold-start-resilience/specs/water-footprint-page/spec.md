## MODIFIED Requirements

### Requirement: The water-footprint page fetches the full product dataset server-side from the BFF

The `/water-footprint/` page (rendered through the `[category]` route segment) SHALL fetch `GET {API_BASE_URL}/water-footprint/products` — with **no** category query parameter — inside a Server Component, via a dedicated helper in `apps/web/src/lib/waterFootprint.ts`. The helper SHALL resolve with the `WaterFootprintProduct[]` array on success and SHALL throw when the data cannot be fetched (see "Fetch failures are retried and never rendered or cached"). The fetched array SHALL be passed as props to the page content; filtering and sorting happen client-side and MUST NOT trigger additional requests.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the 60-product dataset
- **WHEN** the page is generated or ISR-revalidated
- **THEN** the helper resolves with an array of 60 products
- **THEN** the rendered HTML contains the product data (no client JavaScript required to see it)

#### Scenario: Full dataset fetched once

- **WHEN** the page is rendered and a user changes filters or sorting
- **THEN** no additional HTTP requests to the BFF are made — all interaction is client-side derivation over the prop array

### Requirement: Empty dataset state

When the BFF is healthy but returns an empty array, the page SHALL render the message "No water footprint data is currently available." and no table or card list.

#### Scenario: Healthy BFF, empty dataset

- **GIVEN** the BFF responds `{ success: true, data: [], status: 200 }`
- **WHEN** the page is rendered
- **THEN** the empty-dataset message is shown and no table or card list is rendered

## REMOVED Requirements

### Requirement: ISR static generation with revalidate 86400

**Reason**: The page is no longer pre-rendered at build time; replaced by "ISR generation on first request with revalidate 86400".

**Migration**: None for users. `revalidate = 86400` and the fetch-level `next: { revalidate: 86400 }` are unchanged.

### Requirement: Fetch failures degrade gracefully without breaking the page or SEO

**Reason**: Rendering a fallback notice with HTTP 200 let the ISR cache keep a broken page for 24 h after a single Cloud Run cold start. Replaced by "Fetch failures are retried and never rendered or cached".

**Migration**: The `fetchFailed` flag and the "temporarily unavailable" notice are removed. A failed revalidation keeps the last good page; a failed first render shows the app's `error.tsx`.

## ADDED Requirements

### Requirement: ISR generation on first request with revalidate 86400

The `[category]` route segment SHALL export `revalidate = 86400`, and the fetch SHALL be cached with `next: { revalidate: 86400 }`, aligned with the segment-level value, so the page and its data revalidate together at most once per day. `/water-footprint/` SHALL NOT be pre-rendered at build time: it SHALL be generated on the first request after a deploy and then served from the ISR cache (see `static-category-pages`), so `next build` never calls the BFF.

#### Scenario: revalidate export

- **WHEN** the `[category]/page.tsx` module is imported
- **THEN** it exports `revalidate` with value `86400`

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running (the CI build situation)
- **WHEN** `npx nx build web` runs
- **THEN** the build completes successfully and `/water-footprint/` is not among the pre-rendered pages

#### Scenario: Generated once, then cached

- **GIVEN** a fresh deployment with a healthy BFF
- **WHEN** `/water-footprint/` is requested for the first time
- **THEN** the page is rendered with the product data and stored in the ISR cache
- **AND** later requests within 24 h are served from the cache without calling the BFF

### Requirement: Fetch failures are retried and never rendered or cached

The helper SHALL make at most **2 attempts**, each with its own 10-second timeout (`AbortSignal.timeout(10000)`) and no delay between them, so that a first attempt that wakes a cold Cloud Run instance is followed by an attempt that finds it ready. An attempt fails on a network error, a timeout, a non-2xx status, malformed JSON, a `success: false` payload, or a payload that fails the runtime shape guard. If the first attempt fails, the helper SHALL retry silently. If both fail, the helper SHALL log exactly one `console.error` describing the failure (never the request headers or the internal API key) and SHALL throw an `Error` whose `cause` is the last failure. The page SHALL NOT catch it, so a failed fetch is never rendered as page content and never stored in the ISR cache: during an ISR revalidation Next.js keeps serving the last successfully generated page and retries on a later request; on a first render with no cached page, the app's `error.tsx` is shown and nothing is cached.

#### Scenario: Cold start recovered by the retry

- **GIVEN** the first attempt times out after 10 s and the second attempt succeeds
- **WHEN** the helper runs
- **THEN** it resolves with the products and logs no error

#### Scenario: BFF down during an ISR revalidation

- **GIVEN** a cached `/water-footprint/` page with product data and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** the helper logs one error and throws
- **AND** visitors keep receiving the previously cached page with its product data
- **AND** a later request after the BFF recovers regenerates the page

#### Scenario: BFF down on the first request after a deploy

- **GIVEN** no cached `/water-footprint/` page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** the app's `error.tsx` is shown and no page is cached
- **AND** the next request attempts the fetch again

#### Scenario: BFF returns an error payload

- **GIVEN** the BFF responds `{ success: false, error: '...', status: 500 }` to both attempts
- **WHEN** the helper runs
- **THEN** it makes exactly 2 attempts, logs one error, and throws
