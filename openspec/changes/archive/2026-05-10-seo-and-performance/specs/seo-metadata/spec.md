## ADDED Requirements

### Requirement: Root layout has complete Open Graph metadata
The root layout `Metadata` export SHALL include `openGraph.type`, `openGraph.siteName`, `openGraph.images` (with url, width, height, alt), `twitter.card`, and `twitter.images`.

#### Scenario: Open Graph type is declared
- **WHEN** a social crawler reads the root layout HTML
- **THEN** the page includes `<meta property="og:type" content="website">`

#### Scenario: Open Graph siteName is declared
- **WHEN** a social crawler reads the root layout HTML
- **THEN** the page includes `<meta property="og:site_name" content="eco-metrics earth">`

#### Scenario: Open Graph image is declared
- **WHEN** a social crawler reads the root layout HTML
- **THEN** the page includes at least one `og:image` meta tag pointing to a valid URL

#### Scenario: Twitter summary card is declared
- **WHEN** a social crawler reads the root layout HTML
- **THEN** the page includes `<meta name="twitter:card" content="summary">`

#### Scenario: Twitter image is declared
- **WHEN** a social crawler reads the root layout HTML
- **THEN** the page includes at least one `twitter:image` meta tag

### Requirement: Root layout declares themeColor and icons metadata
The root layout `Metadata` export SHALL include `themeColor` entries for both dark and light color schemes, and an `icons` declaration pointing to the SVG logo.

#### Scenario: Theme color adapts to color scheme preference
- **WHEN** a browser with dark mode preference reads the page metadata
- **THEN** the theme color is `#0a0a0a`
- **WHEN** a browser with light mode preference reads the page metadata
- **THEN** the theme color is `#ffffff`

#### Scenario: Icon is declared in metadata
- **WHEN** a browser reads the page metadata
- **THEN** the page declares an `icon` pointing to `/icons/eco-metrics-earth.svg`

### Requirement: 404 page has a description in its metadata
The `not-found.tsx` metadata export SHALL include a `description` field.

#### Scenario: 404 metadata includes description
- **WHEN** a search engine crawls the 404 page
- **THEN** the page includes a `<meta name="description">` tag with a non-empty string describing the error state
