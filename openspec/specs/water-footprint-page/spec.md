# water-footprint-page Specification

## Purpose

Defines the water-footprint category page (`/water-footprint/`, rendered through the `[category]` route segment) as the first data-driven category page: it fetches the full product dataset server-side from the BFF, is statically generated with ISR (`revalidate = 86400`), degrades gracefully when the BFF is unreachable (HTTP 200 with an alert notice — never an error page, so indexability is preserved), and keeps the category's SEO metadata and server-rendered content intact.

## Requirements

### Requirement: The water-footprint page fetches the full product dataset server-side from the BFF

The `/water-footprint/` page (rendered through the `[category]` route segment) SHALL fetch `GET {API_BASE_URL}/water-footprint/products` — with **no** category query parameter — inside a Server Component, via a dedicated helper in `apps/web/src/lib/water-footprint.ts`. The helper SHALL return `{ products: WaterFootprintProduct[]; fetchFailed: boolean }` and SHALL never throw. The fetched array SHALL be passed as props to the page content; filtering and sorting happen client-side and MUST NOT trigger additional requests.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the 52-product dataset
- **WHEN** the page is built or ISR-revalidated
- **THEN** the helper resolves with `fetchFailed: false` and `products` containing 52 entries
- **THEN** the rendered HTML contains the product data (no client JavaScript required to see it)

#### Scenario: Full dataset fetched once

- **WHEN** the page is rendered and a user changes filters or sorting
- **THEN** no additional HTTP requests to the BFF are made — all interaction is client-side derivation over the prop array

### Requirement: ISR static generation with revalidate 86400

The `[category]` route segment SHALL export `revalidate = 86400` alongside the existing `generateStaticParams` (all 12 slugs) and `dynamicParams = false`. The fetch SHALL be cached with `next: { revalidate: 86400 }`, aligned with the segment-level value, so the page and its data revalidate together once per day.

#### Scenario: revalidate export

- **WHEN** the `[category]/page.tsx` module is imported
- **THEN** it exports `revalidate` with value `86400`

#### Scenario: Static generation still covers all 12 categories

- **WHEN** `npx nx build web` runs
- **THEN** all 12 category pages are pre-rendered at build time (water-footprint with its fetched data or fallback state; the other 11 as unchanged placeholders)
- **THEN** unknown category slugs still return 404 (`dynamicParams: false`)

### Requirement: API_BASE_URL environment variable

A typed helper `apiBaseUrl(): string` in `apps/web/src/lib/apiBaseUrl.ts` SHALL read `process.env.API_BASE_URL` and, when absent or empty, fall back to `http://localhost:3001/api/v1`. Any trailing slash SHALL be stripped. The variable is server-side only (NOT `NEXT_PUBLIC_`-prefixed — it must not be inlined into the client bundle). It SHALL be documented in `apps/web/.env.example` (with comment and default) and in the Environment Variables table of `apps/web/README.md`.

#### Scenario: API_BASE_URL set

- **WHEN** `API_BASE_URL` is set to `https://eco-metrics-earth-api.railway.app/api/v1`
- **THEN** `apiBaseUrl()` returns `https://eco-metrics-earth-api.railway.app/api/v1`

#### Scenario: API_BASE_URL set with trailing slash

- **WHEN** `API_BASE_URL` is set to `http://localhost:3001/api/v1/`
- **THEN** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: API_BASE_URL absent or empty (local development)

- **WHEN** `API_BASE_URL` is not set or is an empty string
- **THEN** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: Documented in example and README

- **WHEN** a developer reads `apps/web/.env.example` and the Environment Variables section of `apps/web/README.md`
- **THEN** `API_BASE_URL` is listed with a comment describing its purpose, its default, and the instruction to point it at the deployed API URL in production

### Requirement: Fetch failures degrade gracefully without breaking the page or SEO

Any fetch failure — network error, 5-second timeout (`AbortSignal.timeout(5000)`), non-2xx status, `success: false` payload, malformed JSON, or a payload that fails the runtime shape guard — SHALL resolve to `{ products: [], fetchFailed: true }`. The page SHALL then render a `role="alert"` notice ("Water footprint data is temporarily unavailable. Please try again later.") while keeping the `<h1>`, category icon, and metadata, and returning HTTP 200. The fetch helper MUST NOT throw to the page (an uncaught error would route to `error.tsx` and damage indexability).

#### Scenario: BFF is down

- **GIVEN** no process is listening on the API port
- **WHEN** the page is rendered
- **THEN** the page returns 200 with the `<h1>` "Water Footprint", the metadata, and the `role="alert"` unavailability notice
- **THEN** no product table or card list is rendered

#### Scenario: BFF returns an error payload

- **GIVEN** the BFF responds with `{ success: false, error: '...', status: 500 }`
- **WHEN** the page is rendered
- **THEN** the result is `fetchFailed: true` and the unavailability notice is shown

#### Scenario: Build succeeds with the BFF down

- **GIVEN** no API server is running (the CI build situation)
- **WHEN** `npx nx build web` runs
- **THEN** the build completes successfully with the fallback state baked into the static page

### Requirement: Empty dataset state

When the BFF is healthy but returns an empty array (`products.length === 0` with `fetchFailed: false`), the page SHALL render the message "No water footprint data is currently available." — distinct from the fetch-failure notice.

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
