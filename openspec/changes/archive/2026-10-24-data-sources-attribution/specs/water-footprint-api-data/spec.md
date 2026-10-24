## ADDED Requirements

### Requirement: Optional publisher on each product

Each `WaterFootprintProduct` returned by `GET /api/v1/water-footprint/products` MAY carry `publisher?: DataSourcePublisher` (`provider`, `license`, `sourceUrl`). The API SHALL set it when the host of the row's `sourceUrl` belongs to a known licensor (today `ourworldindata.org`, resolved to `OWID_PUBLISHER`) and SHALL omit it for every other host. The resolution SHALL live in one function in the API (`resolvePublisher(sourceUrl)`), used both for this mapping and for the data-sources bibliography derivation. `water-footprint.json` SHALL NOT store the publisher: it stays a bare array of 60 rows and the field is added when rows are returned. The change is additive and optional, so existing consumers remain valid; the `source`, `sourceUrl` and `methodology` fields are unchanged. The shared `WaterFootprintProduct` type SHALL declare the optional field.

#### Scenario: OWID-hosted rows carry the publisher

- **GIVEN** the real dataset
- **WHEN** `GET /api/v1/water-footprint/products` is called
- **THEN** every row whose `sourceUrl` host is `ourworldindata.org` (37 rows) has `publisher` equal to `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`

#### Scenario: Other rows omit the publisher

- **GIVEN** the real dataset
- **WHEN** the products are returned
- **THEN** every row from another host has no `publisher` property

#### Scenario: Backward compatible response

- **WHEN** the products endpoint is called with and without `?category=`
- **THEN** it still returns a bare array under `data` (60 rows unfiltered), and each row keeps all its previous fields with unchanged values

#### Scenario: Single resolution function

- **WHEN** `apps/api/src` is searched for the host `ourworldindata.org`
- **THEN** it appears only in the publisher resolver (and tests)

### Requirement: Citation year is parseable and fail-fast

Every dataset row's `source` SHALL contain exactly one four-digit publication year in parentheses (e.g. `(2018)`); that match of `\((\d{4})\)` is the citation's `publishedYear`. Every row's `sourceUrl` SHALL be a parseable absolute URL. `WaterFootprintService` SHALL validate this at construction and, when any row has zero or several year matches, or an unparsable `sourceUrl`, throw an `Error` naming the offending product and `source`, consistent with the existing fail-fast loader rules (a malformed dataset must stop the boot rather than serve a source with no date).

#### Scenario: Real dataset parses

- **WHEN** the service is constructed over the real dataset
- **THEN** every row has a parseable year and the 15 distinct citations resolve to a year

#### Scenario: Unparseable citation fails construction

- **GIVEN** a fixture dataset with a row whose `source` has no `(YYYY)`
- **WHEN** the service is constructed
- **THEN** it throws an `Error` naming that product and source
