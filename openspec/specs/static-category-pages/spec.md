# static-category-pages Specification

## Purpose

All 12 eco-category pages under the dynamic `[category]` route segment are statically pre-rendered at build time from the `ECO_CATEGORIES` slugs: unknown slugs return 404 (`dynamicParams: false`), pages are served from the ISR cache with daily background revalidation (`revalidate = 86400`), the water-footprint page pre-renders with its server-fetched BFF data (or the graceful fallback), and the remaining 11 categories render their unchanged "coming soon" placeholder.

## Requirements

### Requirement: All category pages are statically pre-rendered at build time

The `[category]/page.tsx` route segment SHALL export a `generateStaticParams` function that returns all valid category slugs from `ECO_CATEGORIES`, `dynamicParams = false`, and `revalidate = 86400` (ISR). Next.js SHALL pre-render all 12 category pages at build time and serve them from the ISR cache, revalidating in the background at most once per day. The `revalidate` value applies to the whole segment: the 11 placeholder pages re-render byte-identically on revalidation (accepted trade-off — isolating ISR to a single category would require splitting the route, rejected in the archived `2026-09-14-water-footprint-phase3-4-ui` design, D1).

The water-footprint page SHALL pre-render with its server-fetched product data (or the graceful fallback state when the BFF is unreachable at build time — see the `water-footprint-page` spec). The other 11 category pages SHALL render the unchanged placeholder (icon + title + "coming soon").

#### Scenario: generateStaticParams returns all known category slugs

- **WHEN** `generateStaticParams()` is called
- **THEN** it returns an array of objects with shape `{ category: string }` where each `category` value is a key of `ECO_CATEGORIES`
- **THEN** the array length equals `Object.keys(ECO_CATEGORIES).length` (currently 12)

#### Scenario: Unknown category slugs return 404

- **WHEN** a request arrives for a slug not present in `ECO_CATEGORIES` (e.g., `/unknown-category/`)
- **THEN** the page returns a 404 Not Found response
- **THEN** `dynamicParams: false` is exported from the route segment to enforce this at the framework level

#### Scenario: Build succeeds with all category pages pre-rendered

- **WHEN** `npx nx build web` is run
- **THEN** the build output includes static HTML files for all 12 category slugs
- **THEN** no blocking SSR is performed for these routes at request time — pages are served from the ISR cache

#### Scenario: Water-footprint pre-renders with data

- **WHEN** `npx nx build web` runs with the BFF reachable
- **THEN** the pre-rendered `/water-footprint/` HTML contains product data from the dataset

#### Scenario: Water-footprint build stays green with the BFF unreachable

- **WHEN** `npx nx build web` runs with no API server listening (the CI situation)
- **THEN** the build completes successfully with the fallback state baked into the static page

#### Scenario: The other 11 category pages are unchanged

- **WHEN** any non-water-footprint category page is rendered (e.g., `/ocean-health/`)
- **THEN** it shows the placeholder (icon, `<h1>` title, "{title} metrics — coming soon.")
- **THEN** their existing unit tests and snapshots pass without modification
