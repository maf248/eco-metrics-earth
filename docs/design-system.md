# Design System

## Purpose

This document is the single source of truth for presentation decisions in **eco-metrics earth** — theming, typography, spacing, color palettes, visualization heuristics, and accessibility conventions. It is read by `@coder` before implementing a UI-bearing change, and by `@reviewer` when auditing one. It is extended (not replaced) as new decisions are made.

**This document outranks an agent's general knowledge.** Where it states a fact about this codebase, that fact wins over the usual answer for a React/Tailwind project. Where it marks something pending, that is an open question — not an invitation to decide it in passing. Library candidates and the technical traps behind them live in `docs/technical/libraries.md`; that document is research, not decisions.

## Theme Rules

- Dark mode is class-based: `apps/web/src/app/globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))`, and `ThemeProvider`/a blocking inline script toggle the `dark` class on `<html>`.
- `apps/web` uses Tailwind CSS v4. Theming today is expressed primarily through paired Tailwind utility classes (e.g. `bg-white dark:bg-black`, `text-gray-900 dark:text-white`), not a full CSS custom-property token system.
- The one existing exception is the `@theme` block in `globals.css`, which defines `--color-nav-surface` and `--color-nav-surface-dark` for the nav surface.
- A broader design-token system does not exist yet. It is aspirational, pending the presentation-stack decision (candidates and open questions: `docs/technical/libraries.md`), which will populate the Color Palettes and Presentation Stack sections below.
- Eco-category icon components in `apps/web/src/components/icons/` are intentionally multicolor and use hardcoded fill values as part of each category's visual identity; per the `light-mode-styling` capability, they MUST NOT be recolored or tinted per theme. Any contrast fix must add separation (e.g. drop-shadow, border, background highlight) without altering the SVG's own colors.
- Category icons render with a subtle drop-shadow in light mode and a faint white glow in dark mode; large icons also sit inside a rounded container with a neutral background highlight that matches the inactive nav pills (`bg-gray-300 dark:bg-white/10`). SVG fills remain unchanged.

## Color Palettes

### Categorical (light / dark)

Pending — see `docs/technical/libraries.md`

### Sequential (light / dark)

Pending — see `docs/technical/libraries.md`

### Divergent (light / dark)

Pending — see `docs/technical/libraries.md`

## Typography

- Fonts and type scale follow Tailwind CSS v4's default typography utilities as currently used across `apps/web/src/app/**` and `apps/web/src/components/**`.
- No custom `@theme` font tokens are defined beyond the nav-surface color tokens noted above.

## Spacing

- Spacing follows Tailwind CSS v4's default spacing scale (the `4px`-based `space-*`/`p-*`/`m-*`/`gap-*` utilities) as currently used across the codebase. No custom spacing tokens are defined.

## Layout

- Desktop (`lg+`) sidebar (`Navbar.tsx`): fixed width `lg:w-76` (304px), matched by `lg:pl-76` on the page content offset (`layout.tsx`) — the two must move in lockstep.
- Desktop nav item rows (`NavLink.tsx`): row density `lg:py-2`, chosen so all 12 `NAV_ITEMS` fit within a typical desktop viewport height (~700px+) without scrolling.
- Vertical scroll affordance (`NavScrollContainer.tsx`): on desktop, top/bottom gradient overlays signal hidden nav items above/below the visible area, mirroring the existing horizontal affordance used by the mobile bottom bar. Both reuse the same `--color-nav-surface`/`--color-nav-surface-dark` tokens as their horizontal counterparts, oriented vertically (`bg-gradient-to-b` / `bg-gradient-to-t`).

## Visualization Heuristics

| Data shape                     | Pattern                                |
| ------------------------------ | -------------------------------------- |
| Time series                    | Line or area chart                     |
| Composition (parts of a whole) | Stacked bar or donut chart             |
| Per-country comparison         | Horizontal bar chart or choropleth map |
| Rankings                       | Sorted horizontal bar chart            |
| Browse/filter of many records  | Table                                  |

## Accessibility

- Semantic HTML and descriptive titles/meta descriptions are required on every page.
- All navigable URLs use trailing-slash canonical URLs.
- Accessible markup is verified via `@axe-core/playwright` E2E coverage.
- Eco-category icons keep their hardcoded multicolor fills; contrast/separation fixes must not recolor them (see Theme Rules above).

## Presentation Stack

Pending — the charting/mapping/table library (or libraries) is not yet chosen. Candidates, discarded options, and the gates to clear before deciding are catalogued in `docs/technical/libraries.md`. See `ROADMAP.md` I10 for the screening that will inform that decision.

## Tooling note

A `designer` subagent was evaluated on 16 Sep 2026 and rejected: once the facts lived here, what remained in the agent was "read this document and apply it", which `@coder` already does. The full reasoning is in the archived change `openspec/changes/archive/2026-09-16-add-presentation-docs/`.

Worth reconsidering when this document grows past the point where reading it whole is cheap — concrete palettes validated in both themes, a decided stack with its conventions, per-chart recipes, a component inventory. Until then, the document is the specialist.
