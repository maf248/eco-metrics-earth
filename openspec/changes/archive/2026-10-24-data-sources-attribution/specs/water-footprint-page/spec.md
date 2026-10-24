## ADDED Requirements

### Requirement: Section-level source attribution on the water-footprint page

Below the product table (and its equivalents footnote), the water-footprint page SHALL render a section-level attribution note built with the shared `SourceAttribution` component. When some products have a `publisher`, the note SHALL read "Some values are republished by <publisher link> (<license>)", naming each distinct `publisher` of the products already fetched for the page (no additional BFF request, no constants in the web app), because not every row is republished. It SHALL always contain exactly one link to `/data-sources/` ("All data sources"). When no product has a publisher, only that link SHALL be shown. The page SHALL keep a single BFF fetch (`getWaterFootprintProducts()`), with the existing retry and never-cached rules unchanged.

#### Scenario: Note names the publisher from the products

- **GIVEN** products where some rows have publisher `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`
- **WHEN** the water-footprint content is rendered
- **THEN** below the table a note contains a link to `https://ourworldindata.org` named `Our World in Data`, the text `(CC BY 4.0)`, the lead-in "Some values are republished by", and a single link to `/data-sources/`

#### Scenario: Publishers deduplicated

- **GIVEN** many products that share the same publisher
- **WHEN** the note is rendered
- **THEN** each distinct publisher is named once

#### Scenario: No publisher on any product

- **GIVEN** products without a `publisher`
- **WHEN** the content is rendered
- **THEN** the note shows only the link to `/data-sources/`

#### Scenario: Single BFF fetch

- **WHEN** the water-footprint page is generated
- **THEN** only the products endpoint is requested (no `/data-sources` request)

#### Scenario: E2E

- **WHEN** `/water-footprint/` is loaded against the real BFF
- **THEN** the page contains "Our World in Data", "CC BY 4.0" and a link to `/data-sources/` below the table
