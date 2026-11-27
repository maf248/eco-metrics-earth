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

### Requirement: The stale notice and unavailable state patterns are recorded

`docs/design-system.md` SHALL document, in the same change that introduces them: the three warning tokens in the Color Tokens table (with contrast ratios); the stale notice pattern (banner above the section content, copy, `role="status"`, shown only between the silent and unavailable thresholds, date through the UTC formatter); the unavailable state pattern (replaces only the section content, header and source attribution stay, neutral tone with the warning icon rather than error red, `role="status"` not `alert`, no retry button because ISR retries server-side, optional last-retrieved line only when a date is known); and the default thresholds (7 and 30 days) with the note that a category may override them in the page registry.

#### Scenario: Tokens and patterns are present

- **WHEN** `docs/design-system.md` is read
- **THEN** it lists `warning-surface`, `warning-line` and `warning-fg`, and has sections for the stale notice and the unavailable state with the rules above

#### Scenario: Thresholds are recorded

- **WHEN** the document is searched for the thresholds
- **THEN** it states the 7-day and 30-day defaults and the per-category override

### Requirement: World map conventions are recorded in the design system

`docs/design-system.md` SHALL record, as implemented: the sequential palette as a five-step yellow-to-red ramp with its light and dark values, validation results and recorded exceptions (multi-hue by decision; light low end below 2:1, compensated by outlines, legend and table); the no-data color; the map geometry decision (pre-projected hybrid Natural Earth asset generated by a script, codes resolved at generation time); that the map box takes the map's own aspect ratio because ECharts stretches a map to a box with all four sides set; the map controls by viewport; inert no-data regions; the HTML legend with labels under swatches; and the year slider and ranking table patterns. `docs/technical/libraries.md` SHALL record the map questions as closed with the spike evidence. The roadmap SHALL no longer list the world map item.

#### Scenario: Nothing about maps is pending

- **WHEN** a reader looks up the map geometry source, resolution, crosswalk, delivery or the no-data fill
- **THEN** `docs/design-system.md` states each as decided and `docs/technical/libraries.md` holds the evidence

### Requirement: The multi-provider page and overlay conventions are recorded

`docs/design-system.md` SHALL record, in the same change, the presentation decisions this change establishes.

#### Scenario: Chart conventions

- **WHEN** `docs/design-system.md` is read
- **THEN** it documents the muted series role (token, opacity, series flag), the multi-year overlay chart (muted and silent earlier years, highlighted current and record years, dashed climatology, legend limited to highlighted series plus a sentence for the grey lines, no symbols) and the pH marker-plus-line convention with the reason its value axis does not start at zero

#### Scenario: Page conventions

