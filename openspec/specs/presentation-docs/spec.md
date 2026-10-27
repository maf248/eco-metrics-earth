# presentation-docs Specification

## Purpose

Defines the documentation that governs how data is presented in `apps/web`: `docs/design-system.md` as the single source of truth for theming, palettes, typography, spacing, visualization heuristics and accessibility, and `docs/technical/libraries.md` as the research catalogue of charting/mapping/table candidates. Also defines who reads them and when, and that they outrank an agent's general knowledge.

## Requirements

### Requirement: Design system doc exists and declares its own authority

`docs/design-system.md` SHALL exist and contain, at minimum, the following sections, each populated with real, currently-true content where the fact already exists in the codebase or has been decided, and explicitly marked as pending where it has not:

- Purpose
- Theme rules (class-based `.dark`, Tailwind v4, current token approach)
- Categorical, sequential, and divergent color palettes for light and dark themes (each one either recorded with its light/dark values and validation method, or marked pending)
- Typography
- Spacing
- Visualization heuristic table
- Accessibility
- Presentation stack (the decided libraries and their usage rules, with anything still undecided marked pending)

#### Scenario: Doc has all required sections

- **GIVEN** `docs/design-system.md`
- **WHEN** the document is read
- **THEN** all eight sections listed above are present as headings, in order

#### Scenario: Doc states that it outranks an agent's general knowledge

- **GIVEN** `docs/design-system.md`
- **WHEN** its Purpose section is read
- **THEN** it states that the document takes precedence over an agent's general knowledge
- **AND** it identifies `docs/technical/libraries.md` as research rather than decisions

#### Scenario: Presentation stack section is marked pending

- **GIVEN** `docs/design-system.md`
- **WHEN** the "Presentation stack" section is read
- **THEN** every library category it has not decided (charts, maps, or tables) is marked pending
- **AND** it references `docs/technical/libraries.md` as the source of the eventual decision

#### Scenario: Presentation stack section records the decision

- **GIVEN** `docs/design-system.md`
- **WHEN** the "Presentation stack" section is read
- **THEN** it names Apache ECharts 6 as the library for charts and maps
- **AND** it marks the table library as pending
- **AND** it references `docs/technical/libraries.md` for the evidence behind the decision

### Requirement: Presentation facts live in the design system doc

The presentation-relevant facts about the codebase SHALL be recorded in `docs/design-system.md` as the single source of truth, and SHALL NOT be duplicated into agent definitions or component comments. Every copy is a place that can drift out of sync with the codebase silently, while still reading as authoritative.

The facts recorded in `docs/design-system.md` SHALL include:

- `apps/web` uses Next.js 16 (App Router), React 19, and Tailwind CSS v4.
- Dark mode is class-based: `apps/web/src/app/globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))`, and `ThemeProvider`/a blocking inline script toggle the `dark` class on `<html>`.
- Theming is expressed through semantic color tokens (see the `design-tokens` capability): raw custom properties on `:root`, overridden under `.dark`, and exposed through `@theme inline`, so a single utility per role covers both themes. The doc lists every token with its role and light/dark values, plus the documented `dark:` exceptions.
- Eco-category icon components in `apps/web/src/components/icons/` are intentionally multicolor with hardcoded fills; per the `light-mode-styling` capability, they MUST NOT be recolored or tinted per theme. Contrast fixes must add separation without altering the SVG's own colors.
- The project's SEO/accessibility baseline: semantic HTML, descriptive titles/meta descriptions, trailing-slash canonical URLs, and accessible markup verified via `@axe-core/playwright` E2E coverage.

#### Scenario: Design system doc records the current theming mechanism

- **GIVEN** `docs/design-system.md`
- **WHEN** its Theme Rules section is read
- **THEN** it describes theming as semantic color tokens declared in `globals.css` that switch value under `.dark`, consumed as single utilities
- **AND** it contains a token table (role, light value, dark value) and the list of remaining `dark:` exceptions

#### Scenario: Design system doc preserves the icon color constraint

- **GIVEN** `docs/design-system.md`
- **WHEN** its guidance on category icons is read
- **THEN** it states that eco-category icons keep their hardcoded multicolor fills and that contrast fixes must not recolor them

### Requirement: Visualization heuristics live in the design system doc

The heuristic table mapping data shape to presentation pattern SHALL be recorded in `docs/design-system.md`, independent of any specific charting/mapping/table library:

- Time series → line or area chart
- Composition (parts of a whole) → stacked bar or donut chart
- Per-country comparison → horizontal bar chart or choropleth map
- Rankings → sorted horizontal bar chart
- Browse/filter of many records → table

#### Scenario: Heuristic table is present and library-agnostic

