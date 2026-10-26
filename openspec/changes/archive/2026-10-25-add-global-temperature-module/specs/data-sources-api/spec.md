## ADDED Requirements

### Requirement: Live sources list their upstream origins

Each `LiveDataSource` in the catalog SHALL carry `origins: LiveDataSourceOrigin[]`: the organizations that produced the data the live provider republishes, each with `producer`, `title`, `url`, `license` (`{ name, url }`), the optional `notice`, `citation` and `disclaimer`, and the `categories` it serves. Origins SHALL be declared statically by the category modules (through the provider's contributor) and SHALL NOT require a provider call at bootstrap. Within a source they SHALL be ordered by `producer` then `title`, and their categories sorted, so the catalog stays deterministic. Static datasets are unchanged.

#### Scenario: Origins in the catalog response

- **GIVEN** the application with the CO2 and global temperature modules
- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** the `owid` provider has `origins` including the Global Carbon Project for `co2-emissions` and the Copernicus Climate Change Service and Met Office Hadley Centre for `global-temperature`, each with a license name and URL

#### Scenario: Deterministic order

- **WHEN** the catalog is built twice
- **THEN** the origins are deeply equal and ordered by producer then title

#### Scenario: Providers without origins

- **GIVEN** a live source that registers no origins
- **WHEN** the catalog is built
- **THEN** its `origins` is an empty array

#### Scenario: Swagger documents origins

- **WHEN** the OpenAPI document is generated
- **THEN** the catalog response schema documents `origins` on providers
