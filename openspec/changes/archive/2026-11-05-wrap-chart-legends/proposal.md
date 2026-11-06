# Proposal: wrap-chart-legends

## Goals

On mobile, chart legends use ECharts' `scroll` type: one row of items with tiny previous/next
arrows and a `1/3` page counter. Paging is hard to tap, it is not fluid, and most sources are
hidden until the user pages to them. Charts also leave a lot of unused card width on mobile, and
the donut sits close to its legend.

- Replace the scrolling legend with a legend that wraps onto as many rows as it needs, so every
  entry is visible at once, on every chart that shows a legend.
- Keep the plot clear of the wrapped legend at every width: the space reserved under the plot
  grows with the number of legend rows, through ECharts' native `media` queries on chart width.
- Leave a visible gap between the donut and its legend, and draw the donut larger.
- Let charts use more of the card's width on mobile.

## Non-Goals

- No HTML legend outside the chart: the legend stays ECharts' own, with its built-in toggling.
- No change to series, colours, tooltips, tables or the data.
- No change to charts that hide their legend (CO2, global temperature).

## Impact

- `apps/web/src/components/charts/`: new `wrappedLegend.ts` helper; `baseChartOption` default
  legend becomes `plain`; chart box classes per skeleton variant (mobile bleed, taller donut) shared
  by `lazyChart` and `ChartSkeleton`.
- `apps/web/src/lib/energyChartOption.ts`: area and donut use the wrapped legend.
- Unit tests for the helper, the option builders and the chart boxes.
- `docs/design-system.md`: the mobile-safe defaults name the wrapped legend instead of `scroll`.
- Specs: `chart-foundation`, `energy-sources-page`.
