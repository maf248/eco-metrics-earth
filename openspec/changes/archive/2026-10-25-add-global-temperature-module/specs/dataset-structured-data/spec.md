## ADDED Requirements

### Requirement: A generic schema.org Dataset builder

`apps/web/src/lib/datasetJsonLd.ts` SHALL export a pure `buildDatasetJsonLd` that builds the parts every dataset page shares and takes the category-specific parts as input. From `meta` and the canonical URLs it SHALL produce `@context`, `@type: 'Dataset'`, `url`, `isAccessibleForFree: true`, `license` (via `licenseUrl`), `creator` (the provider as an `Organization`), `dateModified` (`meta.source.lastUpdated`), `spatialCoverage` (a `Place` named World with a whole-Earth `GeoShape` box) and `includedInDataCatalog` (the site's `/data-sources/` page). From its input it SHALL take `name`, `description`, `keywords`, `temporalCoverage` (`startYear/endYear`), `variableMeasured` and `isBasedOn` unchanged. `licenseUrl` (the versioned Creative Commons URL derived from the API's license name, the name itself otherwise) SHALL move into the same module. `buildCo2DatasetJsonLd` SHALL remain as a thin wrapper that supplies the CO2 fields and SHALL return exactly the object it returned before. No `distribution` is produced. The generic `JsonLd` component is reused as is.

#### Scenario: CO2 output is unchanged

- **GIVEN** the input of the existing `co2StructuredData` suite
- **WHEN** `buildCo2DatasetJsonLd` runs
- **THEN** the result is deeply equal to the one produced before the extraction

#### Scenario: Shared fields come from the generic builder

- **WHEN** `buildDatasetJsonLd` is called with a name, description, keywords, coverage, variables and `isBasedOn`
- **THEN** the result carries those unchanged plus `url`, `license`, `creator`, `dateModified`, `spatialCoverage` and `includedInDataCatalog` derived from `meta` and the URLs

#### Scenario: License derivation

- **WHEN** the license name is `CC BY 4.0`
- **THEN** `license` is `https://creativecommons.org/licenses/by/4.0/`
- **AND** a non-Creative-Commons name is returned as is

#### Scenario: No distribution

- **WHEN** the builder runs
- **THEN** the result has no `distribution` property
