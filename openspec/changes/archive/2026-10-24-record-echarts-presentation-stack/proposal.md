# Record the ECharts Presentation Stack

## Why

The presentation docs were created with the palettes and the presentation stack as explicit placeholders, pending a library decision. That decision is now made: after a disposable spike comparing Recharts 3.10 and ECharts 6.1 on the same OWID-shaped data, ECharts 6 was chosen for charts and maps. The `presentation-docs` capability still requires those sections to read as pending and `docs/technical/libraries.md` to state that nothing is decided, so the docs and the spec would contradict each other.

## What Changes

- `docs/design-system.md` records the decision: categorical and sequential palettes with light/dark values and their validation method (divergent stays pending until a chart encodes polarity), and a Presentation Stack section naming ECharts 6 for charts and maps, `d3-geo` for map geometry, HTML/React for tables, key figures and controls, plus the chart rules that make the library fit the token system.
- `docs/technical/libraries.md` stays the research catalogue, now carrying the spike evidence (bundle, Lighthouse, theming, testing) and what remains open (map data, tables).
- `ROADMAP.md` closes the chart-library item, renumbers the following backlog items, moves the first ECharts integration work into the first data-bearing category, adds an item to evaluate a headless table library before the world map, and a low-priority reminder to re-evaluate a `designer` subagent when the design system outgrows a cheap full read.
- The `presentation-docs` spec moves from "stack pending" to "stack recorded once decided", and gains a requirement that chart and map conventions live in the design system doc.

## Non-Goals

- **Nothing is installed.** ECharts, `d3-geo` and the chart tokens land with the first change that renders a chart.
- **No divergent palette.** It is defined and validated by the first change that needs one.
- **No table library decision.** Tables stay hand-rolled until the evaluation item runs.
- **No `designer` subagent.** The reasoning recorded in the archived `add-presentation-docs` change still holds.

## Impact

- **Modified files:** `docs/design-system.md`, `docs/technical/libraries.md`, `ROADMAP.md`, and the canonical `openspec/specs/presentation-docs/spec.md` (on archive).
- **Runtime behavior:** none. Documentation only; no application code, dependency or configuration changes.
