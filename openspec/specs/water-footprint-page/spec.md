# water-footprint-page Specification

## Purpose

Defines the water-footprint category page (`/water-footprint/`, rendered through the `[category]` route segment) as the first data-driven category page: it fetches the full product dataset server-side from the BFF with a retry that absorbs Cloud Run cold starts, is generated on its first request after a deploy and then served from the ISR cache (`revalidate = 86400`), never renders or caches a failed fetch (a failed revalidation keeps the last good page), and keeps the category's SEO metadata and server-rendered content intact.

## Requirements

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

### Requirement: API_BASE_URL environment variable

A typed helper `apiBaseUrl(): string` in `apps/web/src/lib/apiBaseUrl.ts` SHALL read `process.env.API_BASE_URL` and, when absent or empty, fall back to `http://localhost:3001/api/v1`. Any trailing slash SHALL be stripped. The variable is server-side only (NOT `NEXT_PUBLIC_`-prefixed — it must not be inlined into the client bundle). It SHALL be documented in `apps/web/.env.example` (with comment and default) and in the Environment Variables table of `apps/web/README.md`.

#### Scenario: API_BASE_URL set

- **WHEN** `API_BASE_URL` is set to `https://eco-metrics-api-abcdefghij.us-central1.run.app/api/v1`
- **THEN** `apiBaseUrl()` returns `https://eco-metrics-api-abcdefghij.us-central1.run.app/api/v1`

#### Scenario: API_BASE_URL set with trailing slash

- **WHEN** `API_BASE_URL` is set to `http://localhost:3001/api/v1/`
- **THEN** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: API_BASE_URL absent or empty (local development)

- **WHEN** `API_BASE_URL` is not set or is an empty string
- **THEN** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: Documented in example and README

- **WHEN** a developer reads `apps/web/.env.example` and the Environment Variables section of `apps/web/README.md`
- **THEN** `API_BASE_URL` is listed with a comment describing its purpose, its default, and the instruction to point it at the deployed API URL in production

### Requirement: Empty dataset state

When the BFF is healthy but returns an empty array, the page SHALL render the message "No water footprint data is currently available." and no table or card list.

#### Scenario: Healthy BFF, empty dataset

- **GIVEN** the BFF responds `{ success: true, data: [], status: 200 }`
- **WHEN** the page is rendered
- **THEN** the empty-dataset message is shown and no table or card list is rendered

### Requirement: SEO preservation on the water-footprint page

The existing `generateMetadata` behavior SHALL remain unchanged for water-footprint: title "Water Footprint", description "Track and visualize water footprint metrics for a sustainable planet.", canonical URL `{siteUrl}/water-footprint/` (trailing slash), and matching Open Graph/Twitter tags. The product data SHALL be present in the server-rendered HTML so the page content is indexable without client JavaScript.

#### Scenario: Metadata unchanged

- **WHEN** `/water-footprint/` is requested
- **THEN** `<title>` is "Water Footprint — eco-metrics earth" and `<link rel="canonical">` points to `/water-footprint/` with a trailing slash

#### Scenario: Server-rendered content is indexable

- **WHEN** the raw HTML of `/water-footprint/` is fetched (no JavaScript execution)
- **THEN** the HTML contains product names from the dataset (e.g. "Beef (beef herd)")

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
