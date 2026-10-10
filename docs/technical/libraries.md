# Presentational Libraries — Options and Considerations

Reference notes for choosing the chart, map, and table libraries for `apps/web`.

**Status: research only. Nothing here is decided, and no library below is installed.** This document records what was screened, what was ruled out and why, and what must be verified before committing to anything. The decision itself is tracked as `ROADMAP.md` item I09.

_Screening date: 16 Sep 2026._ Version numbers and project-health claims below were accurate then and should be re-checked before acting on them.

## Current stack

|                        |                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | Next.js 16 (App Router), React 19                                                                                                               |
| Styling                | Tailwind CSS v4                                                                                                                                 |
| Dark mode              | Class-based — `@custom-variant dark (&:where(.dark, .dark *))` in `apps/web/src/app/globals.css`, `dark` class toggled on `<html>`              |
| Design tokens          | Effectively none. Only `--color-nav-surface` / `--color-nav-surface-dark` in the `@theme` block; day-to-day theming is paired `dark:` utilities |
| Charts / maps / tables | **None installed.** The existing `WaterFootprintTable` is hand-rolled markup                                                                    |
| Unit tests             | Jest + React Testing Library (jsdom)                                                                                                            |
| E2E                    | Playwright, 5 projects: `chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `mobile-chrome`, `mobile-safari`                               |
| Bundle analysis        | `analyze` target on `web`; current per-page chunks are ~1KB                                                                                     |

## Charts

| Candidate         | License    | Read                                                                                                                                                       |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recharts 3.10** | MIT        | Front-runner. React 19 in peers, theming via CSS custom properties (the shadcn pattern with oklch + `.dark` is proven), `accessibilityLayer` on by default |
| **ECharts 6.1**   | Apache-2.0 | The consolidation play — charts _and_ choropleth in one dependency. Costs a JS-object theme bridge to `.dark` and ~100–140KB gz tree-shaken                |
| **visx 4.0**      | MIT        | Revived by Airbnb Jun 2026. Total control, materially more work                                                                                            |

**Ruled out:** ApexCharts (dropped MIT Jun 2025 — dual license keyed to revenue, not commercial-safe), Nivo (~16 months stagnant, still <1.0), Chart.js (canvas fights both CSS-variable theming and jsdom assertions), Observable Plot (no React components).

## Maps — interactive world choropleth

| Candidate                    | License    | Read                                                                                                                                                          |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **react-simple-maps 5.0**    | MIT        | Revived by its original author 28 Aug 2026 after ~3 years dormant. **Demands a POC before any commitment** — the revival is too recent to trust on reputation |
| **ECharts geo**              | Apache-2.0 | `visualMap` with hover/click/tooltips built in. Only relevant if ECharts also wins charts                                                                     |
| **d3-geo + topojson-client** | ISC        | Hand-rolled fallback, ~15–20KB gz. Minimal and fully under our control                                                                                        |

**Ruled out:** react-leaflet (Hippocratic-2.1 — not commercial-safe; wrapper inactive since Dec 2024), MapLibre GL v6 (WebGL untestable in jsdom, 251KB gz, overkill for per-country fills).

**Map data:** Natural Earth (public domain) and `world-atlas` (ISC) are both commercial-safe. Open question: `world-atlas` uses numeric ISO 3166-1 codes while OWID uses alpha-3, so a crosswalk is needed — including at least one disputed/former territory as a test case. Also undecided: 110m vs 50m resolution, and bundled vs fetched as a static asset.

## Tables

| Candidate                | License | Read                                                                                                                                                                   |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Table v9**    | MIT     | Front-runner. Headless, ~10–15KB gz, stable since Aug 2026, maps 1:1 onto the ARIA patterns `WaterFootprintTable` already uses. `8.21.3` is the battle-tested fallback |
| **AG Grid Community 36** | MIT     | License verified — the relicensing rumor is false. But ~150–300KB gz and its DOM competes with hand-rolled Tailwind tables                                             |

**Ruled out:** MUI X DataGrid (drags MUI Core + emotion into a Tailwind-only app), Glide Data Grid (canvas, peers not published for React 19), react-data-grid (perpetual beta since 2022).

## Cross-cutting recommendation

Lean toward **best-of-breed composition** (Recharts + react-simple-maps/d3-geo + TanStack Table): it fits every hard constraint of this stack — CSS-variable theming, jsdom + RTL assertions, Playwright determinism, ~1KB chunks.

Reach for ECharts only if its choropleth (`visualMap` + roam + drill-down) proves significantly better than react-simple-maps plus our own detail panel.

**Avoid the hybrid** (Recharts for charts, ECharts only for maps): it pays ECharts's bundle and theming cost anyway while maintaining two charting idioms in one codebase — worse than either pure option.

## What to verify before deciding

Evaluation gates, all of which must be answered with evidence rather than intuition:

- **License** is commercial-safe. A failure here ends the evaluation immediately — no further work on that candidate.
- **React 19 / Next 16 App Router** compatibility, with no SSR crash or hydration mismatch.
- **Theming** integrates with the existing light/dark setup, preferably through CSS custom properties so palette changes don't require touching component code.
- **Testability** in jsdom + RTL, and deterministic interaction in Playwright across all five browser projects.
- **Accessibility**, maintenance health, and **measured** bundle impact via the `analyze` target — measured, not estimated.

Specific traps worth knowing about up front:

- **`ResponsiveContainer` needs `ResizeObserver`, which jsdom does not implement.** Two workable approaches: a test-only shim in the Jest setup, or rendering inside a fixed-pixel wrapper and asserting on the SVG output instead of resize behavior. Pick one and apply it consistently.
- **Choose the SVG renderer over canvas** wherever the library offers a choice. Canvas output is invisible to both jsdom assertions and Playwright locators.
- **Keyboard access to ~180 country `<path>` elements** is not free. Paths aren't natively focusable, so each needs `tabIndex` + `role` + `aria-label` — profile the real cost rather than assuming it's negligible.
- **Prefer a token bridge over hardcoded colors**: extend the `@theme` block with chart tokens (e.g. `--color-chart-1…n`) and have components read those, so the palette lives in one place.
- **POC code should be disposable.** Keep it out of `apps/web/src/app/` so it carries no SEO, sitemap, or robots obligations, and delete rejected candidates entirely rather than letting them linger.

### Per-candidate spikes

Each finalist has its own open question. These are the checks to run when the decision is actually made — not before:

- **Recharts** — hydration and SSR under Next 16, the `ResponsiveContainer`/`ResizeObserver` test strategy, the real bundle delta from the `analyze` target, and whether `accessibilityLayer` plus keyboard navigation is enough on its own.
- **react-simple-maps v5** — stability above all: render an OWID-shaped choropleth, wire theme tokens and hover/click, check keyboard access. Decide the fallback trigger to `d3-geo` **before** running the spike, in falsifiable terms (an unresolvable SSR/hydration crash, a blocking upstream issue with no workaround, or visual corruption at 110m), so the outcome is not argued after the fact.
- **ECharts** — only worth a spike if it is genuinely challenging the baseline: wrapper approach, real tree-shaking, the SVG renderer, and the bridge between its JS theme object and the `.dark` class.
- **TanStack Table** — v9 against the v8.21.3 fallback, and whether the headless hooks map cleanly onto the ARIA patterns `WaterFootprintTable` already uses.
- **Map data** — 110m vs 50m, bundled vs fetched as a static asset, and the ISO numeric ↔ alpha-3 crosswalk with a disputed or former territory as a test case.
- **Playwright** — interaction determinism over SVG across all five browser projects.

Palettes will need categorical, sequential, and divergent ramps, each contrast-validated in **both** themes — see `docs/design-system.md` and the `light-mode-styling` capability for why light mode is the harder of the two. Record the values in `docs/design-system.md`.
