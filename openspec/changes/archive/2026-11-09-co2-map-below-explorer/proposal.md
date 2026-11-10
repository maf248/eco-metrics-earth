# Proposal

## Why

After trying the CO2 world map locally, the user wants the page to open as it did before: the
World key figures and the country explorer first, then the world map card with its ranking.
The map card itself stays as it is. Moving it also brings back the pending-navigation skeleton
of the key figures and the explorer, which the map block had replaced.

## What Changes

- Render `Co2WorldMap` after `Co2Explorer` in `Co2EmissionsContent`, unchanged inside.
- The explorer's line chart is the page's first chart again, so it is no longer deferred; the
  map, now below it, mounts when it scrolls into view (`RenderWhenVisible`, `map` variant), as
  chart rule 5 asks of every chart below the first one.
- Restore the CO2 entry of `CATEGORY_SKELETONS` to the introduction, key figures and explorer,
  and remove the now unused `worldMap` skeleton block.
- Remove the `deferred` prop of `ChartPanel`, which only the CO2 explorer used.
- Use Tailwind's canonical class forms in the new code (`*:` child variants,
  `aspect-2238/1000`), which the editor flags otherwise; the data tables keep their borders on
  the cells under a sticky header.
- Register the world geometry through the lazy map entry instead of `echartsSetup`. With the line
  chart loaded first, `echartsSetup` resolved before the map chart was registered, `registerMap`
  failed and the page fell to its error boundary; the same race could hit a client navigation
  from another chart page.

## Non-Goals

- No change to the map, the slider, the legend or the ranking table.
- No change to the metadata or the structured data: they already describe the map, the ranking
  and the yearly series, whatever their order.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `co2-emissions-page`: the world map card moves below the explorer and mounts when scrolled into
  view; the CO2 navigation skeleton is the introduction, key figures and explorer again.

## Impact

- `apps/web/src/components/co2-emissions/` (`Co2EmissionsContent`, `Co2Explorer`, `Co2WorldMap`,
  `Co2RankingTable`), `charts/ChartPanel.tsx`, `charts/ChartSkeleton.tsx`, `charts/EMapChart.tsx`,
  `lib/worldGeometry.ts`, `YearDataTable.tsx`,
  `CategoryDataSkeleton.tsx`, `lib/categorySkeletons.ts`; their unit tests and the CO2 E2E spec;
  `docs/design-system.md` (rule 9 class name) and `ROADMAP.md` (status line).
