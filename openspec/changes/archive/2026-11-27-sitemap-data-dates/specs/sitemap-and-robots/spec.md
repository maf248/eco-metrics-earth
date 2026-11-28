## MODIFIED Requirements

### Requirement: Sitemap entries include lastModified date

Each live category entry returned by `sitemap.ts` SHALL set `lastModified` to the date of the data its page shows, from `getCategoryLastModified` (see `category-page-registry`). The home and data sources entries SHALL set it to the latest date among the category entries. An entry whose date is unknown SHALL omit `lastModified`; no entry SHALL use the request or build time. `sitemap.ts` SHALL await `connection()` before reading any data, so it renders at request time and `next build` never reads the BFF, and SHALL read all categories concurrently.

#### Scenario: Sitemap entries have lastModified

- **GIVEN** live categories whose data dates are known
- **WHEN** the sitemap is generated
- **THEN** each of those category entries has a `lastModified` `Date` equal to its data date
- **AND** the home and data sources entries have the latest of those dates

#### Scenario: Unknown dates are omitted

- **GIVEN** a live category whose read fails or whose data has no date
- **WHEN** the sitemap is generated
- **THEN** its entry is still listed and has no `lastModified`
- **AND** the sitemap does not fail

#### Scenario: No date is known at all

- **GIVEN** every category read fails
- **WHEN** the sitemap is generated
- **THEN** every entry is listed and none has `lastModified`
