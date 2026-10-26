## ADDED Requirements

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
