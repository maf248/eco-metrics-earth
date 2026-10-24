# Tasks

## 1. Design system

- [x] 1.1 Fill the categorical (8 slots) and sequential (5 steps) palettes in `docs/design-system.md` with light/dark values, slot-order rules and the validation method; keep the divergent palette pending with its starting point
- [x] 1.2 Replace the pending Presentation Stack with the decision (ECharts 6 for charts and maps, `d3-geo` for map geometry, HTML/React for tables, key figures and controls) and the chart rules
- [x] 1.3 Align the Theme Rules and Core token heading with the theme adapter (ECharts cannot read `var(--x)`)
- [x] 1.4 Update the Tooling note: the designer re-evaluation is a roadmap reminder

## 2. Library catalogue

- [x] 2.1 Keep `docs/technical/libraries.md` marked as research, pointing to the Presentation Stack for the decision
- [x] 2.2 Record the spike evidence and what remains open (map data, tables, five-project Playwright run)

## 3. Roadmap

- [x] 3.1 Remove the chart-library item, renumber the following items and every cross-reference
- [x] 3.2 Move the first ECharts integration work into the first data-bearing category
- [x] 3.3 Add the headless table evaluation item before the world map item
- [x] 3.4 Add a low-priority reminder to re-evaluate a `designer` subagent

## 4. Validation

- [x] 4.1 `npx openspec validate record-echarts-presentation-stack` passes
- [x] 4.2 Prettier passes on every modified Markdown file
