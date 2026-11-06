# Tasks: wrap-chart-legends

Read `AGENTS.md`, `design.md` and `docs/design-system.md` first. Jest uses `it(...)`. English only.
Do not commit.

## Charts foundation

- [x] 1. Add `apps/web/src/components/charts/wrappedLegend.ts` (`wrappedLegend(labels, reserve)`,
      row estimate and breakpoints as in `design.md`). (spec: Wrapped legends reserve room by width)
- [x] 2. `baseChartOption`: default `legend.type` becomes `'plain'`. (spec: Mobile-safe defaults)
- [x] 3. `ChartSkeleton`: export `chartBoxClassName(variant)` (mobile bleed, donut `h-96`); use it in
      the skeleton and in `lazyChart`. (spec: Chart boxes use the card width on mobile)

## Energy sources

- [x] 4. Area option: wrapped legend at the bottom, `grid.bottom` from the legend height.
- [x] 5. Donut option: wrapped legend at the bottom, pie box 14 px from the top and 17 px
      above the legend, `radius: ['56%', '100%']`; plot-to-legend space matches title-to-plot space.

## Tests and docs

- [x] 6. Unit tests: helper (one row when wide, more rows when narrow, ordered breakpoints, never
      narrower than DejaVu Sans), builders, chart boxes. E2E (`@smoke`, 375 px): both legends wrap
      below their plots with all eight sources and no pager.
- [x] 7. `docs/design-system.md`: mobile-safe defaults name the wrapped legend and the bleed.
- [x] 8. `npm run format:check`, `npm run lint`, `npm run build`, `npm run test`, `npm run e2e` green;
      `npx openspec validate wrap-chart-legends --strict` passes.
