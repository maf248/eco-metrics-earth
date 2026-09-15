# Spec: Water Footprint Page — Server-Side Data Fetching

> Delta for the new `water-footprint-page` capability. Covers Phase 4's static-generation requirement and the data-fetching integration of Phase 3.

## ADDED

### Requirement: The water-footprint page fetches the full product dataset server-side from the BFF

The `/water-footprint/` page (rendered through the `[category]` route segment) SHALL fetch `GET {API_BASE_URL}/water-footprint/products` — with **no** category query parameter — inside a Server Component, via a dedicated helper in `apps/web/src/lib/water-footprint.ts`. The helper SHALL return `{ products: WaterFootprintProduct[]; fetchFailed: boolean }` and SHALL never throw. The fetched array SHALL be passed as props to the page content; filtering and sorting happen client-side and MUST NOT trigger additional requests.

#### Scenario: Healthy BFF

- **Given** the BFF serves the 52-product dataset
- **When** the page is built or ISR-revalidated
- **Then** the helper resolves with `fetchFailed: false` and `products` containing 52 entries
- **Then** the rendered HTML contains the product data (no client JavaScript required to see it)

#### Scenario: Full dataset fetched once

- **When** the page is rendered and a user changes filters or sorting
- **Then** no additional HTTP requests to the BFF are made — all interaction is client-side derivation over the prop array

### Requirement: ISR static generation with revalidate 86400

The `[category]` route segment SHALL export `revalidate = 86400` alongside the existing `generateStaticParams` (all 12 slugs) and `dynamicParams = false`. The fetch SHALL be cached with `next: { revalidate: 86400 }`, aligned with the segment-level value, so the page and its data revalidate together once per day.

#### Scenario: revalidate export

- **When** the `[category]/page.tsx` module is imported
- **Then** it exports `revalidate` with value `86400`

#### Scenario: Static generation still covers all 12 categories

- **When** `npx nx build web` runs
- **Then** all 12 category pages are pre-rendered at build time (water-footprint with its fetched data or fallback state; the other 11 as unchanged placeholders)
- **Then** unknown category slugs still return 404 (`dynamicParams: false`)

### Requirement: API_BASE_URL environment variable

A typed helper `apiBaseUrl(): string` in `apps/web/src/lib/apiBaseUrl.ts` SHALL read `process.env.API_BASE_URL` and, when absent or empty, fall back to `http://localhost:3001/api/v1`. Any trailing slash SHALL be stripped. The variable is server-side only (NOT `NEXT_PUBLIC_`-prefixed — it must not be inlined into the client bundle). It SHALL be documented in `apps/web/.env.example` (with comment and default) and in the Environment Variables table of `apps/web/README.md`.

#### Scenario: API_BASE_URL set

- **When** `API_BASE_URL` is set to `https://eco-metrics-earth-api.railway.app/api/v1`
- **Then** `apiBaseUrl()` returns `https://eco-metrics-earth-api.railway.app/api/v1`

#### Scenario: API_BASE_URL set with trailing slash

- **When** `API_BASE_URL` is set to `http://localhost:3001/api/v1/`
- **Then** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: API_BASE_URL absent or empty (local development)

- **When** `API_BASE_URL` is not set or is an empty string
- **Then** `apiBaseUrl()` returns `http://localhost:3001/api/v1`

#### Scenario: Documented in example and README

- **When** a developer reads `apps/web/.env.example` and the Environment Variables section of `apps/web/README.md`
- **Then** `API_BASE_URL` is listed with a comment describing its purpose, its default, and the instruction to point it at the deployed API URL in production

### Requirement: Fetch failures degrade gracefully without breaking the page or SEO

