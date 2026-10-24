## MODIFIED Requirements

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

## ADDED Requirements

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