- **GIVEN** `docs/design-system.md`
- **WHEN** its Visualization Heuristics section is read
- **THEN** all five data-shape-to-pattern mappings above are present
- **AND** no specific library name appears in the table

### Requirement: Library candidates are catalogued as research, not decisions

`docs/technical/libraries.md` SHALL catalogue the charting, mapping, and table library candidates for `apps/web`, the options that were ruled out and why, the technical constraints to verify before committing to any of them, and the evidence gathered when a decision was made. It SHALL be explicitly marked as research. Decisions SHALL be recorded only in the "Presentation Stack" section of `docs/design-system.md`, and no library from the catalogue SHALL be installed until that section records it as decided.

#### Scenario: Catalogue is marked as research

- **GIVEN** `docs/technical/libraries.md`
- **WHEN** the document is read
- **THEN** it states that it is research and that decisions live in the Presentation Stack section of `docs/design-system.md`
- **AND** it records, for each ruled-out option, the reason it was excluded

#### Scenario: No presentational library is installed while the stack is pending

- **GIVEN** the "Presentation Stack" section of `docs/design-system.md` marks a library category (charts, maps, or tables) as pending
- **WHEN** `apps/web/package.json` is inspected
- **THEN** it contains no library of that category from the catalogue

### Requirement: The workflow docs state who reads the presentation docs and when

`AGENTS.md` SHALL contain a section naming `docs/design-system.md` as the single source of truth for presentation and `docs/technical/libraries.md` as research, stating that `@coder` reads the design system before implementing a UI-bearing change and `@reviewer` audits against it, and stating that both documents outrank an agent's general knowledge. Because `CLAUDE.md` and `.opencode/agents/orchestrator.md` mirror the project's working rules, they SHALL carry a condensed form of the same rule.

#### Scenario: AGENTS.md states the reading obligations

- **GIVEN** `AGENTS.md`
- **WHEN** its presentation-docs section is read
- **THEN** it names both documents and what each one is for
- **AND** it states that `@coder` reads the design system before implementing a UI-bearing change
- **AND** it states that the docs outrank an agent's general knowledge

#### Scenario: Workflow mirrors stay synchronized

- **GIVEN** `AGENTS.md`, `CLAUDE.md`, and `.opencode/agents/orchestrator.md`
- **WHEN** their presentation rules are compared
- **THEN** none of them contradicts the others about which document is authoritative or who reads it

#### Scenario: A new presentation decision updates the design system

- **GIVEN** a change that establishes a new presentation convention
- **WHEN** the change is implemented
- **THEN** `docs/design-system.md` is updated in that same change rather than leaving the convention only in code

### Requirement: Chart and map conventions live in the design system doc

The conventions that make the chosen chart library fit the codebase SHALL be recorded in the Presentation Stack section of `docs/design-system.md`, so the first and every later chart follows them instead of re-deciding them:

- Chart colors come only from the chart and semantic tokens, delivered to ECharts as a theme built from the tokens; chart options never name a color.
- Charts are loaded lazily with a same-height skeleton, and their data is also available as a table or text equivalent.
- The jsdom testing setup the library requires is documented.

#### Scenario: Chart rules are present

- **GIVEN** `docs/design-system.md`
- **WHEN** its Presentation Stack section is read
- **THEN** it states that chart options carry no colors and that colors reach ECharts through a theme built from the tokens
- **AND** it states that charts load lazily with a skeleton of the same height
- **AND** it states that every chart is paired with a table or text equivalent of its data
- **AND** it documents the Jest configuration ECharts needs under jsdom

### Requirement: Country flags are a recorded presentation decision

`docs/design-system.md` SHALL record, in the Presentation Stack section, that country flags are rendered with the `flag-icons` package (MIT, exact version pinned in `apps/web`, SVG flags selected through CSS classes), never with emoji, and why (emoji flags render as two letters on Windows). It SHALL record the usage rules: the stylesheet is imported only by the flag component (so it loads only on pages that show flags); flags are decorative (`aria-hidden`) next to the country name; flags in long lists are rendered lazily because every rendered flag is a separate image request; World is shown with a monochrome globe icon, not a flag; flags are images and are not subject to the color-token rules. `docs/technical/libraries.md` SHALL catalogue the flag candidates with the measured weights of `flag-icons` (stylesheet size, number and total size of the 4:3 SVGs, the largest file) and mark alternatives not evaluated as such.

#### Scenario: Design system records the flags decision

- **GIVEN** `docs/design-system.md`
- **WHEN** its Presentation Stack section is read
- **THEN** it names `flag-icons` with its pinned version, states that emoji are not used and why, and lists the usage rules above

#### Scenario: Libraries catalogue records the research

