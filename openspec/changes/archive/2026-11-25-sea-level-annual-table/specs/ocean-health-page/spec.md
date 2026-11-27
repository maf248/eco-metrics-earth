## MODIFIED Requirements

### Requirement: Every chart has a data table disclosure

Under every chart a collapsed `DataTableDisclosure` SHALL give its text equivalent, using `YearDataTable` for year-keyed data and a new generic `RowDataTable` for date-keyed data.

#### Scenario: Every chart has one

- **WHEN** the page is rendered
- **THEN** there are five "View data table" disclosures, each with a distinct accessible description and a keyboard-focusable scroll region, server-rendered for the default selection

#### Scenario: Daily table is bounded

- **GIVEN** a payload whose `recent` holds 90 rows
- **WHEN** the daily section renders
- **THEN** its table has 90 body rows, newest first (Date, SST, Anomaly, 1991–2020 average, Status), and a note "Showing the most recent 90 days"

#### Scenario: Table follows the toggle

- **WHEN** the user selects the 0–2000 m depth
- **THEN** the table's columns are the three 0–2000 m sources

#### Scenario: Sea level and pH tables

- **WHEN** those sections render
- **THEN** the sea level table lists one row per year with one column per mission (the yearly average of its observations, an em dash where the mission did not observe) and the pH table every monthly row (Date, Monthly, Yearly average), newest first
- **AND** the sea level caption says a year a mission only partly covered averages the observations it has

#### Scenario: Null is an em dash

- **GIVEN** a `null` rolling average
- **WHEN** the pH table renders
- **THEN** the cell shows an em dash
