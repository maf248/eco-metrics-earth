## MODIFIED Requirements

### Requirement: Category pages are served from the ISR cache

The `[category]/page.tsx` route segment SHALL export `revalidate = 86400` (ISR), `dynamicParams = true`, `maxDuration = 30`, and a `generateStaticParams` function that returns every slug from `ECO_CATEGORIES` **except** the categories that have an entry in the category page registry (`category-page-registry`; today `water-footprint`, `co2-emissions` and `global-temperature`). Next.js SHALL pre-render the remaining category pages at build time and generate the registered categories' pages on their first request; every page is then served from the ISR cache and revalidated in the background at most once per day. The `revalidate` value applies to the whole segment: the placeholder pages re-render byte-identically on revalidation (accepted trade-off — isolating ISR to a single category would require splitting the route, rejected in the archived `2026-09-14-water-footprint-phase3-4-ui` design, D1). Unknown slugs SHALL return a real HTTP 404 status: a `[category]/layout.tsx` SHALL call `notFound()` for any slug not in `ECO_CATEGORIES`, before any data fetch. The check SHALL live in the layout because the segment's `loading.tsx` wraps the page in a Suspense boundary, so with on-demand rendering a `notFound()` raised only inside the page fires after the response has started streaming with status 200 (a soft 404 with `noindex`). `maxDuration = 30` SHALL cover the worst-case data fetch (2 attempts × 10 s) within the Vercel Hobby function limit.

The categories without a registry entry SHALL render the unchanged placeholder (icon + title + "coming soon").

#### Scenario: generateStaticParams returns every category except water-footprint

- **WHEN** `generateStaticParams()` is called
- **THEN** it returns an array of objects with shape `{ category: string }` covering every value of `ECO_CATEGORIES` except `water-footprint`, `co2-emissions` and, as of this change, `global-temperature`
- **THEN** the array length equals the number of `ECO_CATEGORIES` minus the number of registry entries (currently 9)

#### Scenario: Unknown category slugs return 404

- **WHEN** a request arrives for a slug not present in `ECO_CATEGORIES` (e.g., `/unknown-category/`)
- **THEN** the response status is 404 Not Found (not a 200 with `noindex`), for browsers and crawlers alike
- **THEN** no BFF request is made

#### Scenario: Build pre-renders the placeholder categories without the BFF

- **WHEN** `npx nx build web` is run, with or without an API server listening
- **THEN** the build output includes static HTML for the 9 placeholder category slugs
- **THEN** the build completes successfully and makes no request to the BFF
- **THEN** `/water-footprint/`, `/co2-emissions/` and `/global-temperature/` are not among the pre-rendered pages

#### Scenario: Segment configuration

- **WHEN** the `[category]/page.tsx` module is imported
- **THEN** it exports `revalidate = 86400`, `dynamicParams = true`, and `maxDuration = 30`

#### Scenario: The other 11 category pages are unchanged

- **WHEN** any category page without a registry entry (the 9 remaining placeholders, formerly 11 before `co2-emissions` and `global-temperature` were registered) is rendered (e.g., `/ocean-health/`)
- **THEN** it shows the placeholder (icon, `<h1>` title, "{title} metrics — coming soon.")
- **THEN** their existing unit tests and snapshots pass without modification
