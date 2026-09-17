# Design: Add Presentation Docs

## Technical approach

### Two documents, two different jobs

The split is deliberate and the boundary matters:

- `docs/design-system.md` holds **decisions and facts** — what is true of this codebase and what has been settled. An agent may rely on it.
- `docs/technical/libraries.md` holds **research** — candidates, exclusions, and open questions. An agent may read it for context but may not treat anything in it as chosen.

Collapsing the two would be worse than having neither: a model reading a list of finalists inside the source-of-truth doc will eventually pick one and present it as the project's decision. Keeping research in a separate file that says "nothing here is decided" makes that mistake visible instead of silent.

### Where the system facts live

Exactly one copy, in `docs/design-system.md`:

- Next.js 16 App Router, React 19, Tailwind v4.
- Class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in `apps/web/src/app/globals.css`.
- Theming is paired `dark:` utility classes, **not** a token system. The only custom properties that exist are `--color-nav-surface` / `--color-nav-surface-dark` in the `@theme` block. A broader token system is aspirational — this was corrected during spec review, where the original brief had assumed a token system that does not exist.
- Eco-category icons keep their hardcoded multicolor fills and must never be recolored per theme (`light-mode-styling` capability, `ROADMAP.md` I12); contrast fixes add separation instead.
- SEO/a11y baseline: semantic HTML, descriptive titles/meta descriptions, trailing-slash canonical URLs, `@axe-core/playwright` coverage.

Duplicating these into agent definitions was tried and rejected — see `proposal.md`, "Rejected: a designer subagent". The failure mode is that a copy keeps reading as authoritative long after the codebase moved on, and nothing makes the divergence visible.

### Declaring authority

Stating the facts is not enough; a model weighs them against its own priors unless told not to. Both `docs/design-system.md` (in its Purpose) and `AGENTS.md` (in the presentation-docs section) state explicitly that these documents outrank an agent's general knowledge, and that what they mark pending stays pending.

### Workflow integration

`AGENTS.md` gains a section, not a workflow step. The SDD sequence is unchanged: no new gate, no new delegation, nothing to skip. `@coder` reads the design system before implementing a UI-bearing change; `@reviewer` audits against it. `CLAUDE.md` and `.opencode/agents/orchestrator.md` carry a condensed form because they already mirror the project's working rules and would otherwise drift.

## Alternatives considered

- **A `designer` subagent holding the design system in its own definition.** Implemented, then rejected — the facts ended up duplicated across the doc and both runtime agent files. See `proposal.md`.
- **A `designer` subagent as a thin reader of the docs.** Also implemented, then rejected: once the facts moved to the doc that `@coder` already reads, the subagent added a delegation hop and a lossy summary without adding knowledge. See `proposal.md` for the full reasoning and the conditions under which it becomes worth revisiting.
- **A separate OpenSpec change to choose and install the presentation stack.** Drafted as `define-presentation-stack` and deleted. It had grown into POCs, bundle measurement and installation — well beyond the screening that was actually asked for. Its useful technical content (the `ResizeObserver`/jsdom trap, SVG over canvas for testability, the cost of keyboard-accessible country paths, the ISO numeric↔alpha-3 crosswalk) was rescued into `docs/technical/libraries.md`; the rest was dropped.
- **Putting the library research directly in `ROADMAP.md`.** Rejected: the roadmap tracks _what to do next_, and a screening with licenses, versions and per-candidate reasoning buries the items around it. `ROADMAP.md` I15/I17 now point at the catalogue instead.

## Risk assessment

- **Risk: the docs drift from the codebase.** Mitigation: exactly one copy of each fact, and a rule in `AGENTS.md` that a change establishing a presentation decision updates `docs/design-system.md` in the same change. One file to keep honest instead of three.
- **Risk: an agent treats a catalogue candidate as a decision and installs it.** Mitigation: the catalogue states it is research and that nothing is installed; the canonical spec makes "no presentational library is installed while the stack is pending" a verifiable scenario against `apps/web/package.json`.
- **Risk: the version numbers and project-health claims in the catalogue go stale.** Mitigation: the document carries its screening date and says explicitly that its claims must be re-checked before being acted on.
- **Risk: nobody reads the docs, since there is no enforcing gate.** Accepted, with eyes open. This is the cost of not having the subagent. The mitigation is that the rule lives in `AGENTS.md`, `CLAUDE.md` and `orchestrator.md` — the files agents actually load — rather than in a doc nobody is pointed at. If it turns out to be routinely skipped, that is the evidence that would justify reintroducing a designer subagent.
