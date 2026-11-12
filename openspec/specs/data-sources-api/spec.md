# data-sources-api Specification

## Purpose

API catalog of the data sources in use, declared by each module and served at GET /api/v1/data-sources.

## Requirements

### Requirement: Modules declare their own data sources

The API SHALL let any module declare the data sources it uses by decorating one of its own providers with `@DataSourceContributor()` (defined in `apps/api/src/modules/data-sources/data-source-contributor.ts`) and implementing `getDataSources()`, which returns `DataSourceContribution[]` (synchronously or as a Promise). A contribution SHALL be either `{ kind: 'provider', source: LiveDataSource }` or `{ kind: 'dataset', source: StaticDataSource }`. No source SHALL be declared anywhere outside the module that uses it: not in `DataSourcesModule`, not in `@eco-metrics/shared`, not in `apps/web`.

#### Scenario: A decorated provider is discovered

- **GIVEN** an application module containing a provider decorated with `@DataSourceContributor()` that returns one `dataset` contribution
- **WHEN** `DataSourcesService.getCatalog()` is called
- **THEN** the returned catalog contains that dataset

#### Scenario: Removing a module removes its sources

- **GIVEN** a testing module that includes `DataSourcesModule` and a contributor module A, and a second testing module that includes `DataSourcesModule` without A
- **WHEN** the catalog is requested from each
- **THEN** A's sources appear only in the first catalog
- **AND** no other file needs to change for A's sources to disappear

#### Scenario: Undecorated providers are ignored

- **GIVEN** a provider that has a `getDataSources` method but no `@DataSourceContributor()` decorator
- **WHEN** the catalog is collected
- **THEN** that provider is not called

### Requirement: Catalog aggregation is deterministic and validated

`DataSourcesService` SHALL aggregate all contributions into a `DataSourcesCatalog`: `kind: 'provider'` contributions into `providers` and `kind: 'dataset'` contributions into `datasets`. Both arrays SHALL be sorted by `id`, and each dataset's `publications` by `citation`. Two contributions with the same `id` SHALL be rejected with an error. The service SHALL perform one collection in `onApplicationBootstrap` so a duplicate id fails the application start instead of the first request.

#### Scenario: Partition by kind

- **GIVEN** contributors returning one provider and one dataset
- **WHEN** the catalog is built
- **THEN** `providers` has exactly the provider and `datasets` exactly the dataset

#### Scenario: Stable ordering

- **GIVEN** contributors that return sources in arbitrary order
- **WHEN** the catalog is built twice
- **THEN** both results are equal and sorted by `id`

#### Scenario: Duplicate ids are rejected

- **GIVEN** two contributions with `id: 'x'`
- **WHEN** the catalog is built
- **THEN** an error naming the duplicate id is thrown
- **AND** application bootstrap fails

#### Scenario: Empty catalog

- **GIVEN** no contributors
- **WHEN** the catalog is built
- **THEN** it is `{ providers: [], datasets: [] }`

### Requirement: Data sources endpoint

`DataSourcesController` (registered by `DataSourcesModule`, imported by `AppModule`) SHALL expose `GET /api/v1/data-sources` returning `ApiResponse<DataSourcesCatalog>` as `{ success: true, data, status: 200 }` without `meta`. The endpoint SHALL be documented in Swagger under the `'Data Sources'` tag (`@ApiOperation`, `@ApiOkResponse`) and SHALL go through the same global pipeline (prefix, throttling, exception filter) as every other endpoint.

#### Scenario: Catalog returned in the standard envelope

- **GIVEN** the application with the water-footprint module
- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** the response is `200` with `success: true`, `status: 200` and `data.providers` and `data.datasets` as arrays
- **AND** `data.datasets` contains the `water-footprint` dataset

#### Scenario: No meta on the catalog

- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** the response has no `meta` property

#### Scenario: Swagger documentation

- **WHEN** the OpenAPI document is generated
- **THEN** `GET /api/v1/data-sources` appears under the `Data Sources` tag

### Requirement: Static dataset sources are derived from the dataset

The water-footprint dataset SHALL contribute one `dataset` source with `id: 'water-footprint'` and `categories: ['water-footprint']`. Its `publications` SHALL be derived from the loaded dataset by grouping rows on the pair (`source`, `sourceUrl`): one publication per distinct pair, with `citation` = `source`, `url` = `sourceUrl`, `entryCount` = number of rows in the group, `publishedYear` parsed from the citation (see `water-footprint-api-data`), and `publisher` resolved by the shared `resolvePublisher(sourceUrl)` (omitted when none). No bibliography text SHALL exist outside `water-footprint.json`. When the dataset is empty (data file absent), the service SHALL contribute nothing.

#### Scenario: Distinct citations deduplicated

- **GIVEN** the real dataset where 37 rows cite the same Poore & Nemecek (2018) URL
- **WHEN** the dataset contribution is built
- **THEN** that citation appears exactly once with `entryCount: 37` and `publishedYear: 2018`
- **AND** the sum of all `entryCount` equals the number of dataset rows (60) and there are 15 publications

#### Scenario: Same citation with different URLs stays separate

- **GIVEN** two rows with the same `source` and different `sourceUrl`
- **WHEN** the contribution is built
- **THEN** two publications are produced

#### Scenario: Bibliography follows the data

- **GIVEN** a service constructed over a fixture dataset with three distinct pairs
- **WHEN** the contribution is built
- **THEN** exactly three publications are returned, with no citation that is absent from the fixture

#### Scenario: Empty dataset contributes nothing

- **GIVEN** the data file is absent and the service initialised with an empty dataset
- **WHEN** `getDataSources()` is called
- **THEN** it returns `[]`

### Requirement: Source timestamps and their basis

A live provider source SHALL carry `lastUpdated` (ISO 8601) and `lastUpdatedBasis`: the provider's own last-update timestamp with basis `'provider'` when the provider supplies one, otherwise the time the data was retrieved with basis `'retrieval'`. A static dataset SHALL NOT carry a dataset-level timestamp: the date of each of its publications is the `publishedYear` of its citation.

#### Scenario: Live provider prefers the provider timestamp

- **GIVEN** a contributor test double for a live provider that has a provider timestamp P and a retrieval time R
- **WHEN** its contribution is built
- **THEN** `lastUpdated` is P and `lastUpdatedBasis` is `'provider'`

#### Scenario: Live provider falls back to retrieval time

- **GIVEN** a contributor test double for a live provider that has only a retrieval time R
- **WHEN** its contribution is built
- **THEN** `lastUpdated` is R and `lastUpdatedBasis` is `'retrieval'`

#### Scenario: Static dataset has publication years instead

- **WHEN** the water-footprint dataset contribution is built
- **THEN** it has no `lastUpdated` and every publication has a numeric `publishedYear`

### Requirement: Publisher attribution on cited publications

A publication whose `url` is hosted by a known licensor SHALL carry `publisher: DataSourcePublisher` resolved by the same `resolvePublisher` function that sets `publisher` on the products endpoint rows; a publication from any other host SHALL omit `publisher`. The citation text and URL SHALL NOT be altered by this.

#### Scenario: OWID-hosted citation carries the OWID publisher

- **GIVEN** a row whose `sourceUrl` host is `ourworldindata.org`
- **WHEN** the publication is built
- **THEN** `publisher` equals `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`
- **AND** `citation` is still `Poore & Nemecek (2018), Science`

#### Scenario: Other hosts have no publisher

- **GIVEN** a row whose `sourceUrl` is a DOI link
- **WHEN** the publication is built
- **THEN** `publisher` is absent

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
