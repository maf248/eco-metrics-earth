## ADDED Requirements

### Requirement: Convert eco-category slug to human-readable title
The `slugToTitle` function SHALL accept an `EcoCategory` slug string and return a human-readable title by splitting on hyphens and capitalizing the first letter of each word.

#### Scenario: Single-word slug
- **WHEN** `slugToTitle('deforestation')` is called
- **THEN** it returns `'Deforestation'`

#### Scenario: Multi-word slug
- **WHEN** `slugToTitle('air-quality')` is called
- **THEN** it returns `'Air Quality'`

#### Scenario: Three-word slug
- **WHEN** `slugToTitle('global-temperature')` is called
- **THEN** it returns `'Global Temperature'`

#### Scenario: All six ECO_CATEGORIES slugs produce correct titles
- **WHEN** each value in `ECO_CATEGORIES` is passed to `slugToTitle`
- **THEN** the expected titles are: `'Air Quality'`, `'Endangered Species'`, `'Global Temperature'`, `'Deforestation'`, `'Ocean Health'`, `'Co2 Emissions'` respectively

#### Scenario: Slug with numeric segment
- **WHEN** `slugToTitle('co2-emissions')` is called
- **THEN** it returns `'Co2 Emissions'`
