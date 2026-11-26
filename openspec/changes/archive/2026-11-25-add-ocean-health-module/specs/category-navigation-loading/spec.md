## MODIFIED Requirements

### Requirement: Direct visits to category pages deliver complete HTML

A direct request for a category page SHALL return HTML whose visible document already holds the heading, the server-rendered content and the structured data. It SHALL NOT contain a loading fallback, and that content SHALL NOT sit inside a hidden element awaiting a script.

#### Scenario: Provider-backed page from cache

- **GIVEN** `/co2-emissions/` is cached
- **WHEN** it is requested without executing JavaScript
- **THEN** the `<h1>`, the intro, the key figures, the data tables and the Dataset JSON-LD are present outside any hidden element
- **AND** the document has no `aria-busy="true"` element and exactly one `<main id="main-content">`

#### Scenario: Multi-provider page from cache

- **GIVEN** `/ocean-health/` is cached
- **WHEN** it is requested without executing JavaScript
- **THEN** the `<h1>`, the intro, the key figures, the five section headings, the data tables and the Dataset JSON-LD are present outside any hidden element

#### Scenario: Placeholder page

- **WHEN** `/air-quality/` is requested without executing JavaScript
- **THEN** the `<h1>` and the "coming soon" text are present outside any hidden element

#### Scenario: Source order follows reading order

- **WHEN** the HTML of a cached category page is read in source order
- **THEN** `<main>` and its content come before the `<footer>`
