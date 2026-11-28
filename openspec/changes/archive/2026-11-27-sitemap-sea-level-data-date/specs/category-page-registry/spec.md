## MODIFIED Requirements

### Requirement: Registry entries declare their data date

`CategoryPageDefinition` SHALL accept an optional `lastModified: (data: T) => string | undefined` returning the ISO 8601 date the shown data last changed: `meta.source.lastUpdated`, unless a section declares `dataDate`. `defineProviderCategoryPage` SHALL derive it from the state's payload and return `undefined` for a state without payload. `ProviderSectionOptions` SHALL accept an optional `dataDate: (payload: P) => string | undefined` for a provider whose `meta.source.lastUpdated` is the retrieval time rather than an upstream update date; a section that declares it is dated by it instead of its meta. `defineSectionedProviderCategoryPage` SHALL return the latest date across the sections that have a payload, or `undefined` when none has. The `ocean-health` sea level section (NOAA LSA, which publishes no update date) SHALL declare its last observation, `data.endDate`. `lib/categoryPages.tsx` SHALL export `getCategoryLastModified(category): Promise<Date | undefined>`, which reads the category through `loadCategoryData` and its definition's `lastModified`, and resolves to `undefined` when the category has no entry, no `lastModified`, an unparseable date, or when the read rejects.

#### Scenario: A provider-backed category reports its payload date

- **GIVEN** a provider-backed entry whose payload has `meta.source.lastUpdated` `2026-11-20T00:00:00.000Z`
- **WHEN** `getCategoryLastModified` is called for it
- **THEN** it resolves to that date

#### Scenario: A sectioned category reports its latest section date

- **GIVEN** a sectioned entry whose sections were last updated on `2026-10-01` and `2026-11-15`, and a third section unavailable without payload
- **WHEN** its `lastModified` is evaluated
- **THEN** it returns the `2026-11-15` date

#### Scenario: A failed read has no date

- **GIVEN** a registered category whose read rejects
- **WHEN** `getCategoryLastModified` is called for it
- **THEN** it resolves to `undefined` and does not reject

#### Scenario: A category without dated data has no date

- **WHEN** `getCategoryLastModified` is called for `water-footprint`
- **THEN** it resolves to `undefined`

#### Scenario: A section dated by its data, not its retrieval

- **GIVEN** the `ocean-health` entry whose only section with a payload is sea level, with `data.endDate` `2025-02-15` and a `meta.source.lastUpdated` set to the retrieval time
- **WHEN** its `lastModified` is evaluated
- **THEN** it returns `2025-02-15`
