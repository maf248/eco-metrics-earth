## ADDED Requirements

### Requirement: Category social cards

`apps/web/src/app/[category]/og-image.png/route.tsx` SHALL serve, for every `ECO_CATEGORIES` slug (live and placeholder), a 1200×630 PNG at `/<category>/og-image.png` with `200` and no redirect, prerendered at build time through `generateStaticParams` and built from static data only (never the BFF). The card SHALL share the site card's layout and palette (black background, white and gray text, emerald accent and bottom border) and show the category's icon from `CATEGORY_ICONS`, its name (`getCategoryTitle`), its description (`CATEGORY_DESCRIPTIONS`) and the site name as the accent line. Any other slug SHALL get `404`. The site card's output SHALL NOT change.

#### Scenario: A category card is served

- **WHEN** `GET /co2-emissions/og-image.png` is requested
- **THEN** the response is `200` with `Content-Type: image/png` and no redirect

#### Scenario: Placeholder categories have a card

- **WHEN** `GET /air-quality/og-image.png` is requested
- **THEN** the response is `200` with `Content-Type: image/png`

#### Scenario: Unknown slug has no card

- **WHEN** the route handler is called with a slug that is not a category
- **THEN** it responds `404`

#### Scenario: Category pages declare their card

- **WHEN** a social crawler reads the HTML of `/co2-emissions/`
- **THEN** `og:image` and `twitter:image` are `{siteUrl}/co2-emissions/og-image.png`
- **AND** `og:image:alt` names the category

## MODIFIED Requirements

### Requirement: Root layout has complete Open Graph metadata

The root layout `Metadata` export SHALL include `openGraph.type`, `openGraph.siteName`, and a `twitter.card` of `summary_large_image`. Every route SHALL emit an `og:image` and a `twitter:image` that resolve to a 1200×630 PNG social card with alt text, so link previews render on social networks: category pages use their own category card (see "Category social cards"), every other route the site-wide card (logo, site name and tagline on the black brand background). Pages that declare their own `openGraph` or `twitter` metadata SHALL NOT lose the type, site name, image or large card. The image URL SHALL respond `200` directly, without a redirect.

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
- **THEN** the page includes a `twitter:image` meta tag pointing to the same 1200×630 PNG social card as its `og:image`
