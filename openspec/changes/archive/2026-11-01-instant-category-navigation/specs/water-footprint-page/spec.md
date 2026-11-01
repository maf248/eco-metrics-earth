# Spec Delta

## MODIFIED Requirements

### Requirement: ISR generation on first request with revalidate 86400

The page and its data SHALL be refreshed together in the background at most once per day. `/water-footprint/` SHALL NOT be pre-rendered at build time: it SHALL be generated on demand after a deploy and then served from cache (see `static-category-pages`), so `next build` never calls the BFF.

#### Scenario: revalidate export

- **WHEN** the `[category]/page.tsx` module is imported
- **THEN** it does not export `revalidate`, and the daily lifetime is declared where the data is cached

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running (the CI build situation)
- **WHEN** `npx nx build web` runs
- **THEN** the build completes successfully and `/water-footprint/` is not among the fully pre-rendered pages

#### Scenario: Generated once, then cached

- **GIVEN** a fresh deployment with a healthy BFF
- **WHEN** `/water-footprint/` is requested for the first time
- **THEN** the complete page is generated with the product data and stored in the cache
- **AND** later requests within 24 h are served from the cache without calling the BFF
