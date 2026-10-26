## MODIFIED Requirements

### Requirement: Attribution and methodology next to the chart

Next to the chart the page SHALL render a compact attribution: "Data:" followed by `SourceAttribution` fed with `meta.source` from the API (provider link and license — never hard-coded in the web app) and the provider's last update as a `<time dateTime>` formatted in UTC with `formatUtcDate`; then the upstream origin from `data.origin` through the generic origin credit (producer, title linked to its URL, license name linked to its deed, then `notice` and `disclaimer` when present); then a link to `/data-sources/`. The dataset name and version and the origin `citation` are not shown on the page (they are on `/data-sources/`). A methodology note SHALL state that the figures are annual CO2 emissions from fossil fuels and industry, that land-use change is not included, and that per-capita values divide by population.

#### Scenario: Attribution from the API

- **GIVEN** `meta.source` equal to the OWID publisher
- **WHEN** the page renders
- **THEN** a link named "Our World in Data" to `https://ourworldindata.org`, the text "(CC BY 4.0)" and the lead-in "Data:" are present beside the chart

#### Scenario: Dataset and date

- **WHEN** the page renders with the dataset fixture
- **THEN** the provider's last update date is shown and the dataset version is not

#### Scenario: Methodology note

- **WHEN** the page renders
- **THEN** the text states fossil fuels and industry only and that land-use change is excluded

#### Scenario: Link to all sources

- **WHEN** the page renders
- **THEN** it contains exactly one link to `/data-sources/` in the attribution block

#### Scenario: Upstream origin credit

- **GIVEN** `data.origin` for the Global Carbon Project
- **WHEN** the page renders
- **THEN** the attribution block shows "Global Carbon Project", a link named "Global Carbon Budget" to `https://globalcarbonbudget.org/` and the license "CC BY 4.0" linked to its deed
