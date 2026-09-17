# site-url-config Specification

## Purpose

TBD - created by archiving change seo-metadata-og. Update Purpose after archive.

## Requirements

### Requirement: Base URL helper

`apps/web/src/lib/siteUrl.ts` SHALL export a `siteUrl` function that returns the canonical base URL for the web app as a string with no trailing slash.

The helper SHALL read `process.env.NEXT_PUBLIC_SITE_URL` and, if the value is absent or empty, fall back to `http://localhost:3000`.

The helper SHALL strip any trailing slash from the resolved value before returning.

#### Scenario: Env var is set

- **WHEN** `NEXT_PUBLIC_SITE_URL` is set to `https://eco-metrics.earth`
- **THEN** `siteUrl()` returns `https://eco-metrics.earth` (no trailing slash)

#### Scenario: Env var is set with trailing slash

- **WHEN** `NEXT_PUBLIC_SITE_URL` is set to `https://eco-metrics.earth/`
- **THEN** `siteUrl()` returns `https://eco-metrics.earth` (trailing slash stripped)

#### Scenario: Env var is not set

- **WHEN** `NEXT_PUBLIC_SITE_URL` is absent or empty
- **THEN** `siteUrl()` returns `http://localhost:3000`

### Requirement: Env var documented

`apps/web/.env.example` SHALL include an entry for `NEXT_PUBLIC_SITE_URL` with a comment explaining its purpose and the default fallback value.

#### Scenario: .env.example contains the variable

- **WHEN** a developer opens `apps/web/.env.example`
- **THEN** `NEXT_PUBLIC_SITE_URL` is present with an inline comment describing the canonical base URL for SEO metadata
