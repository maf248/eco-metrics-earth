## MODIFIED Requirements

### Requirement: Stacked area of one country's mix with a Share / Generation toggle

Below the key figures, `CountryExplorer` SHALL host the selected country's mix as a stacked area chart (ECharts `line` series with `areaStyle` and a shared `stack`), World selected by default through the country combobox. A measure toggle (the generic `MeasureToggle`, legend "Measure") SHALL offer "Share (%)" (default) and "Generation (TWh)". The chart option SHALL come from a pure builder with these properties: eight series in the fixed source order (coal at the bottom of the stack, bioenergy & other renewables at the top), named with the source labels, always all eight so that each source keeps its position and its colour whatever the data; opaque areas (`areaStyle.opacity` 1) so the rendered colours are the validated palette; the year axis from the shared `buildYearAxis` helper; a visible legend from `wrappedLegend` at the bottom, with `grid.bottom` reserving its height at every chart width; `tooltip` on the axis listing only the sources with a value above zero that year (`<share>%` or `<TWh> TWh`; `No data` when none has); no line outline and no hover emphasis (blurring other bands of an opaque stack reads as missing colour); `null` values left as gaps, never zeros; in "Share (%)" mode a value axis fixed to 0-100 with `%` labels, and in "Generation (TWh)" mode a value axis starting at 0, fitted to the data (`max: null`, which also clears the share mode's 100 when the toggle switches) with compact labels. The option SHALL name no colour: the chart SHALL use the energy mix palette (`palette="energyMix"`), selected through the chart wrapper. The chart title SHALL name the country and the measure (for example "Spain: share of electricity by source (%)"), and a polite live region SHALL announce the selection ("Showing share of electricity by source for Spain").

#### Scenario: World and share by default

- **WHEN** the page renders
- **THEN** the combobox shows World, "Share (%)" is checked and the chart title reads "World: share of electricity by source (%)"

#### Scenario: Eight stacked series in fixed order

- **WHEN** the option is built for any entity and either measure
- **THEN** it has eight `line` series sharing one `stack`, each with an area style, named Coal, Gas, Oil, Nuclear, Hydro, Wind, Solar and Bioenergy & other renewables, in that order

#### Scenario: Share axis is 0 to 100

- **WHEN** the option is built for the "Share (%)" measure
- **THEN** the value axis has `min` 0 and `max` 100 and its labels end with `%`

#### Scenario: Generation axis starts at zero

- **WHEN** the option is built for the "Generation (TWh)" measure
- **THEN** the value axis has `min` 0 and `max` `null` (fitted to the data, even after switching from "Share (%)"), and the series data are the entity's `generation` arrays (in "Share (%)" mode the series data are the derived shares)

#### Scenario: Missing values are gaps

- **GIVEN** an entity whose gas share is `null` in 2000
- **WHEN** the option is built
- **THEN** the gas series has `null` at the 2000 index

#### Scenario: Tooltip lists only sources that generated something

- **GIVEN** a year where gas is `0` and wind is `null`
- **WHEN** the axis tooltip is formatted
- **THEN** neither gas nor wind is listed; if no source has a value above zero it prints `No data`

#### Scenario: Options carry no colours

- **WHEN** the area and donut option builders run
- **THEN** the returned options contain no color property, `var(`, `oklch(`, `#` colour literal or `rgb` string (only an opacity is set)

#### Scenario: Legend always visible

- **WHEN** the chart renders
- **THEN** a legend naming all eight sources is shown, every entry visible at once without paging

#### Scenario: Switching the measure rebuilds the chart without a request

- **WHEN** the user selects "Generation (TWh)"
- **THEN** the chart title, the axis and the series change, the live region announces it and no network request is made

#### Scenario: Selecting another country

- **WHEN** the user selects Argentina in the combobox
- **THEN** the chart title, the donut and both tables show Argentina

### Requirement: Donut of the latest year's mix for the selected country

Below the stacked chart, inside the same explorer card and driven by the same selection, the page SHALL render a donut (ECharts `pie` with an inner radius) of the selected country's mix in its latest year (as defined above), with no year selector and no dependence on the measure toggle (slice sizes are shares). Its heading SHALL name the country and the year (for example "Spain: electricity mix in 2024"). The option SHALL come from a pure builder: eight data items always present in the fixed source order, so that each source keeps its colour; a source without a value has `value: null` (no slice, `No data` in the tooltip); labels on the slices hidden (the legend and the table carry the names); a visible legend from `wrappedLegend` at the bottom, the pie laid out in a box 14 px from the top of the chart and 17 px above the legend at every chart width, the ring filling that box (`radius` `['56%', '100%']`); a tooltip showing the source, the share in `%` and the generation in TWh (for example "Coal: 33.0% (10,472 TWh)"); and no colours. The donut SHALL use the energy mix palette. It SHALL be mounted with `RenderWhenVisible` (a same-height skeleton, including in the server-rendered HTML, until it scrolls near the viewport) and loaded through a dedicated lazy entry that registers ECharts' `PieChart` where it is used, so the pie code never ships to pages without a donut. A polite live region SHALL announce the selection change.

#### Scenario: Latest year of the selected entity

- **GIVEN** Algeria, whose latest generation is 2024 although the payload `endYear` is 2025
- **WHEN** Algeria is selected
- **THEN** the donut heading says "Algeria: electricity mix in 2024"

#### Scenario: Eight items in fixed order

- **WHEN** the donut option is built
- **THEN** its single `pie` series has eight data items named Coal ... Bioenergy & other renewables in the fixed order, with an inner radius greater than 0

#### Scenario: A source without data keeps its slot

- **GIVEN** an entity with no gas generation in its latest year
- **WHEN** the option is built
- **THEN** the gas item has `value: null`, and the remaining items keep their positions

#### Scenario: The accessible description never reads NaN

- **GIVEN** an entity with a source without a value
- **WHEN** the donut or the stacked area option is built and rendered
- **THEN** its `aria.label.description` names the entity (and for the donut each source with its share or "no data"), and the chart container's `aria-label` contains no "NaN"

#### Scenario: Tooltip shows percentage and TWh

- **WHEN** the tooltip formatter runs for Coal with share 32.96 and generation 10471.53
- **THEN** it returns text containing "Coal", "33.0%" and "10,472 TWh"

#### Scenario: Rendered only when visible

- **GIVEN** an `IntersectionObserver` that has not reported an intersection
- **WHEN** the explorer renders
- **THEN** the donut area shows a skeleton of the chart's height and the pie chart is not mounted

#### Scenario: Mounted on intersection

- **WHEN** the observer reports an intersection
- **THEN** the pie chart mounts and renders an SVG

#### Scenario: Pie is registered where used

- **WHEN** the module graph of the cartesian chart wrapper (`LazyEChart`) is inspected
- **THEN** it does not import `PieChart`; the donut's lazy entry registers it

#### Scenario: Synced with the selector

- **WHEN** the user changes the country
- **THEN** the donut heading, slices and table change to that country's latest year without a request