Any fetch failure — network error, 5-second timeout (`AbortSignal.timeout(5000)`), non-2xx status, `success: false` payload, malformed JSON, or a payload that fails the runtime shape guard — SHALL resolve to `{ products: [], fetchFailed: true }`. The page SHALL then render a `role="alert"` notice ("Water footprint data is temporarily unavailable. Please try again later.") while keeping the `<h1>`, category icon, and metadata, and returning HTTP 200. The fetch helper MUST NOT throw to the page (an uncaught error would route to `error.tsx` and damage indexability).

#### Scenario: BFF is down

- **Given** no process is listening on the API port
- **When** the page is rendered
- **Then** the page returns 200 with the `<h1>` "Water Footprint", the metadata, and the `role="alert"` unavailability notice
- **Then** no product table or card list is rendered

#### Scenario: BFF returns an error payload

- **Given** the BFF responds with `{ success: false, error: '...', status: 500 }`
- **When** the page is rendered
- **Then** the result is `fetchFailed: true` and the unavailability notice is shown

#### Scenario: Build succeeds with the BFF down

- **Given** no API server is running (the CI build situation)
- **When** `npx nx build web` runs
- **Then** the build completes successfully with the fallback state baked into the static page

### Requirement: Empty dataset state

When the BFF is healthy but returns an empty array (`products.length === 0` with `fetchFailed: false`), the page SHALL render the message "No water footprint data is currently available." — distinct from the fetch-failure notice.

#### Scenario: Healthy BFF, empty dataset

- **Given** the BFF responds `{ success: true, data: [], status: 200 }`
- **When** the page is rendered
- **Then** the empty-dataset message is shown and no table or card list is rendered

### Requirement: SEO preservation on the water-footprint page

The existing `generateMetadata` behavior SHALL remain unchanged for water-footprint: title "Water Footprint", description "Track and visualize water footprint metrics for a sustainable planet.", canonical URL `{siteUrl}/water-footprint/` (trailing slash), and matching Open Graph/Twitter tags. The product data SHALL be present in the server-rendered HTML so the page content is indexable without client JavaScript.

#### Scenario: Metadata unchanged

- **When** `/water-footprint/` is requested
- **Then** `<title>` is "Water Footprint — eco-metrics earth" and `<link rel="canonical">` points to `/water-footprint/` with a trailing slash

#### Scenario: Server-rendered content is indexable

- **When** the raw HTML of `/water-footprint/` is fetched (no JavaScript execution)
- **Then** the HTML contains product names from the dataset (e.g. "Beef (beef herd)")

## File Changes

### ADDED: `apps/web/src/lib/apiBaseUrl.ts`

`apiBaseUrl(): string` — typed `API_BASE_URL` helper (pattern mirrors `siteUrl.ts`).

### ADDED: `apps/web/src/lib/water-footprint.ts`

`WaterFootprintDataResult` interface + `getWaterFootprintProducts(): Promise<WaterFootprintDataResult>` — server-side fetch with `next: { revalidate: 86400 }`, `AbortSignal.timeout(5000)`, and a runtime shape guard narrowing the payload as `unknown`.

### ADDED: `apps/web/src/components/water-footprint/WaterFootprintContent.tsx`

Server component — intro, `role="alert"` error notice, empty state, client table, equivalents footnote. Props: `products: WaterFootprintProduct[]`, `fetchFailed: boolean`.

### MODIFIED: `apps/web/src/app/[category]/page.tsx`

Conditional water-footprint branch (awaits the fetch helper, renders `WaterFootprintContent`) + `export const revalidate = 86400`. The other 11 categories render the unchanged placeholder.

### MODIFIED: `apps/web/.env.example`, `apps/web/README.md`

`API_BASE_URL` documentation (example entry with comment; Environment Variables table row).

### ADDED: `apps/web/__tests__/lib/apiBaseUrl.test.ts`, `apps/web/__tests__/lib/water-footprint.test.ts`

Unit tests for both helpers (mocked `global.fetch` — no network).

### MODIFIED: `apps/web/__tests__/app/[category]/page.test.tsx`

Water-footprint branch tests (lib mocked), `revalidate` export test; existing placeholder-category tests unchanged.
