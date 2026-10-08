# sitemap-and-robots Specification

## Purpose

Defines the sitemap lastModified field. robots.txt rules are owned by the `robots` capability.

## Requirements

### Requirement: Sitemap entries include lastModified date

Every entry returned by `sitemap.ts` SHALL include a `lastModified` field set to the build-time date (`new Date()`).

#### Scenario: Sitemap entries have lastModified

- **WHEN** the sitemap is generated
- **THEN** every entry in the returned array has a `lastModified` property that is a valid `Date` object
