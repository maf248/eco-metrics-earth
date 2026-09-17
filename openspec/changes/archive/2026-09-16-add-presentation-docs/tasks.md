# Tasks: Add Presentation Docs

## Implementation

- [x] 1. Create `docs/design-system.md` with these headings in order: `## Purpose`, `## Theme Rules`, `## Color Palettes` (`### Categorical`/`### Sequential`/`### Divergent`, each marked pending), `## Typography`, `## Spacing`, `## Visualization Heuristics`, `## Accessibility`, `## Presentation Stack` (pending, referencing the catalogue). Verifies: presentation-docs spec, "Doc has all required sections".
- [x] 2. Populate every non-pending section of `docs/design-system.md` with facts verified against the codebase — `apps/web/src/app/globals.css` for the theming mechanism and the two existing custom properties, `apps/web/src/components/icons/` plus the `light-mode-styling` capability for the icon constraint, `AGENTS.md` for the SEO/a11y baseline. Do not state a token system that does not exist. Verifies: presentation-docs spec, "Design system doc records the current theming mechanism" and "Design system doc preserves the icon color constraint".
- [x] 3. In the Purpose section of `docs/design-system.md`, state that the document outranks an agent's general knowledge, that anything marked pending stays pending, and that `docs/technical/libraries.md` is research rather than decisions. Verifies: presentation-docs spec, "Doc states that it outranks an agent's general knowledge".
- [x] 4. Record the five-row visualization heuristics table in `docs/design-system.md`: time series → line/area; composition → stacked bar or donut; per-country comparison → horizontal bar or choropleth; rankings → sorted horizontal bar; browse/filter → table. No library names. Verifies: presentation-docs spec, "Heuristic table is present and library-agnostic".
- [x] 5. Create `docs/technical/libraries.md` with the current stack, the chart/map/table candidates with licenses and a read on each, the ruled-out options with the reason for each exclusion, the cross-cutting recommendation, and the gates and technical traps to verify before deciding. State the screening date and that its claims must be re-checked before being acted on. Verifies: presentation-docs spec, "Catalogue is marked as research".
- [x] 6. State explicitly in `docs/technical/libraries.md` that nothing in it is decided and no listed library is installed. Confirm against `apps/web/package.json` that none is present. Verifies: presentation-docs spec, "No presentational library is installed while the stack is pending".
- [x] 7. Add a "Presentation docs for UI-bearing changes" section to `AGENTS.md` naming both documents and what each is for, stating that `@coder` reads the design system before implementing a UI-bearing change and `@reviewer` audits against it, that both docs outrank an agent's general knowledge, and that a change establishing a presentation decision updates the design system in that same change. Additive only — do not modify the SDD workflow steps. Verifies: presentation-docs spec, "AGENTS.md states the reading obligations" and "A new presentation decision updates the design system".
- [x] 8. Mirror a condensed form of the same rule into `CLAUDE.md` and `.opencode/agents/orchestrator.md`, matching each file's existing phrasing and list style. Verifies: presentation-docs spec, "Workflow mirrors stay synchronized".
- [x] 9. Update `ROADMAP.md` I15 and I17 to point at `docs/technical/libraries.md` for the screening and open questions, in place, without renumbering.

## Verification gates

- [x] 10. `npx prettier --check` passes on every file created or modified by this change. Pre-existing formatting drift in files this change did not otherwise touch is left alone rather than reformatted into this change's diff.
- [x] 11. `node -e "JSON.parse(...)"` confirms `opencode.json` is valid JSON.
- [x] 12. `nx run-many -t lint`, `-t test`, `-t build` all pass. No E2E: this change touches no runtime code.
- [x] 13. `git diff` on `AGENTS.md`, `CLAUDE.md` and `.opencode/agents/orchestrator.md` shows only additive lines, with the SDD workflow steps unchanged.
- [x] 14. `grep` confirms no reference anywhere in the repo to the deleted `define-presentation-stack` change, and no reference to a `designer` agent in the workflow files or `opencode.json`.
- [x] 15. `git status` confirms nothing under `apps/`, `packages/` was touched, and that the pre-existing uncommitted `ROADMAP.md` screening work is preserved rather than reverted.
