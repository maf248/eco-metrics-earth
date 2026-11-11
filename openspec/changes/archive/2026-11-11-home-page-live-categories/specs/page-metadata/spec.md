# Spec Delta

## ADDED Requirements

### Requirement: Placeholder category pages are not indexed

The metadata of a category page without live data SHALL declare `robots` as `noindex, follow`, so search engines skip the "coming soon" page but still follow its links. The metadata of a category page with live data SHALL NOT declare `noindex`. The rest of the placeholder's metadata (title, description, canonical, Open Graph, Twitter) SHALL stay as defined by "Category page metadata". When a category ships real data, its page becomes indexable with no further change.

#### Scenario: Placeholder category is noindex, follow

- **WHEN** `/ocean-health/` is requested
- **THEN** the HTML contains `<meta name="robots" content="noindex, follow">`
- **AND** its canonical URL and description are still present

#### Scenario: Live category is indexable

- **WHEN** `/co2-emissions/` is requested
- **THEN** the HTML contains no `robots` meta tag with `noindex`

#### Scenario: Home and data sources stay indexable

- **WHEN** `/` or `/data-sources/` is requested
- **THEN** the HTML contains no `robots` meta tag with `noindex`
