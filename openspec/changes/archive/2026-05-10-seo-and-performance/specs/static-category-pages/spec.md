## ADDED Requirements

### Requirement: All category pages are statically pre-rendered at build time
The `[category]/page.tsx` route segment SHALL export a `generateStaticParams` function that returns all valid category slugs from `ECO_CATEGORIES`. Next.js SHALL pre-render all 11 category pages at build time.

#### Scenario: generateStaticParams returns all known category slugs
- **WHEN** `generateStaticParams()` is called
- **THEN** it returns an array of objects with shape `{ category: string }` where each `category` value is a key of `ECO_CATEGORIES`
- **THEN** the array length equals `Object.keys(ECO_CATEGORIES).length` (currently 11)

#### Scenario: Unknown category slugs return 404
- **WHEN** a request arrives for a slug not present in `ECO_CATEGORIES` (e.g., `/unknown-category/`)
- **THEN** the page returns a 404 Not Found response
- **THEN** `dynamicParams: false` is exported from the route segment to enforce this at the framework level

#### Scenario: Build succeeds with all category pages pre-rendered
- **WHEN** `npx nx build web` is run
- **THEN** the build output includes static HTML files for all 11 category slugs
- **THEN** no SSR is performed for these routes at runtime
