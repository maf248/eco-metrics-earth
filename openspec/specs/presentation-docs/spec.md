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
