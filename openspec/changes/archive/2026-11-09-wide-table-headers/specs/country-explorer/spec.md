## MODIFIED Requirements

### Requirement: A generic year table is the text equivalent of a chart

`apps/web/src/components/YearDataTable.tsx` SHALL render the collapsed `<details>` with the summary "View data table", the focus-ring styling, a keyboard-focusable scrollable region labelled `Data table for <entity name>, scrollable`, and a table with the given caption, a `Year` column header and one column per given definition `{ header, values, format }`, rows from `endYear` to `startYear`, `scope` on every header, and an em dash where a value is `null`. It SHALL be collapsed by default. It SHALL accept an optional `wide` flag for tables with many columns: when set, the text of each value header wraps at a narrow maximum width (so a long header such as "Bioenergy & other renewables (%)" takes two lines instead of widening its column and leaving a gap) and the table takes a larger minimum width that fits the desktop card (so it does not scroll there, the headers stay on two lines, and the scroll region scrolls horizontally on narrower viewports instead of squeezing them); when unset, the markup and classes are exactly those of the default. The CO2 data table SHALL be rebuilt on it with identical output.

#### Scenario: Rows newest first with em dash for gaps

- **GIVEN** a column whose 1951 value is `null`
- **WHEN** the table renders
- **THEN** the first body row is `endYear` and the 1951 cell shows an em dash

#### Scenario: Column definitions drive the table

- **GIVEN** two column definitions
- **WHEN** the table renders
- **THEN** it has three column headers (`Year` plus the two) with `scope="col"` and each cell uses its column's `format`

#### Scenario: Collapsed and labelled

- **WHEN** the table renders
- **THEN** the `<details>` is not open and the scroll region has `tabIndex` 0 and the label `Data table for <entity name>, scrollable`

#### Scenario: CO2 table output is unchanged

- **WHEN** the existing CO2 component tests run
- **THEN** they pass with the same assertions on caption, headers, row order, "< 0.01" and em dashes

#### Scenario: Wide tables keep their column widths

- **GIVEN** eight column definitions and `wide` set
- **WHEN** the table renders
- **THEN** the table's minimum width class is larger than the default one, the text of each value header is capped in width, and the other behavior (collapsed, labelled region, `tabIndex` 0, rows, em dashes) is unchanged

#### Scenario: Default tables are unchanged

- **GIVEN** the `wide` flag unset
- **WHEN** the table renders
- **THEN** its markup equals the markup it had before this change

#### Scenario: The energy table fits the desktop card

- **GIVEN** the energy sources year table at a 1280 px viewport
- **WHEN** it is opened
- **THEN** the table is no wider than its scroll region and its header row is two lines tall
