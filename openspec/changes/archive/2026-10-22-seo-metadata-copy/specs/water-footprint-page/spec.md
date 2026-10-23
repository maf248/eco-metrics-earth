## MODIFIED Requirements

### Requirement: SEO preservation on the water-footprint page

The `generateMetadata` output for water-footprint SHALL use title "Water Footprint of Food & Products" (rendered by the root layout template as "Water Footprint of Food & Products | eco-metrics earth", 54 characters), description "Water footprint of food and products: how many liters of green, blue and grey water it takes to produce what we eat and use. Source-cited data." (143 characters), canonical URL `{siteUrl}/water-footprint/` (trailing slash), and matching Open Graph/Twitter tags. The page heading remains "Water Footprint". The product data SHALL be present in the server-rendered HTML so the page content is indexable without client JavaScript.

#### Scenario: Metadata unchanged

- **WHEN** `/water-footprint/` is requested
- **THEN** `<title>` is "Water Footprint of Food & Products | eco-metrics earth" and `<link rel="canonical">` points to `/water-footprint/` with a trailing slash
- **AND** `<meta name="description">` is the description above
- **AND** `og:title` and `twitter:title` are "Water Footprint of Food & Products", and `og:description` and `twitter:description` equal the meta description

#### Scenario: Server-rendered content is indexable

- **WHEN** the raw HTML of `/water-footprint/` is fetched (no JavaScript execution)
- **THEN** the HTML contains product names from the dataset (e.g. "Beef (beef herd)")
