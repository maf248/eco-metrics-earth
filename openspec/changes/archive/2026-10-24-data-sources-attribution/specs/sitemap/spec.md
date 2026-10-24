## MODIFIED Requirements

### Requirement: Sitemap route

`apps/web/src/app/sitemap.ts` SHALL export a default function returning a `MetadataRoute.Sitemap` array that includes:

- One entry for the home page (`siteUrl() + "/"`), with `changeFrequency: 'weekly'` and `priority: 1.0`.
- One entry for each of the 12 `ECO_CATEGORIES` slugs (`siteUrl() + "/" + slug + "/"`), each with `changeFrequency: 'weekly'` and `priority: 0.8`.
- One entry for the data sources page (`siteUrl() + "/data-sources/"`), with `changeFrequency: 'monthly'` and `priority: 0.5`.

All URLs SHALL end with a trailing slash.

#### Scenario: Sitemap includes home URL

- **WHEN** the sitemap function is called
- **THEN** the result contains an entry whose `url` is the site base URL with a trailing slash

#### Scenario: Sitemap includes all category URLs

- **WHEN** the sitemap function is called
- **THEN** the result contains exactly 12 category entries, one per slug in `ECO_CATEGORIES`

#### Scenario: Category entries have correct priority and frequency

- **WHEN** the sitemap function is called
- **THEN** each category entry has `changeFrequency: 'weekly'` and `priority: 0.8`

#### Scenario: All sitemap URLs have trailing slash

- **WHEN** the sitemap function is called
- **THEN** every URL in the result ends with `/`

#### Scenario: Sitemap includes the data sources page

- **WHEN** the sitemap function is called
- **THEN** the result contains exactly one entry whose `url` is `siteUrl() + "/data-sources/"`
- **AND** that entry has `changeFrequency: 'monthly'` and `priority: 0.5`
