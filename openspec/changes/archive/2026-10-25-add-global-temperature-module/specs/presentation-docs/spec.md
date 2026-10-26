## ADDED Requirements

### Requirement: Anomaly chart conventions are recorded in the design system

`docs/design-system.md` SHALL record, in the Presentation Stack section, the conventions the global temperature page establishes: anomalies are shown with an explicit sign and the real minus sign U+2212 in key figures, tooltips, tables and axes (2 decimals in text, at most 1 on the axis); a chart of values relative to a baseline draws a labelled reference line at zero in theme colors; a single-measure chart has no toggle; the anomaly line uses one categorical color, and encoding polarity with color (the divergent palette) remains pending; a source-credit line required by an upstream licence is rendered next to the data attribution from the API's payload. Chart rule 3 SHALL list the mark line among the modules every chart page registers. The statement that charts register line, grid, tooltip, legend and aria SHALL be updated accordingly. `docs/technical/libraries.md` SHALL record the measured gzipped cost of the mark line component and that the global temperature page is the second chart page.

#### Scenario: Conventions are written down

- **WHEN** the Presentation Stack section is read
- **THEN** it documents signed U+2212 formatting, the labelled zero reference line, the no-toggle rule for single-measure charts and the upstream credit line

#### Scenario: Divergent palette stays pending

- **WHEN** the Color Palettes section is read
- **THEN** the divergent palette is still marked pending and no divergent token is declared

#### Scenario: Registered modules are accurate

- **WHEN** chart rule 3 is read
- **THEN** it names the mark line among the registered modules

#### Scenario: Libraries catalogue records the cost

- **WHEN** `docs/technical/libraries.md` is read
- **THEN** it states the measured gzipped size added by registering the mark line component

### Requirement: Long-run chart conventions are recorded

`docs/design-system.md` SHALL additionally record: the confidence band technique (stacked invisible base plus low-opacity interval, series color through the theme, opacity only in the option); the rule that a reference threshold such as 1.5 °C is drawn as a labelled reference line and explained in text; below-the-fold charts render when they scroll into view (chart rule 5, now implemented by `RenderWhenVisible`); and that each upstream origin of a dataset is credited next to the chart it feeds, with license links and the notice text the license asks for, taken from the API.

#### Scenario: Conventions are written down

- **WHEN** the Presentation Stack section is read
- **THEN** it documents the confidence band technique, labelled threshold lines, the lazy below-the-fold rule and the origin credit next to the chart
