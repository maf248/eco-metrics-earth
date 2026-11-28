## MODIFIED Requirements

### Requirement: Sitemap route

`apps/web/src/app/sitemap.ts` SHALL export an async default function resolving to a `MetadataRoute.Sitemap` array that includes:

- One entry for the home page (`siteUrl() + "/"`), with `changeFrequency: 'weekly'` and `priority: 1.0`.
- One entry for each `ECO_CATEGORIES` slug with live data (`siteUrl() + "/" + slug + "/"`), each with `changeFrequency: 'weekly'` and `priority: 0.8`. Placeholder categories SHALL NOT be listed: their pages declare `noindex` (see `page-metadata`).
- One entry for the data sources page (`siteUrl() + "/data-sources/"`), with `changeFrequency: 'monthly'` and `priority: 0.5`.
- One entry for the privacy page (`siteUrl() + "/privacy/"`), with `changeFrequency: 'yearly'` and `priority: 0.3`, and no `lastModified` (the page has no data date).

All URLs SHALL end with a trailing slash.

#### Scenario: Sitemap includes home URL

- **WHEN** the sitemap function is called and awaited
- **THEN** the result contains an entry whose `url` is the site base URL with a trailing slash

#### Scenario: Sitemap includes all category URLs

- **WHEN** the sitemap function is called and awaited
- **THEN** the result contains exactly one category entry per category with live data (currently 6: `waste-recycling`, `global-temperature`, `ocean-health`, `co2-emissions`, `energy-sources`, `water-footprint`)

#### Scenario: Sitemap excludes placeholder categories

- **WHEN** the sitemap function is called and awaited
- **THEN** no entry points to a category without live data (e.g. `/air-quality/`)

#### Scenario: Category entries have correct priority and frequency

- **WHEN** the sitemap function is called and awaited
- **THEN** each category entry has `changeFrequency: 'weekly'` and `priority: 0.8`

#### Scenario: All sitemap URLs have trailing slash

- **WHEN** the sitemap function is called and awaited
- **THEN** every URL in the result ends with `/`

#### Scenario: Sitemap includes the data sources page

- **WHEN** the sitemap function is called and awaited
- **THEN** the result contains exactly one entry whose `url` is `siteUrl() + "/data-sources/"`
- **AND** that entry has `changeFrequency: 'monthly'` and `priority: 0.5`

#### Scenario: Sitemap includes the privacy page

- **WHEN** the sitemap function is called and awaited
- **THEN** the result contains exactly one entry whose `url` is `siteUrl() + "/privacy/"`
- **AND** that entry has `changeFrequency: 'yearly'` and `priority: 0.3`
- **AND** that entry has no `lastModified`, even when every category date is known
