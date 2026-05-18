# web-app-manifest Specification

## Purpose
TBD - created by archiving change seo-discovery. Update Purpose after archive.
## Requirements
### Requirement: Web App Manifest route
`apps/web/src/app/manifest.ts` SHALL export a default function returning a `MetadataRoute.Manifest` object that includes:
- `name`: `"eco-metrics earth"`
- `short_name`: `"eco-metrics"`
- `start_url`: `"/"`
- `display`: `"standalone"`
- `theme_color`: `"#10b981"`
- `background_color`: `"#000000"`
- `icons`: at least one entry referencing the site logo SVG at `/icons/eco-metrics-earth.svg` with `purpose: "any maskable"`.

#### Scenario: Manifest is served at the correct path
- **WHEN** a browser requests `/manifest.webmanifest`
- **THEN** the response contains a valid JSON manifest with `name`, `short_name`, `start_url`, and `display`

#### Scenario: Manifest theme colour matches brand
- **WHEN** the manifest function is called
- **THEN** `theme_color` is `"#10b981"` and `background_color` is `"#000000"`

#### Scenario: Manifest includes at least one icon
- **WHEN** the manifest function is called
- **THEN** the `icons` array contains at least one entry with a valid `src` path

