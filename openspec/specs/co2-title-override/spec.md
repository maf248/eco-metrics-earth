# co2-title-override Specification

## Purpose
TBD - created by archiving change accessibility-and-bugs. Update Purpose after archive.
## Requirements
### Requirement: CO2 category displays the correct chemical formula casing
The `getCategoryTitle` function SHALL return `'CO2 Emissions'` (all-caps CO2) for the `'co2-emissions'` slug. This SHALL be implemented via the existing `TITLE_OVERRIDES` map in `categoryTitle.ts`.

#### Scenario: getCategoryTitle returns correct CO2 title
- **WHEN** `getCategoryTitle('co2-emissions')` is called
- **THEN** the return value is `'CO2 Emissions'`

#### Scenario: CO2 Emissions page title is correct
- **WHEN** the `/co2-emissions/` page is rendered
- **THEN** the page heading displays `'CO2 Emissions'` with uppercase `CO2`

#### Scenario: Other category titles are unaffected
- **WHEN** `getCategoryTitle` is called with any slug other than `'co2-emissions'`
- **THEN** the return value is unchanged from its current output

