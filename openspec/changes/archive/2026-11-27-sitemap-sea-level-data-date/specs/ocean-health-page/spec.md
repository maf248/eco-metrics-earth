## MODIFIED Requirements

### Requirement: One Dataset JSON-LD credits every provider and origin present

The page SHALL declare exactly one schema.org `Dataset` in JSON-LD, built from the sections present, whose `isBasedOn` (typed `CreativeWork`) credits every provider and origin of those sections. Its `dateModified` SHALL be the latest data date of those sections, the sea level section counting its last observation (`data.endDate`), because NOAA LSA publishes no update date and its `meta.source.lastUpdated` is the API's retrieval time.

#### Scenario: All sections present

- **WHEN** the structured data is built from five sections
- **THEN** `isBasedOn` includes Copernicus Climate Pulse and C3S/ECMWF, Our World in Data as processor, Met Office HadSST, NOAA NCEI, the US EPA, IAP, MRI/JMA, CSIRO, NOAA Laboratory for Satellite Altimetry and the Hawaii Ocean Time-series (SOEST), and `variableMeasured` has one entry per section

#### Scenario: From present sections only

- **GIVEN** the sea level section is unavailable
- **WHEN** the structured data is built
- **THEN** `isBasedOn` has no NOAA LSA entry and `variableMeasured` has no sea level variable

#### Scenario: Nothing present

- **GIVEN** every section is unavailable
- **WHEN** the page renders
- **THEN** no JSON-LD is rendered

#### Scenario: Sea level is dated by its data

- **GIVEN** only the sea level section, with `data.endDate` `2025-02-15` and a retrieval-time `meta.source.lastUpdated`
- **WHEN** the structured data is built
- **THEN** `dateModified` is `2025-02-15`
