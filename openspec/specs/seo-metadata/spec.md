# seo-metadata Specification

## Purpose

Defines the Open Graph, Twitter Card, icon, theme-color, and 404 metadata for the root layout.

## Requirements

### Requirement: Root layout has complete Open Graph metadata

The root layout `Metadata` export SHALL include `openGraph.type`, `openGraph.siteName`, and a `twitter.card` of `summary_large_image`. Every route SHALL emit an `og:image` and a `twitter:image` that resolve to a site-wide 1200×630 PNG social card (logo, site name and tagline on the black brand background) with alt text, so link previews render on social networks. Pages that declare their own `openGraph` or `twitter` metadata SHALL NOT lose the type, site name, image or large card. The image URL SHALL respond `200` directly, without a redirect.

#### Scenario: Open Graph type is declared

- **WHEN** a social crawler reads the HTML of the home page or any category page
- **THEN** the page includes `<meta property="og:type" content="website">`

#### Scenario: Open Graph siteName is declared

- **WHEN** a social crawler reads the HTML of the home page or any category page
- **THEN** the page includes `<meta property="og:site_name" content="eco-metrics earth">`

#### Scenario: Open Graph image is declared

- **WHEN** a social crawler reads the HTML of the home page or any category page
- **THEN** the page includes an `og:image` meta tag with an absolute URL
- **AND** `og:image:width` is `1200`, `og:image:height` is `630`, and `og:image:alt` is non-empty
- **AND** fetching that URL returns `200` with `Content-Type: image/png` directly, without a redirect

#### Scenario: Twitter summary card is declared

- **WHEN** a social crawler reads the HTML of the home page or any category page
- **THEN** the page includes `<meta name="twitter:card" content="summary_large_image">`

#### Scenario: Twitter image is declared

- **WHEN** a social crawler reads the HTML of the home page or any category page
- **THEN** the page includes a `twitter:image` meta tag pointing to the same 1200×630 PNG social card

### Requirement: Root layout declares themeColor and icons metadata

The root layout `Metadata` export SHALL include `themeColor` entries for both dark and light color schemes, an `icon` declaration pointing to the SVG logo, and an `apple` icon declaration pointing to a 180×180 PNG of the logo on an opaque black `#000000` background (iOS does not use SVG apple-touch-icons and fills transparency with black).

#### Scenario: Theme color adapts to color scheme preference

- **WHEN** a browser with dark mode preference reads the page metadata
- **THEN** the theme color is `#0a0a0a`
- **WHEN** a browser with light mode preference reads the page metadata
- **THEN** the theme color is `#ffffff`

#### Scenario: Icon is declared in metadata

- **WHEN** a browser reads the page metadata
- **THEN** the page declares an `icon` pointing to `/icons/eco-metrics-earth.svg`

#### Scenario: Apple touch icon is a PNG

- **WHEN** an iOS device reads the page metadata
- **THEN** the page declares an `apple-touch-icon` pointing to `/icons/apple-touch-icon.png`
- **AND** that file is a valid 180×180 PNG with no transparent pixels

### Requirement: 404 page has a description in its metadata

The `not-found.tsx` metadata export SHALL include a `description` field.

#### Scenario: 404 metadata includes description

- **WHEN** a search engine crawls the 404 page
- **THEN** the page includes a `<meta name="description">` tag with a non-empty string describing the error state

### Requirement: Social card carries a call to action

The site-wide social card served at `/og-image.png` SHALL show, in addition to the logo, site name and tagline, a subtle call to action with the exact text `Explore the data →`. The CTA SHALL be visually secondary to the site name and tagline, use only the existing card palette (black `#000000` background, white and gray text, emerald `#10b981` accent) per `docs/design-system.md`, and keep sufficient text contrast. The tagline SHALL be the shared site description. `OG_IMAGE.alt` SHALL describe the new positioning (environmental data on CO2, climate, energy and water) and not use the retired "Track and visualize environmental metrics" wording. The card SHALL remain a 1200×630 PNG served with `200` and no redirect.

#### Scenario: Card still renders as before

- **WHEN** `GET /og-image.png` is requested
- **THEN** the response is `200` with `Content-Type: image/png` and no redirect

#### Scenario: CTA is present in the card source

- **WHEN** the route source is inspected
- **THEN** it renders the CTA string `Explore the data →` (or the text-only fallback if the arrow glyph is missing)
- **AND** its tagline is the shared site description constant

#### Scenario: Visual check

- **GIVEN** the build is running
- **WHEN** the card is opened in a browser
- **THEN** the CTA is legible, does not overlap the tagline, and fits inside the 1200×630 canvas
