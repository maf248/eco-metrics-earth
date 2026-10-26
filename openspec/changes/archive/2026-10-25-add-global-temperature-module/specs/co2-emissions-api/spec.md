## ADDED Requirements

### Requirement: CO2 payload carries its upstream origin

In addition to the fields in "CO2 emissions endpoint serves every country and World in one response", `data` SHALL contain `origin`, a `DataSourceOrigin` for the Global Carbon Project (`producer` `Global Carbon Project`, `title` `Global Carbon Budget`, `url` `https://globalcarbonbudget.org/`, `license` `{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }`). It SHALL be a static constant of the module, the same value passed to `OwidProviderStatus.registerCategory('co2-emissions', [origin])`, and SHALL be attached by the service, not by `buildCo2EmissionsData`, so that builder's output is unchanged.

#### Scenario: Origin in the payload

- **WHEN** `GET /api/v1/co2-emissions` is called
- **THEN** `data.origin.producer` is `Global Carbon Project` and `data.origin.license.name` is `CC BY 4.0`

#### Scenario: Same definition in the catalog

- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** the `owid` entry lists the same origin for `co2-emissions`

#### Scenario: Builder output is unchanged

- **WHEN** `buildCo2EmissionsData` runs on the committed fixtures
- **THEN** its output is identical to before and contains no `origin`

## MODIFIED Requirements

### Requirement: The CO2 module registers OWID as its data source

`Co2EmissionsService` SHALL register the category `co2-emissions` with `OwidProviderStatus` on construction, passing its static Global Carbon Project origin, and SHALL record the provider timestamp after each successful assembly, so that the OWID live data source in the catalog lists `co2-emissions` and its origin (see `owid-provider-client`). The service SHALL NOT build a data-source entry itself.

#### Scenario: Catalog lists OWID for the category

- **GIVEN** the application with `Co2EmissionsModule`
- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** `data.providers` contains one entry with `id: 'owid'` whose `categories` include `co2-emissions`

#### Scenario: Removing the module removes the category

- **GIVEN** a testing module with `OwidModule` and `DataSourcesModule` but without `Co2EmissionsModule`
- **WHEN** the catalog is requested
- **THEN** it contains no `owid` provider entry