- **WHEN** `docs/design-system.md` is read
- **THEN** it documents per-section degraded states on a multi-provider page (stale notice per section, unavailable state under the section's own heading, one shared state for the key figures and chart fed by the same provider), date-keyed tables (`RowDataTable`) with the bounded daily table and its note, the region and depth toggles as `MeasureToggle`, and the end date derived from the data for a non-current feed

#### Scenario: Degraded-states intro

- **WHEN** the "Degraded provider states" section is read
- **THEN** it no longer says OWID is the only provider-backed source, and no color literal appears for the new decisions

### Requirement: Structure and recipe docs reflect the new providers

`AGENTS.md` SHALL describe the new modules and the multi-provider recipe.

#### Scenario: AGENTS.md

- **WHEN** `AGENTS.md` is read
- **THEN** its structure tree lists the two provider modules, `common/envelope/`, the ocean-health folders and `RowDataTable`, its "E2E never reaches live providers" note covers the Copernicus and NOAA LSA fixture routes, and its recipe mentions sectioned pages for multi-provider categories

### Requirement: Data source docs and roadmap matrix are updated

`docs/data-sources/ocean-health.md` and the ocean-health row of the `ROADMAP.md` coverage matrix SHALL name the providers actually used.

#### Scenario: Data source doc

- **WHEN** `docs/data-sources/ocean-health.md` is read
- **THEN** it lists Copernicus Climate Pulse, the four OWID charts and NOAA LSA as in use, notes that OWID `sea-level` stops at 2020-Q4 and `coral-bleaching-events` at 2016, and marks the FAO fish-stock charts (CC BY-NC-SA) and Sea Around Us (CC BY-NC) as not commercial-safe

#### Scenario: Roadmap matrix row

- **WHEN** the provider coverage matrix of `ROADMAP.md` is read
- **THEN** the ocean-health row names the three providers used and the initial metrics, in the document's language, with no item IDs added

#### Scenario: Other docs

- **WHEN** `README.md`, `apps/web/README.md` and `docs/data-sources/*` are read
- **THEN** any list of live categories, providers or data sources includes the new ones, cross-links stay valid, and `CHANGELOG.md` is untouched

### Requirement: The divergent palette and the deforestation conventions are recorded

`docs/design-system.md` SHALL replace the pending "Divergent" subsection with the implemented palette: the seven `--chart-div-*` tokens with light and dark values, the class breaks of the forest change map (below -50, -50 to -25, -25 to -5, -5 to +5, +5 to +25, +25 to +50, +50 or more, in percent), the validation results and recorded exceptions, and the rule that polarity encoded by color is always doubled by signed legend text, signed tooltip and a signed table. It SHALL record, as implemented: the map without a year slider for a single comparison; the line chart whose value axis follows the data with a subtitle saying so (chart rule 12); the stacked bar chart of seven drivers on the semantic `treeCoverLoss` palette in a fixed order, with its validation numbers and exceptions; the unit scaling rule (million hectares on axes and key figures, thousand hectares in tables, never mixed inside one column); the ranking's percentage threshold (ranked only above a first-year minimum, others listed after with a dash in the rank); the `null` is not zero rule applied to blank drivers; and the rule that a page built on two sources of different measures says so and never combines them. The text that called the divergent palette pending SHALL be removed everywhere in the document.

#### Scenario: Nothing about the divergent palette is pending

- **WHEN** `docs/design-system.md` is searched for "Pending" near the divergent palette
- **THEN** the subsection documents the tokens, breaks, validation and exceptions and states nothing as pending

#### Scenario: Token table matches the declarations

- **WHEN** the divergent token table is compared with `globals.css`
- **THEN** every `--chart-div-*` token is listed with its light and dark values

#### Scenario: Deforestation conventions are findable

- **WHEN** a reader looks up how the deforestation page scales units, ranks percentages or labels the tree cover loss drivers
- **THEN** `docs/design-system.md` states each as decided

### Requirement: Deforestation data source docs, roadmap and READMEs are updated

`docs/data-sources/deforestation.md` SHALL list the sources in use (FAO FRA 2025 and the GFW tree cover loss by dominant driver, both through the OWID charts `forest-area-km`, `forest-area-as-share-of-land-area` and `tree-cover-loss-by-dominant-driver`), SHALL replace the statement that Global Forest Watch is non-commercial with the per-dataset facts (the WRI and Google DeepMind tree cover loss drivers dataset and the Hansen/UMD tree cover loss are CC BY 4.0; other GFW datasets may carry other licenses and must be checked individually), SHALL record why `annual-deforestation` and `annual-change-forest-area` are not used, and SHALL note that the share chart reaches back to the year 1000 and is restricted to 1990 onwards. `ROADMAP.md` SHALL no longer list deforestation among the pending categories, SHALL state 7 of 12 categories with real data, SHALL update the provider coverage matrix row of deforestation and the count of categories remaining, with no item IDs added. The Postman OWID collection SHALL include requests (CSV and metadata) for `forest-area-as-share-of-land-area` and `tree-cover-loss-by-dominant-driver`, and the existing `forest-area-km` requests SHALL keep working. `README.md`, `apps/web/README.md`, `apps/api/README.md`, `packages/shared/README.md`, the `AGENTS.md` structure tree and any list of live categories, providers or fixtures SHALL include the new module, shared types, components and fixtures; `CHANGELOG.md` SHALL be untouched.

#### Scenario: Licence statement is corrected

- **WHEN** `docs/data-sources/deforestation.md` and `docs/data-sources/reforestation.md` are read
- **THEN** neither states that Global Forest Watch data is non-commercial as a blanket rule, and both say licenses are per dataset

#### Scenario: Roadmap status

- **WHEN** `ROADMAP.md` is read
- **THEN** its status says 7 of 12 categories with real data, deforestation is not listed as a placeholder, and no `Pxx`, `Dxx` or `Ixx` ID is added

#### Scenario: Postman collection

- **WHEN** the OWID Postman collection is read
- **THEN** it has data and metadata requests for the two new slugs

#### Scenario: Other docs

- **WHEN** the READMEs, `AGENTS.md` and the fixtures README are read
- **THEN** every list of live categories, shared type files, API modules, web components and fixtures includes the deforestation additions and cross-links stay valid
