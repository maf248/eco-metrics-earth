# page-metadata Specification

## Purpose

TBD - created by archiving change seo-metadata-og. Update Purpose after archive.

## Requirements

### Requirement: Root layout base metadata

`apps/web/src/app/layout.tsx` SHALL export a `metadata` object of type `Metadata` that includes:

- `openGraph.siteName` set to `"eco-metrics earth"`
- `twitter.card` set to `"summary"`

#### Scenario: Layout metadata contains site name

- **WHEN** Next.js renders any page using the root layout
- **THEN** the resolved `openGraph.siteName` is `"eco-metrics earth"`

#### Scenario: Layout metadata contains Twitter card type

- **WHEN** Next.js renders any page using the root layout
- **THEN** the resolved `twitter.card` is `"summary"`

### Requirement: Home page metadata

`apps/web/src/app/page.tsx` SHALL export a `metadata` object of type `Metadata` that includes:

- `title` set to `"eco-metrics earth"`
- `description` with a concise description of the site
- `alternates.canonical` set to `siteUrl() + "/"`
- `openGraph.title` matching the page `title`
- `openGraph.description` matching the page `description`
- `openGraph.url` set to `siteUrl() + "/"`
- `twitter.title` matching the page `title`
- `twitter.description` matching the page `description`

#### Scenario: Home page has canonical URL

- **WHEN** Next.js renders the home page
- **THEN** `<link rel="canonical">` points to the site base URL with a trailing slash

#### Scenario: Home page has Open Graph title

- **WHEN** Next.js renders the home page
- **THEN** `<meta property="og:title">` is present and not empty

### Requirement: Category page metadata

`apps/web/src/app/[category]/page.tsx` SHALL extend its existing `generateMetadata` function to include:

- `alternates.canonical` set to `siteUrl() + "/" + category + "/"`
- `openGraph.title` matching the resolved page title
- `openGraph.description` matching the resolved page description
- `openGraph.url` matching `alternates.canonical`
- `twitter.title` matching the resolved page title
- `twitter.description` matching the resolved page description

#### Scenario: Category page has canonical URL with trailing slash

- **WHEN** Next.js renders the `/air-quality/` category page
- **THEN** `<link rel="canonical">` points to `{siteUrl}/air-quality/`

#### Scenario: Category page Open Graph title matches page title

- **WHEN** Next.js renders any valid category page
- **THEN** `<meta property="og:title">` matches the human-readable category title

#### Scenario: Unknown category has no metadata

- **WHEN** `generateMetadata` is called with a slug not in `ECO_CATEGORIES`
- **THEN** no `alternates.canonical`, `openGraph`, or `twitter` fields are returned (same behaviour as before this change for the invalid-slug case)
