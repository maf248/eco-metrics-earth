# E2E SEO Tests

## ADDED Requirements

### Requirement: Trailing slashes enforced on all navigable URLs
All navigable URLs in the web app SHALL end with a trailing slash (`/`). Requests without a trailing slash SHALL redirect to the trailing-slash version.

#### Scenario: Home page URL has trailing slash
- **WHEN** the browser navigates to the home page
- **THEN** the final URL is exactly `/` (Next.js root path with trailingSlash: true)

#### Scenario: Category page URL has trailing slash
- **WHEN** the browser navigates to `/air-quality`
- **THEN** the final URL is `/air-quality/`

#### Scenario: Redirect from non-trailing-slash to trailing-slash
- **WHEN** the browser navigates to `/air-quality` (without trailing slash)
- **THEN** the browser is redirected to `/air-quality/`

### Requirement: Metadata tags present on home page
The home page SHALL render a `<title>`, `<meta name="description">`, Open Graph tags, and Twitter card tags in the `<head>`.

#### Scenario: Home page title and description
- **WHEN** the browser loads the home page
- **THEN** the `<title>` is "eco-metrics earth"
- **AND** a `<meta name="description">` tag is present with non-empty content

#### Scenario: Home page Open Graph tags
- **WHEN** the browser loads the home page
- **THEN** `<meta property="og:title">` is present
- **AND** `<meta property="og:description">` is present
- **AND** `<meta property="og:type">` has content "website"
- **AND** `<meta property="og:site_name">` has content "eco-metrics earth"
- **AND** `<meta property="og:url">` is present

#### Scenario: Home page Twitter card tags
- **WHEN** the browser loads the home page
- **THEN** `<meta name="twitter:card">` has content "summary"
- **AND** `<meta name="twitter:title">` is present
- **AND** `<meta name="twitter:description">` is present

### Requirement: Metadata tags present on category pages
Each eco-category page SHALL render a `<title>`, `<meta name="description">`, Open Graph tags, Twitter card tags, and a canonical `<link>` in the `<head>`.

#### Scenario: Category page title follows template
- **WHEN** the browser loads `/air-quality/`
- **THEN** the `<title>` is "Air Quality — eco-metrics earth"

#### Scenario: Category page has canonical URL
- **WHEN** the browser loads `/air-quality/`
- **THEN** a `<link rel="canonical">` tag is present
- **AND** its `href` ends with `/air-quality/`

#### Scenario: Category page Open Graph tags are dynamic
- **WHEN** the browser loads `/air-quality/`
- **THEN** `<meta property="og:title">` content includes "Air Quality"
- **AND** `<meta property="og:url">` content ends with `/air-quality/`

#### Scenario: Category page Twitter tags are dynamic
- **WHEN** the browser loads `/air-quality/`
- **THEN** `<meta name="twitter:title">` content includes "Air Quality"

### Requirement: Sitemap XML is valid and complete
The sitemap at `/sitemap.xml` SHALL be valid XML and SHALL contain 12 `<url>` entries: one for the home page and one for each of the 11 eco-categories.

#### Scenario: Sitemap is accessible and valid XML
- **WHEN** the browser fetches `/sitemap.xml`
- **THEN** the response status is 200
- **AND** the Content-Type is `application/xml` or `text/xml`
- **AND** the document is valid XML

#### Scenario: Sitemap contains all expected URLs
- **WHEN** the browser fetches `/sitemap.xml`
- **THEN** exactly 12 `<url>` elements are present
- **AND** a `<loc>` for `/` is present
- **AND** a `<loc>` for each 11 category URLs (with trailing slash) is present

#### Scenario: Sitemap entries have change frequency and priority
- **WHEN** the browser fetches `/sitemap.xml`
- **THEN** each `<url>` contains a `<changefreq>` element
- **AND** each `<url>` contains a `<priority>` element

### Requirement: Robots.txt is valid
The robots.txt file at `/robots.txt` SHALL allow crawling of `/` and disallow `/api/`, and SHALL point to the sitemap.

#### Scenario: Robots.txt is accessible
- **WHEN** the browser fetches `/robots.txt`
- **THEN** the response status is 200
- **AND** the content includes "Allow: /"
- **AND** the content includes "Disallow: /api/"
- **AND** the content includes a "Sitemap:" directive pointing to `/sitemap.xml`

### Requirement: PWA manifest is valid JSON
The manifest at `/manifest.webmanifest` SHALL be valid JSON with required PWA fields: `name`, `short_name`, `icons`, `theme_color`, `background_color`, and `display`.

#### Scenario: Manifest is accessible and valid JSON
- **WHEN** the browser fetches `/manifest.webmanifest`
- **THEN** the response status is 200
- **AND** the content is valid JSON
- **AND** the `name` field is "eco-metrics earth"
- **AND** the `display` field is "standalone"
- **AND** the `theme_color` field is `#10b981`
- **AND** the `icons` array contains at least one entry with `src`, `sizes`, and `type`
