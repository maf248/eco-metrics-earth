# Presentational Libraries — Options and Considerations

Reference notes for choosing the chart, map, and table libraries for `apps/web`.

**Status: research catalogue — decisions live in the Presentation Stack section of `docs/design-system.md`.** The decision this research informed is Apache ECharts 6 for charts and maps (not installed yet); tables are still open. This document keeps the candidates, the spike evidence, and what is still to verify — including one gate left for the first real chart: interaction across all five Playwright projects (the spike covered Chromium only).

_Screening: 16 Sep 2026. Spike (Recharts vs ECharts, disposable, never merged): 24 Oct 2026._ Version numbers and project-health claims were accurate then and should be re-checked before acting on them.

## Current stack

|                        |                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | Next.js 16 (App Router), React 19                                                                                                               |
| Styling                | Tailwind CSS v4                                                                                                                                 |
| Dark mode              | Class-based — `@custom-variant dark (&:where(.dark, .dark *))` in `apps/web/src/app/globals.css`, `dark` class toggled on `<html>`              |
| Design tokens          | Semantic color tokens: `:root` / `.dark` values mapped through `@theme inline`; no palette colors in UI components. See `docs/design-system.md` |
| Charts / maps / tables | **None installed.** ECharts is decided for charts and maps; the existing `WaterFootprintTable` is hand-rolled markup                            |
| Unit tests             | Jest + React Testing Library (jsdom); `jest.setup.ts` already polyfills `ResizeObserver`                                                        |
| E2E                    | Playwright, 5 projects: `chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `mobile-chrome`, `mobile-safari`                               |
| Bundle analysis        | `analyze` target on `web`                                                                                                                       |

## Charts

| Candidate         | License    | Outcome                                                                                                   |
| ----------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| **ECharts 6.1**   | Apache-2.0 | **Chosen.** Charts and choropleth in one dependency, richest built-in interaction set                     |
| **Recharts 3.10** | MIT        | Runner-up. Native `var(--x)` theming and keyboard navigation, but fewer built-in interactions and no maps |
| **visx 4.0**      | MIT        | Not spiked — total control, materially more work                                                          |

**Ruled out at screening:** ApexCharts (dropped MIT Jun 2025 — dual license keyed to revenue, not commercial-safe), Nivo (~16 months stagnant, still <1.0), Chart.js (canvas fights both CSS-variable theming and jsdom assertions), Observable Plot (no React components).

### Spike evidence (24 Oct 2026)

Same fake OWID-shaped data in both: multi-series line, stacked area, sorted horizontal bar, donut. Production build (`next build --webpack`), measured against the home page.

|                                                    | Recharts 3.10                             | ECharts 6.1                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Extra JS on the page (gzip)                        | ~127 KB                                   | ~220 KB (line + bar + pie registered)                                                                                             |
| JS execution, 4 charts (Lighthouse mobile, 4× CPU) | 8.0–8.6 s                                 | 4.6–4.7 s                                                                                                                         |
| Total blocking time, 4 charts                      | 1.6–1.9 s                                 | 1.8–1.9 s                                                                                                                         |
| LCP / CLS with `next/dynamic` + skeleton           | ~1.9 s / 0                                | ~2.0–2.6 s / 0                                                                                                                    |
| Theming                                            | `var(--chart-n)` straight in props        | Needs a token → `rgba()` adapter and `setTheme()`; `var()` and `oklch()` unsupported                                              |
| Built-in interactions                              | Tooltip, keyboard tooltip                 | Legend toggle (unstacks areas), series focus, slice select, animated re-sort, map zoom/pan                                        |
| Keyboard inside the chart                          | Yes (`accessibilityLayer`)                | No — `aria` description only                                                                                                      |
| Server-rendered HTML                               | Empty container                           | Empty container (`renderToSVGString` exists but is static and cannot follow the theme)                                            |
| Next 16 production build                           | No hydration or console errors (Chromium) | No hydration or console errors (Chromium)                                                                                         |
| Jest (jsdom)                                       | Works as is                               | Needs ESM transform + `setPlatformAPI({ measureText })`                                                                           |
| Playwright                                         | —                                         | Renders and repaints on theme toggle in Chromium desktop + mobile emulation; the five-project run comes with the first real chart |

Reading: ECharts downloads more but executes less, so on a real page it does not perform worse than Recharts; the download is deferred with `next/dynamic`. Blocking time grows with the number of charts in either library, hence the few-charts-per-page rule.

Sources for the ECharts theming limits: [apache/echarts#16044](https://github.com/apache/echarts/issues/16044) and [#19743](https://github.com/apache/echarts/issues/19743) (CSS variables, closed as not planned), [#19604](https://github.com/apache/echarts/issues/19604) (modern color syntax, open).

## Maps — interactive world choropleth

| Candidate                    | License    | Outcome                                                                                         |
| ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| **ECharts geo** (`map`)      | Apache-2.0 | **Chosen** with the charts: `visualMap` classes, hover/select, tooltip, zoom/pan built in       |
| **react-simple-maps 5.0**    | MIT        | Not needed. Revived 28 Aug 2026 after ~3 years dormant — would have required its own POC        |
| **d3-geo + topojson-client** | ISC        | Kept as **geometry preparation only**: TopoJSON → GeoJSON, then projection before `registerMap` |

**Ruled out:** react-leaflet (Hippocratic-2.1 — not commercial-safe; wrapper inactive since Dec 2024), MapLibre GL v6 (WebGL untestable in jsdom, 251KB gz, overkill for per-country fills).

**Spike findings:** `world-atlas` 110m renders well in ECharts once projected with `d3-geo` (Equal Earth); unprojected, antimeridian-crossing countries smear across the map. A map page adds ~74 KB gzipped over a chart page (map module + visualMap ~30 KB, 110m geometry ~37 KB, `d3-geo` ~6 KB).

**Still open:** Natural Earth (public domain) vs `world-atlas` (ISC), both commercial-safe; `world-atlas` uses numeric ISO 3166-1 codes while OWID uses alpha-3, so a crosswalk is needed — including at least one disputed/former territory as a test case; 110m vs 50m resolution; geometry bundled vs fetched as a static asset.

## Tables

Still open — the hand-rolled `WaterFootprintTable` is enough today; a library earns its place once country × year tables with search and sorting repeat across categories.

| Candidate                | License | Read                                                                                                                                                                   |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Table v9**    | MIT     | Front-runner. Headless, ~10–15KB gz, stable since Aug 2026, maps 1:1 onto the ARIA patterns `WaterFootprintTable` already uses. `8.21.3` is the battle-tested fallback |
| **AG Grid Community 36** | MIT     | License verified — the relicensing rumor is false. But ~150–300KB gz and its DOM competes with hand-rolled Tailwind tables                                             |

**Ruled out:** MUI X DataGrid (drags MUI Core + emotion into a Tailwind-only app), Glide Data Grid (canvas, peers not published for React 19), react-data-grid (perpetual beta since 2022).

Spike to run when the item is picked up: TanStack v9 against the v8.21.3 fallback and against hand-rolled markup, on a country × year table — whether the headless hooks map cleanly onto the ARIA patterns `WaterFootprintTable` already uses, and the measured bundle delta.

## Evaluation gates

Every candidate is judged with evidence, not intuition:

- **License** is commercial-safe. A failure here ends the evaluation immediately.
- **React 19 / Next 16 App Router** compatibility, with no SSR crash or hydration mismatch.
- **Theming** integrates with the token mechanism of `docs/design-system.md`.
- **Testability** in jsdom + RTL, and deterministic interaction in Playwright across all five browser projects.
- **Accessibility**, maintenance health, and **measured** bundle impact via the `analyze` target — measured, not estimated.

Practices that carry over to any future spike:

- **Choose the SVG renderer over canvas** wherever the library offers a choice. Canvas output is invisible to both jsdom assertions and Playwright locators.
- **POC code is disposable.** Keep it on a local branch outside `main`/`develop`, out of `apps/web/src/app/` in anything that ships, and delete it once the conclusions are recorded here.
- **Do not build into `.next` while `next dev` is running** — it clobbers the dev server. Stop it, or point `distDir` elsewhere with a temporary, uncommitted `next.config.ts` tweak.
