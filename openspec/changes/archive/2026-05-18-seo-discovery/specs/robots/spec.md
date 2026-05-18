## ADDED Requirements

### Requirement: Robots route
`apps/web/src/app/robots.ts` SHALL export a default function returning a `MetadataRoute.Robots` object that:
- Allows all user-agents (`User-Agent: *`) with no `disallow` rules.
- Includes a `sitemap` field pointing to `siteUrl() + "/sitemap.xml"`.

#### Scenario: All crawlers are allowed
- **WHEN** a crawler fetches `/robots.txt`
- **THEN** the response contains `User-agent: *` with `Allow: /`

#### Scenario: Sitemap URL is declared
- **WHEN** a crawler fetches `/robots.txt`
- **THEN** the response contains a `Sitemap:` directive pointing to the absolute `/sitemap.xml` URL
