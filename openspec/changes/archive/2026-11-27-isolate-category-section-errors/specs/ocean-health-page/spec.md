## MODIFIED Requirements

### Requirement: Each section degrades independently

Each section SHALL render through `ProviderBackedContent` under its own heading, so a provider outage shows the stale notice or the unavailable state for that section only. A section whose read fails for any other reason SHALL be hidden entirely (see `category-page-registry`).

#### Scenario: One provider unavailable

- **GIVEN** the NOAA LSA read resolves `provider-unavailable` and the others resolve data
- **WHEN** the page renders
- **THEN** the sea level section shows the unavailable state naming NOAA Laboratory for Satellite Altimetry under its heading
- **AND** the other sections and the key figures render normally and the page does not throw

#### Scenario: Copernicus unavailable

- **GIVEN** the Copernicus read resolves `provider-unavailable`
- **WHEN** the page renders
- **THEN** the daily chart's slot shows one unavailable state and no daily chart section is rendered
- **AND** the key figures panel shows the other three figures and the other four sections render

#### Scenario: Stale section

- **GIVEN** the OWID anomaly payload is stale and 14 days old
- **WHEN** the page renders
- **THEN** the stale notice appears above that section only

#### Scenario: Copernicus freshness override

- **GIVEN** a stale Copernicus payload 3 days old
- **WHEN** the page renders
- **THEN** the stale notice appears once above the daily chart (silent threshold of 2 days), and the SST figure still names its own date

#### Scenario: Our own BFF failing still throws

- **GIVEN** every section read fails for a reason other than a provider outage
- **WHEN** the page loads
- **THEN** the error propagates as in every other category

#### Scenario: One section read fails

- **GIVEN** the sea level read rejects for a reason other than a provider outage and the others resolve data
- **WHEN** the page renders
- **THEN** no sea level section (heading or content) and no sea level key figure is rendered
- **AND** the other sections and figures render normally and the page does not throw

#### Scenario: Healthy providers show no degraded UI

- **WHEN** the page renders with all payloads fresh
- **THEN** no `stale-data-notice` and no `data-unavailable` element exists
