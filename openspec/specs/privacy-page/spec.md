# privacy-page Specification

## Purpose

A short, static page that tells visitors in plain words what the site stores and measures.

## Requirements

### Requirement: Privacy page route and rendering

The web app SHALL serve a static page at `/privacy/` (`apps/web/src/app/privacy/page.tsx`) with one `<h1>` "Privacy" styled with `PAGE_TITLE_CLASS_NAME`, a short introduction and a few sections, each under an `<h2>`. It SHALL read no BFF data, SHALL NOT call `connection()` and SHALL be prerendered at build time. It SHALL follow the layout of the data sources page, use only design-system tokens and show a fixed "Last updated" date from a constant, never the request or build time.

#### Scenario: Page renders its heading and sections

- **WHEN** the privacy page is rendered
- **THEN** it shows exactly one `<h1>` named "Privacy"
- **AND** every section heading is an `<h2>`

#### Scenario: Page needs no data and no request-time rendering

- **WHEN** `page.tsx` of the privacy route is inspected
- **THEN** it imports nothing from `@/lib/bffFetch` or any BFF reader
- **AND** it does not call `connection()`

#### Scenario: Last updated is a fixed date

- **WHEN** the privacy page is rendered
- **THEN** it shows a "Last updated" `<time>` whose `dateTime` equals the `PRIVACY_LAST_UPDATED` constant of `apps/web/src/lib/privacyPolicy.ts`

### Requirement: Privacy page states only the facts that hold

The privacy page SHALL state, in plain English, generic terms and without legal claims, what the site stores and collects: no cookies, a theme preference kept only on the device, no accounts or forms, aggregate visit counts, page speed measured on a sample of visits, hosting request logs, error reports without personal data, no sale of data and how to make contact. It SHALL NOT name service providers or storage keys, and SHALL NOT claim compliance with any law or give legal advice.

#### Scenario: Device storage is explained generically

- **WHEN** the privacy page is rendered
- **THEN** its text says the site sets no cookies and only remembers the theme choice in the browser, which never leaves the device
- **AND** it says there are no accounts and no forms

#### Scenario: Measurement is described without naming providers

- **WHEN** the privacy page is rendered
- **THEN** its text says visits are counted in aggregate (pages, referring site, country, browser, operating system and device type) and page speed is measured on a sample of visits, without cookies, identification or following a person across days or sites
- **AND** it says hosting services keep standard request logs and unexpected errors are reported without personal data
- **AND** it says no data is sold or used for advertising

#### Scenario: No provider or storage key is named

- **WHEN** the privacy page text is read
- **THEN** it contains none of "Vercel", "Sentry", "Google", "Cloud Run" or `eco-metrics-theme`

#### Scenario: Contact goes through the public repository

- **WHEN** the privacy page is rendered
- **THEN** it contains a link to the repository's issues, `https://github.com/maf248/eco-metrics-earth/issues`, that opens with `rel="noopener noreferrer"`

#### Scenario: No compliance claims

- **WHEN** the privacy page text is read
- **THEN** it contains neither "GDPR" nor "compliant" nor "legal advice"

### Requirement: Privacy page SEO

The privacy page SHALL export `metadata` with a descriptive `title` ("Privacy", rendered through the root title template), a `description`, `alternates.canonical` equal to `siteUrl() + '/privacy/'`, and `openGraph` and `twitter` built with `buildOpenGraph` and `buildTwitter` from `@/lib/socialMetadata`, as the data sources page does. It SHALL stay indexable (no `robots` meta).

#### Scenario: Canonical and social metadata

- **WHEN** the metadata of the privacy page is read
- **THEN** `alternates.canonical` is `siteUrl() + '/privacy/'` with a trailing slash
- **AND** `openGraph.url` is the same URL and the Open Graph and Twitter images are the shared `OG_IMAGE`

#### Scenario: Page is indexable

- **WHEN** the HTML of `/privacy/` is fetched
- **THEN** it contains no `name="robots"` meta tag
- **AND** it contains a canonical link ending in `/privacy/`

### Requirement: Privacy page is reachable and accessible

The privacy page SHALL be reachable by a visitor from the footer link on every page and SHALL pass the axe audit with zero critical and serious violations in the light and dark themes.

#### Scenario: Reached from the footer

- **GIVEN** the home page is open
- **WHEN** the visitor follows the "Privacy" footer link
- **THEN** the browser lands on `/privacy/` and the "Privacy" `<h1>` is visible

#### Scenario: Axe audit

- **WHEN** the E2E accessibility spec audits `/privacy/` in the light and in the dark theme
- **THEN** there are zero critical and serious violations
