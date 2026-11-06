# Design: wrap-chart-legends

## Wrapped legend

ECharts' `plain` legend wraps its items onto new rows when they do not fit the chart width, but
ECharts never moves the grid or a pie away from it: `grid.containLabel`/`outerBounds` only
contain axis labels. A legend that grows from one to three rows would therefore overlap the year
axis or the donut.

`wrappedLegend(labels, reserve)` in `components/charts/wrappedLegend.ts` returns:

- `legend`: `type: 'plain'`, `bottom: 0`, centred, `icon: 'roundRect'`, with padding, item
  size and item gap set explicitly so the estimate below uses the same numbers ECharts uses.
- `media`: a query-less default holding the one-row reserve first (ECharts only reverts a
  query that stops matching to that default, so without it a widened chart kept the taller
  reserve), then one ECharts media query per extra row, `{ query: { maxWidth }, option: reserve(h) }`,
  ordered from the widest breakpoint to the narrowest so the narrowest matching query wins.
- `reserved`: `reserve(h)` for one row, which the caller spreads into the root option.

`reserve` is chart-specific: the area chart turns the legend height into `grid.bottom`; the donut
turns it into the `bottom` of its pie series box (plus a gap, so the ring never touches it).

ECharts evaluates `media` on every `resize()`, which `EChart` already calls from its
`ResizeObserver`, so rotating a phone or resizing a window re-reserves the space.

### Estimating rows without the browser

The builder is pure and has no access to the font, so it estimates each label's width by summing
a per-character table (printable ASCII at 12 px, each entry the widest of DejaVu Sans, Liberation
Sans and Arial as Chromium, WebKit and Firefox measure it, rounded up; any other character counts
as the widest entry), plus the icon, the 5 px icon gap and 1 px of slack, and packs the items
greedily into `width − 2 × padding`. DejaVu Sans, the widest common system sans-serif, sets most
entries; Helvetica, Roboto, Segoe UI and San Francisco are expected to be narrower (not measured:
they were not installed where the table was built). The estimate is therefore never narrower than
the real legend in the measured fonts, so it never reserves fewer rows than ECharts draws. Greedy
packing with wider items never yields fewer rows, so over-estimating is safe.

Flat per-character estimates were tried first: 0.6 em, then 0.55 em plus 6 px per label. Both
reserved a spare row at common phone widths (414 to 440 px), which left a visibly large gap under
the plots. The table removes it wherever the fonts agree; where DejaVu Sans truly needs one more
row than Arial (a chart about 340 to 358 px wide), that row stays reserved.

Breakpoints come from a binary search on the width for each row count (row count is monotone in
width), so the cost does not depend on pixel ranges.

## Chart boxes

`ChartSkeleton` exports `chartBoxClassName(variant)`, used by both the skeleton and the loaded
chart so nothing shifts:

- every chart: `-mx-3 sm:mx-0` — on mobile the chart extends 12 px into each side of the card's
  16 px padding (the card border and 4 px stay clear); from `sm` the card padding is respected.
- `series`: `h-72 sm:h-96` (unchanged).
- `donut`: `h-96` at every width, so the larger ring and a legend of up to three rows fit on mobile.

## Donut

The legend moves to the bottom (wrapped), the pie series is laid out in a box (`top: 14`,
`bottom: legend + 17`) and the ring fills it (`radius: ['56%', '100%']`). The space above the ring
(the title's 8 px margin plus 14) and below it (17 up to the legend's text) both come to about
22 px, the same as between the area chart's title and its plot.

## Spacing

The area chart's `grid.bottom` is the legend height plus 17 px, so the year labels sit about 22 px
above the legend, matching the title-to-plot space above the chart. The legend height is exact
(padding, 14 px rows, 8 px gaps): a 12 px label box is as tall as the icon, so the space stays the
same whatever the number of rows.

Each chart's legend and reserve are built once at module load: the labels never change, so a
country or measure switch reuses them.

## Alternatives considered

- HTML legend outside the canvas (`flex-wrap`): robust layout and real buttons, but it rebuilds
  series toggling by hand and the user chose the native legend.
- Scroll with fade hint: ECharts' legend is SVG inside the chart; it cannot be swiped or faded with
  CSS, and hidden entries stay undiscoverable.
