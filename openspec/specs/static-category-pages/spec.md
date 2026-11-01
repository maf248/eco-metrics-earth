# static-category-pages Specification

## Purpose

The 12 eco-category pages under the dynamic `[category]` route segment are served from the ISR cache with daily background revalidation (`revalidate = 86400`): the 11 placeholder categories are pre-rendered at build time from the `ECO_CATEGORIES` slugs and render their unchanged "coming soon" placeholder, the water-footprint page is generated on its first request so the build never depends on the BFF, and unknown slugs get a real 404 from the segment layout.

## Requirements

### Requirement: Category pages are served from the ISR cache

The `[category]` route SHALL declare a static params function that returns every slug from `ECO_CATEGORIES` **except** the categories that have an entry in the category page registry (`category-page-registry`; today `water-footprint`, `co2-emissions`, `global-temperature` and `energy-sources`), and `maxDuration = 30`. Next.js SHALL pre-render the remaining category pages at build time and generate the registered categories' pages on demand after their first request; every page is then served from cache and refreshed in the background at most once per day. The route SHALL declare `ensureStatic = 'navigation'`, so a cold first visit to a registered category waits for the complete page and no visit receives a partial one. Unknown slugs SHALL return a real HTTP 404 status before any response body is streamed and before any data fetch, so that a slug outside `ECO_CATEGORIES` is never a soft 404 (status 200 with `noindex`). `maxDuration = 30` SHALL cover the worst-case data fetch (2 attempts × 10 s) within the Vercel Hobby function limit.

The categories without a registry entry SHALL render the unchanged placeholder (icon + title + "coming soon").

#### Scenario: generateStaticParams returns every category except water-footprint

- **WHEN** `generateStaticParams()` is called
- **THEN** it returns an array of objects with shape `{ category: string }` covering every value of `ECO_CATEGORIES` except `water-footprint`, `co2-emissions`, `global-temperature` and `energy-sources`
- **THEN** the array length equals the number of `ECO_CATEGORIES` minus the number of registry entries (currently 8)

#### Scenario: Static params are never empty

- **GIVEN** a registry that covers every `ECO_CATEGORIES` slug
- **WHEN** the unit test for static params runs
- **THEN** it fails, because the route needs at least one param that can be pre-rendered without the BFF

#### Scenario: Unknown category slugs return 404

- **WHEN** a request arrives for a slug not present in `ECO_CATEGORIES` (e.g., `/unknown-category/`)
- **THEN** the response status is 404 Not Found (not a 200 with `noindex`), for browsers and crawlers alike
- **THEN** no BFF request is made

#### Scenario: Build pre-renders the placeholder categories without the BFF

- **WHEN** `npx nx build web` is run, with or without an API server listening
- **THEN** the build output includes static HTML for the 8 placeholder category slugs
- **THEN** the build completes successfully and makes no request to the BFF
- **THEN** `/water-footprint/`, `/co2-emissions/`, `/global-temperature/` and `/energy-sources/` are not among the fully pre-rendered pages

#### Scenario: Segment configuration

- **WHEN** the `[category]/page.tsx` module is imported
- **THEN** it exports `maxDuration = 30` and `ensureStatic = 'navigation'` and `instant = false` and exports neither `revalidate` nor `dynamicParams`

#### Scenario: Daily freshness

- **GIVEN** a cached registered category page older than 24 hours and a healthy BFF
- **WHEN** the page is requested
- **THEN** the page is refreshed in the background and later requests receive the new content

#### Scenario: The other 11 category pages are unchanged

- **WHEN** any category page without a registry entry (the 8 remaining placeholders, formerly 9 before `energy-sources` was registered) is rendered (e.g., `/ocean-health/`)
- **THEN** it shows the placeholder (icon, `<h1>` title, "{title} metrics — coming soon.")
