# water-footprint-page — Delta

## MODIFIED Requirements

### Requirement: The water-footprint page fetches the full product dataset server-side from the BFF

The `/water-footprint/` page (rendered through the `[category]` route segment) SHALL fetch `GET {API_BASE_URL}/water-footprint/products` — with **no** category query parameter — inside a Server Component, via a dedicated helper in `apps/web/src/lib/water-footprint.ts`. The helper SHALL return `{ products: WaterFootprintProduct[]; fetchFailed: boolean }` and SHALL never throw. The fetched array SHALL be passed as props to the page content; filtering and sorting happen client-side and MUST NOT trigger additional requests.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the 60-product dataset
- **WHEN** the page is built or ISR-revalidated
- **THEN** the helper resolves with `fetchFailed: false` and `products` containing 60 entries
- **THEN** the rendered HTML contains the product data (no client JavaScript required to see it)

#### Scenario: Full dataset fetched once

- **WHEN** the page is rendered and a user changes filters or sorting
- **THEN** no additional HTTP requests to the BFF are made — all interaction is client-side derivation over the prop array
