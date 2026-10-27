## ADDED Requirements

### Requirement: A generic measure toggle

`apps/web/src/components/MeasureToggle.tsx` (a Client Component) SHALL render the radio group that switches between two or more measures of a chart: a `fieldset` with a `legend` (given as a prop, "Measure" on both current pages), one visually hidden `input type="radio"` per option sharing a generated `name`, and a label styled as a segmented button with `min-h-11`, `text-base`, a visible focus ring and the checked state shown by background and text colour tokens. It SHALL accept `legend`, `options` (`{ value, label }[]`), `value` and `onChange`, hold no state of its own and know no category. The CO2 explorer SHALL be rebuilt on it with identical output, and the energy sources explorer SHALL use it for "Share (%)" / "Generation (TWh)".

#### Scenario: Options render as radios

- **WHEN** the toggle renders with two options and `value` set to the first
- **THEN** the group is named by its legend, the first radio is checked and each radio has a label with the option's text

#### Scenario: Selection calls back

- **WHEN** the user selects the second option
- **THEN** `onChange` is called with its value and the component does not change its own state

#### Scenario: Keyboard

- **WHEN** the user focuses the group and presses the arrow keys
- **THEN** the radio selection moves as for any native radio group and a focus ring is visible on the focused option

#### Scenario: CO2 output is unchanged

- **WHEN** the existing CO2 component tests run
- **THEN** they pass with the same assertions on the "Measure" group, the "Total" and "Per capita" labels and their behavior

## MODIFIED Requirements

### Requirement: A generic year table is the text equivalent of a chart

`apps/web/src/components/YearDataTable.tsx` SHALL render the collapsed `<details>` with the summary "View data table", the focus-ring styling, a keyboard-focusable scrollable region labelled `Data table for <entity name>, scrollable`, and a table with the given caption, a `Year` column header and one column per given definition `{ header, values, format }`, rows from `endYear` to `startYear`, `scope` on every header, and an em dash where a value is `null`. It SHALL be collapsed by default. It SHALL accept an optional `wide` flag for tables with many columns: when set, the table takes a larger minimum width (so its columns keep readable widths and the scroll region scrolls horizontally on narrow viewports instead of squeezing them); when unset, the markup and classes are exactly those of the default. The CO2 data table SHALL be rebuilt on it with identical output.

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
- **THEN** the table's minimum width class is larger than the default one and the other behavior (collapsed, labelled region, `tabIndex` 0, rows, em dashes) is unchanged

#### Scenario: Default tables are unchanged

- **GIVEN** the `wide` flag unset
- **WHEN** the table renders
- **THEN** its markup equals the markup it had before this change
