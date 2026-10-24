## MODIFIED Requirements

### Requirement: Per-product source attribution

Every product row/card SHALL surface the dataset's attribution fields: the `source` citation rendered as an external link to `sourceUrl` (`target="_blank"` + `rel="noopener noreferrer"`), and the `methodology` text inside a native `<details>` disclosure with a "Methodology" `<summary>` — visible and keyboard-accessible in both the table and card layouts. When the product has a `publisher`, the row/card SHALL also show "via" followed by the shared `SourceAttribution` (publisher name as an external link to the publisher's `sourceUrl`, then `(<license>)`) next to the citation; products without a `publisher` render exactly as before.

#### Scenario: Attribution visible per product

- **WHEN** the table renders
- **THEN** each row shows its source citation as a link to the product's `sourceUrl`

#### Scenario: Methodology disclosure

- **WHEN** a user activates a row's "Methodology" disclosure
- **THEN** the product's `methodology` text becomes visible

#### Scenario: Publisher shown when present

- **GIVEN** a product with `publisher` `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`
- **WHEN** the table and the card list render
- **THEN** the row and the card each show "via" followed by a link named `Our World in Data` to `https://ourworldindata.org` and the text `CC BY 4.0`, in addition to the citation link

#### Scenario: No publisher, no change

- **GIVEN** a product without `publisher`
- **WHEN** it renders
- **THEN** no "via" text is shown and the citation and methodology render as before
