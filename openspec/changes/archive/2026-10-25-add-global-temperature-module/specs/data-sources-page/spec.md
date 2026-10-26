## ADDED Requirements

### Requirement: Upstream origins are listed under their provider

For each live provider whose `origins` is non-empty, the `/data-sources/` page SHALL list below the provider's entry a sub-list "Data produced by" with, for each origin: the producer and title with the title as an external link to `url` (`target="_blank"`, `rel="noopener noreferrer"`), the license name as an external link to the license URL, the `notice` and `citation` when present, and its categories as links to the category pages. Everything SHALL come from the catalog; the web app SHALL NOT hardcode any origin, license or notice. A provider with no origins SHALL render no sub-list. The catalog payload guard SHALL require `origins` on every provider (an array of origins with string `producer`, `title` and `url`, a `license` with string `name` and `url`, optional string `notice`, `citation` and `disclaimer`, and `categories` that are known eco categories); a response failing it is a shape mismatch (see `bff-fetch-helper`) and heals through the retry past the Data Cache. The API deploys before the web.

#### Scenario: Origins are rendered

- **GIVEN** a provider with two origins serving different categories
- **WHEN** the page is rendered
- **THEN** both origins show producer, linked title, linked license, and links to their category pages

#### Scenario: Notice and citation

- **GIVEN** an origin with a `notice` and a `citation`
- **WHEN** the page is rendered
- **THEN** both texts are visible

#### Scenario: No origins

- **GIVEN** a provider with `origins: []`
- **WHEN** the page is rendered
- **THEN** no "Data produced by" sub-list exists for it

#### Scenario: Response without origins is rejected

- **GIVEN** a catalog response whose provider has no `origins` property, or an origin with a missing license URL or an unknown category
- **WHEN** the catalog is fetched
- **THEN** the guard rejects it, so a stale cached entry is retried past the Data Cache instead of being rendered

#### Scenario: Accessibility

- **WHEN** the axe audit runs on `/data-sources/` with origins
- **THEN** there are no critical or serious violations
