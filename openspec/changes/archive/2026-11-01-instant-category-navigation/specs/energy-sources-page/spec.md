# Spec Delta

## MODIFIED Requirements

### Requirement: The page fetches the full dataset once, server-side, with ISR

`/energy-sources/` (rendered through the `[category]` segment and the category page registry) SHALL fetch `GET {API_BASE_URL}/energy-sources` once, inside a Server Component, with `getEnergySources()`, and SHALL pass the validated payload and `meta` as props. Choosing a country or switching the measure toggle MUST NOT trigger any request. The page SHALL NOT be pre-rendered at build time: it is generated on demand after a deploy and then served from cache and refreshed in the background at most once per day, so `next build` never calls the BFF. A failed fetch (including a BFF `502`) SHALL NOT be rendered or cached: during revalidation the last good page is kept; on a first render the app's `error.tsx` is shown and nothing is cached.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the energy sources payload
- **WHEN** `/energy-sources/` is generated
- **THEN** the HTML contains the heading "Energy Sources", the World key figures and the explorer with World selected

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running
- **WHEN** `npx nx build web` runs
- **THEN** the build completes and `/energy-sources/` is not fully pre-rendered

#### Scenario: No requests on interaction

- **WHEN** a user selects another country or switches between "Share (%)" and "Generation (TWh)"
- **THEN** no additional network request to the BFF is made

#### Scenario: BFF down during revalidation

- **GIVEN** a cached `/energy-sources/` page and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** visitors keep receiving the previously cached page

#### Scenario: BFF down on first request

- **GIVEN** no cached page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** `error.tsx` is shown and nothing is cached
