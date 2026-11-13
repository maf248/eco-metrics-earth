## MODIFIED Requirements

### Requirement: schema.org Dataset structured data for the energy sources page

The page SHALL declare its data once as a schema.org `Dataset` in JSON-LD (rendered with `JsonLd`, built by `buildDatasetJsonLd` from the page's own payload, never one block per chart). The name SHALL read `Electricity generation mix by country, 2000–2025` (years from the payload), `temporalCoverage` `2000/2025`, `variableMeasured` two `PropertyValue`s (electricity generation by source with the payload's unit `TWh`, and share of electricity generation by source with unit `%`, derived), `isBasedOn` the OWID dataset (name and version from the payload) and the Ember origin published by Ember at the origin URL, both as `CreativeWork` sources built with `buildSourceWork`, and the description SHALL state that the data covers electricity only and that bioenergy and other renewables are summed.

#### Scenario: One Dataset block

- **WHEN** the raw HTML of `/energy-sources/` is read
- **THEN** it contains exactly one `application/ld+json` block, of `@type` `Dataset`, whose `url` ends in `/energy-sources/`

#### Scenario: Built from the payload

- **GIVEN** a payload with `startYear` 2000, `endYear` 2025 and unit `TWh`
- **WHEN** the Dataset is built
- **THEN** `name` is `Electricity generation mix by country, 2000–2025`, `temporalCoverage` is `2000/2025`, `variableMeasured` has two entries for TWh and %, and `isBasedOn` lists the OWID dataset and the Ember dataset, each as a `CreativeWork`

#### Scenario: License and creator

- **WHEN** the Dataset is built
- **THEN** `license` is `https://creativecommons.org/licenses/by/4.0/` and `creator` is the OWID organization
