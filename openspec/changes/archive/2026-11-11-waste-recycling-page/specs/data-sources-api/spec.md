# Spec Delta

## ADDED Requirements

### Requirement: License on publications without a republisher

A publication that is not republished by a known licensor but is published under an open license SHALL carry `license: { name, url }`, declared by the module that contributes it, naming the license and linking to its text. A publication with a `publisher` SHALL NOT also carry `license`: its license is the publisher's. The catalog validation SHALL reject a publication that has both.

#### Scenario: World Bank publication carries its license

- **WHEN** the waste-recycling dataset contribution is built
- **THEN** its publication has `license` `{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }` and no `publisher`

#### Scenario: Publisher and license together are rejected

- **GIVEN** a contributor whose publication has both `publisher` and `license`
- **WHEN** the catalog is aggregated
- **THEN** validation fails and names the publication

#### Scenario: Existing publications are unchanged

- **WHEN** the water-footprint dataset contribution is built
- **THEN** none of its publications has `license`
