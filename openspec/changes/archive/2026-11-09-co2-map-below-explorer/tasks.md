# Tasks

## 1. Page order

- [x] 1.1 Render `Co2WorldMap` after `Co2Explorer` (`mt-8` instead of `mb-8` on the card)
- [x] 1.2 Remove `deferred` from the explorer's `ChartPanel` and the prop itself, with its test
- [x] 1.3 Wrap `ChoroplethMap` in `RenderWhenVisible variant="map"`

## 2. Navigation skeleton

- [x] 2.1 Restore the CO2 `CATEGORY_SKELETONS` entry (introduction, key figures, explorer) and
      remove the `worldMap` block from `categorySkeletons.ts` and `CategoryDataSkeleton.tsx`
- [x] 2.2 Point the explorer skeleton tests back at `co2-emissions`

## 3. Classes and comments

- [x] 3.1 Replace the non-canonical classes the Tailwind language server flags
      (`[&>*]:` → `*:`, `aspect-[2238/1000]` → `aspect-2238/1000`) and verify none remain in the
      changed files with Tailwind's own `canonicalizeCandidates`
- [x] 3.2 Keep the data table comments to what is needed

## 4. Geometry registration

- [x] 4.1 Register the world geometry through the lazy map entry (`EMapChart` re-exports
      `echarts`), not `echartsSetup`: with the line chart loaded first, `registerMap` ran
      before the map chart was registered and the page fell to its error boundary
- [x] 4.2 Point the geometry loader test at the map entry and record it in design-system rule 9

## 5. Checks

- [x] 5.1 Update the CO2 E2E map tests (scroll the card into view, map below the explorer)
- [x] 5.2 Lint, typecheck, unit tests, build and the CO2, a11y and navigation E2E specs pass
