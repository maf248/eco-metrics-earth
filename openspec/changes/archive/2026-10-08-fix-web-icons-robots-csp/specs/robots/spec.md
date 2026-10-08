## MODIFIED Requirements

### Requirement: Robots route

`apps/web/src/app/robots.ts` SHALL export a default function returning a `MetadataRoute.Robots` object that:

- Declares exactly one rule group, for all user-agents (`User-Agent: *`), allowing every path (`Allow: /`). The web domain serves pages only — the API is a separate service on its own domain — so there are no web paths to keep crawlers out of.
- Includes a `sitemap` field pointing to `siteUrl() + "/sitemap.xml"`.

#### Scenario: All crawlers are allowed

- **WHEN** a crawler fetches `/robots.txt`
- **THEN** the response contains a single `User-agent: *` group with `Allow: /`
- **AND** the response contains no `Disallow` directive

#### Scenario: Sitemap URL is declared

- **WHEN** a crawler fetches `/robots.txt`
- **THEN** the response contains a `Sitemap:` directive pointing to the absolute `/sitemap.xml` URL