- **GIVEN** `docs/technical/libraries.md`
- **WHEN** it is read
- **THEN** it lists `flag-icons` as chosen with its measured asset weights, and lists any other candidate as not evaluated

#### Scenario: Installed version matches the docs

- **WHEN** `apps/web/package.json` and `docs/design-system.md` are compared
- **THEN** the `flag-icons` version is identical and exact (no range)

### Requirement: Chart tokens and first-chart conventions are recorded as implemented

Once the categorical chart tokens are declared, `docs/design-system.md` SHALL state in the Color Palettes section that the first change that renders a chart adds the categorical tokens and the sequential ramp is added by the first change that uses it, that the categorical tokens are declared in `globals.css`, that the theme adapter reads them by name, and that `designTokens.test.ts` recognizes them as used. The Presentation Stack section SHALL record the conventions this change established beyond the chart rules: charts show one entity at a time with a selector scoped to the chart (no URL state), the searchable country combobox follows the WAI-ARIA combobox pattern with the keyboard model and touch-target sizes implemented, key figures are server-rendered text derived from the same payload as the chart, and the collapsible data table is the text equivalent required by chart rule 7. `docs/technical/libraries.md` SHALL record the result of exercising the first real chart in all five Playwright projects, closing the gate left open by the spike.

#### Scenario: Color Palettes no longer says "not declared yet"

- **GIVEN** `docs/design-system.md` after the change
- **WHEN** the Color Palettes section is read
- **THEN** it states the chart tokens are declared and consumed by the adapter, and no longer says they are pending

#### Scenario: Conventions are written down

- **WHEN** the Presentation Stack section is read
- **THEN** it documents the chart-scoped selector without URL state, the combobox keyboard model, server-rendered key figures and the data table as the chart's text equivalent

#### Scenario: Five-project gate is recorded

- **GIVEN** `docs/technical/libraries.md`
- **WHEN** the section on remaining gates is read
- **THEN** it states the outcome of the chart interaction run across the five Playwright projects

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

### Requirement: The energy mix palette and composition-chart conventions are recorded

`docs/design-system.md` SHALL record, in the same change that introduces them: (1) under Color Palettes, a new "Energy mix (light / dark)" table listing the eight `--energy-*` tokens in stacking order (coal, gas, oil, nuclear, hydro, wind, solar, bioenergy & other renewables) with their hue, semantic role and light and dark hex values, and the statement that the palette is semantic, separate from `--chart-1…8`, used for electricity sources only, read by the theme adapter by name (`palette="energyMix"`), not mapped in `@theme inline`, and assigned in this fixed order, never cycled or reordered; (2) the validation method and its results: the same checks as the categorical palette (OKLCH lightness band and chroma floor, adjacent-pair OKLab ΔE×100 under protanopia/deuteranopia/tritanopia simulation and unsimulated, WCAG contrast against the real surfaces), the thresholds used, the measured worst adjacent-pair values per theme, the deliberate exceptions (the neutral chroma of coal, the wider lightness band that charcoal and amber need, contrast below 3:1 for gas, wind and solar on white) and the known limitation that non-adjacent pairs are not separated by colour alone; (3) under Presentation Stack, the composition-chart conventions: a stacked area and a donut share one palette and one source order; every source is always present in the option so colour follows the entity; stacked areas are opaque so rendered colours equal the validated ones; the percentage axis is fixed to 0-100; the donut shows the selected country's latest year with no year selector, is deferred with `RenderWhenVisible` and registers the pie chart where it is used; a text table accompanies each chart (the year table follows the measure toggle); a missing value is `null`, shown as a gap, a dash or "No data" and never as zero; the measure toggle is the generic `MeasureToggle`; and the wrap-around neighbour of a donut (last source next to first) is part of the palette validation. The "few charts per page" rule SHALL be restated with this page as an example of two charts, one deferred.

#### Scenario: The energy palette table matches the stylesheet

- **WHEN** the "Energy mix" table in `docs/design-system.md` is compared with the `--energy-*` declarations in `globals.css`
- **THEN** both contain the same eight names with the same light and dark values, in the same order

#### Scenario: Validation results are recorded

- **WHEN** the Color Palettes section is read
- **THEN** it states the thresholds, the worst adjacent-pair ΔE under each simulated deficiency and unsimulated, in light and dark, and the recorded exceptions

#### Scenario: Composition conventions are findable

- **WHEN** the Presentation Stack section is read
- **THEN** it states that stacked areas are opaque, that the percentage axis is 0-100, that every source is always present in the option, that the donut registers `PieChart` where it is used, and that missing values are never drawn as zero

#### Scenario: The doc stays the single source of truth

- **WHEN** the design-system doc is read after this change
- **THEN** it does not mark the energy mix palette as pending and does not contradict the categorical palette section
