## ADDED Requirements

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
