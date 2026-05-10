# sitemap-and-robots Specification

## Purpose
TBD - created by archiving change seo-and-performance. Update Purpose after archive.
## Requirements
### Requirement: Sitemap entries include lastModified date
Every entry returned by `sitemap.ts` SHALL include a `lastModified` field set to the build-time date (`new Date()`).

#### Scenario: Sitemap entries have lastModified
- **WHEN** the sitemap is generated
- **THEN** every entry in the returned array has a `lastModified` property that is a valid `Date` object

### Requirement: robots.txt disallows crawling of API paths
The `robots.ts` SHALL include a rule that disallows all user agents from crawling paths starting with `/api/`.

#### Scenario: Robots.txt disallows /api/ for all crawlers
- **WHEN** a search engine crawler fetches `/robots.txt`
- **THEN** the response includes a `Disallow: /api/` rule for `User-agent: *`

#### Scenario: Robots.txt still allows crawling of all other paths
- **WHEN** a search engine crawler fetches `/robots.txt`
- **THEN** the response includes an `Allow: /` rule for `User-agent: *`

