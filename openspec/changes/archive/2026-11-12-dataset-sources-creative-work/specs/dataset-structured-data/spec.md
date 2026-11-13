## MODIFIED Requirements

### Requirement: A generic schema.org Dataset builder

`apps/web/src/lib/datasetJsonLd.ts` SHALL export a pure `buildDatasetJsonLd` that builds the parts every dataset page shares and takes the category-specific parts as input. From `meta` and the canonical URLs it SHALL produce `@context`, `@type: 'Dataset'`, `url`, `isAccessibleForFree: true`, `license` (via `licenseUrl`), `creator` (the provider as an `Organization`), `dateModified` (`meta.source.lastUpdated`), `spatialCoverage` (a `Place` named World with a whole-Earth `GeoShape` box) and `includedInDataCatalog` (the site's `/data-sources/` page). From its input it SHALL take `name`, `description`, `keywords`, `temporalCoverage` (`startYear/endYear`), `variableMeasured` and `isBasedOn` unchanged. `licenseUrl` (the versioned Creative Commons URL derived from the API's license name, the name itself otherwise) SHALL move into the same module. `buildCo2DatasetJsonLd` SHALL remain as a thin wrapper that supplies the CO2 fields and SHALL return the object it returned before the extraction, except that its `isBasedOn` source is a `CreativeWork` (see "Sources are declared as CreativeWork"). No `distribution` is produced. The generic `JsonLd` component is reused as is.

#### Scenario: CO2 output is unchanged

- **GIVEN** the input of the existing `co2StructuredData` suite
- **WHEN** `buildCo2DatasetJsonLd` runs
- **THEN** the result is deeply equal to the one produced before the extraction, except that the `isBasedOn` source has `@type` `CreativeWork`

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

## ADDED Requirements

### Requirement: Sources are declared as CreativeWork

Every entry of a page Dataset's `isBasedOn` SHALL be a schema.org `CreativeWork`, never a `Dataset`, so search engines do not validate another site's dataset as a Dataset item of this page. `apps/web/src/lib/datasetJsonLd.ts` SHALL export `buildSourceWork`, which every category builder uses for its sources: it SHALL produce `@type: 'CreativeWork'`, `name`, `publisher` (an `Organization` with `name` and, when known, `url`) and `url`, plus `version` and `citation` only when given. The page's own Dataset keeps `@type: 'Dataset'`.

#### Scenario: A source is a CreativeWork

- **WHEN** `buildSourceWork` is called with a name, a URL and a publisher
- **THEN** the result has `@type` `CreativeWork` and carries them
- **AND** it has no `version` or `citation` unless they were given

#### Scenario: No source is typed Dataset

- **WHEN** the Dataset of any category page is built
- **THEN** every `isBasedOn` entry has `@type` `CreativeWork`
