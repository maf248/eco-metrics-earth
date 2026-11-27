## MODIFIED Requirements

### Requirement: Each section degrades independently

Each section SHALL be rendered through `ProviderBackedContent` from its own `ProviderPageState` using the default freshness thresholds (silent up to 7 days, stale notice from 7 to 30 days, unavailable after 30 days or on a provider `502`). The stale notice for the `forestArea` state SHALL show once above the explorer; its unavailable state SHALL replace the explorer and the change card with one `DataUnavailable` under the "Forest area" heading. The stale notice and unavailable state of the `treeCoverLoss` state SHALL appear only in the cause card. The methodology note SHALL be unaffected by either state. A section whose read fails for any other reason than a provider `502` SHALL be hidden entirely, and the page SHALL throw only when both reads fail (see `category-page-registry`).

#### Scenario: Tree cover loss unavailable

- **GIVEN** the `tree-cover-loss` endpoint answers `502` and `forest-area` answers `200`
- **WHEN** `/deforestation/` renders
- **THEN** the key figures, explorer, map and ranking render normally
- **AND** the cause card shows the unavailable state under its heading with no chart

#### Scenario: Forest area unavailable

- **GIVEN** the `forest-area` endpoint answers `502` and `tree-cover-loss` answers `200`
- **WHEN** `/deforestation/` renders
- **THEN** no key figures, explorer, map or ranking render, one unavailable state appears under "Forest area", and the cause card renders normally

#### Scenario: Stale forest area

- **GIVEN** the `forest-area` payload is stale and 10 days old
- **WHEN** the page renders
- **THEN** one stale notice appears above the explorer and the data is shown

#### Scenario: Both unavailable leaves no JSON-LD

- **GIVEN** both sections are unavailable
- **WHEN** the page renders
- **THEN** no `Dataset` JSON-LD is rendered

#### Scenario: Own BFF failure

- **GIVEN** the BFF is unreachable
- **WHEN** the page renders
- **THEN** the render throws as for other categories

#### Scenario: Tree cover loss read fails

- **GIVEN** the `tree-cover-loss` read rejects for a reason other than a provider `502` and `forest-area` answers `200`
- **WHEN** `/deforestation/` renders
- **THEN** the key figures, explorer, map and ranking render normally
- **AND** no cause card is rendered and the page does not throw
