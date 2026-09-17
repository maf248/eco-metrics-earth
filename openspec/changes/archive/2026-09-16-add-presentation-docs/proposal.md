# Add Presentation Docs

## Goals

- Establish `docs/design-system.md` as the single source of truth for how data is presented in `apps/web` — theme rules, color palettes, typography, spacing, visualization heuristics, accessibility — seeded with the facts that are already true of the codebase today.
- Establish `docs/technical/libraries.md` as the research catalogue for the charting/mapping/table decision: candidates, ruled-out options with their reasons, and the technical traps to verify before committing to anything. Explicitly research, not a decision.
- Declare in `AGENTS.md` who reads which document and when, and that both documents **outrank an agent's general knowledge** — so a model does not answer from what is usually true of a React/Tailwind project when this project has decided otherwise.
- Keep anything the documents mark as pending genuinely pending, rather than letting it be settled in passing by whichever agent happens to touch it next.

## Non-Goals

- **No visualization/mapping/table library is chosen, evaluated, or installed.** The catalogue lists candidates; the decision is deferred until a real visualization is needed (before P1.1, per `ROADMAP.md` I15/I17).
- **No real design tokens are defined.** The palette sections ship as explicit placeholders.
- **No `designer` subagent.** See "Rejected: a designer subagent" below.
- **No Storybook.** Out of scope by existing decision (`ROADMAP.md` I08).
- **No refactor of existing pages or components.** Nothing under `apps/`, `packages/` is touched.

## Rejected: a designer subagent

This change was originally scoped as `add-designer-agent`: a read-only presentation-specialist subagent, defined in both runtimes, consulted between spec approval and implementation for UI-bearing changes. It was fully implemented, then removed before the change closed.

The reasoning, recorded here because it will come up again:

- Once the system facts were moved out of the agent and into `docs/design-system.md` — necessary, because keeping them in the doc **and** both runtime agent files created three copies that drift apart silently — what remained in the agent was "read these two documents, apply them, answer in this shape". A prompt wrapper around a file read.
- `@coder` already reads `docs/design-system.md` for UI-bearing changes under this change's own `AGENTS.md` rule. The document is read either way, so the subagent only adds a delegation hop that replaces the document with a lossy summary of it.
- The usual argument for a specialist — context isolation, keeping a large design system out of the implementer's context — does not apply to a 57-line document.
- There is no knowledge the subagent had that `@coder` lacks. Both are the same model reading the same file.

The knowledge was the valuable part; the agent was scaffolding around it. Reintroducing a `designer` subagent becomes defensible when `docs/design-system.md` grows past the point where reading it whole is cheap — concrete palettes validated in both themes, a decided stack with its conventions, per-chart recipes, a component inventory. At that point the isolation argument is real and can be made with evidence. It is not real today.

## Impact

- **New files:**
  - `docs/design-system.md` — the source-of-truth doc for presentation conventions, and the only place the system facts are written down.
  - `docs/technical/libraries.md` — the research catalogue of library candidates.
- **Modified files:**
  - `AGENTS.md` — gains a "Presentation docs for UI-bearing changes" section (purely additive; the SDD workflow steps are untouched).
  - `CLAUDE.md` and `.opencode/agents/orchestrator.md` — carry a condensed form of the same rule, as they already mirror the project's working rules.
- **Runtime behavior:** none. Documentation and agent-instruction files only; no application code is touched.
