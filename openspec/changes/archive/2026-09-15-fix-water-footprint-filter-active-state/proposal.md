# Proposal: Fix Water Footprint Filter Active State, Focus Visibility, and Footnote Spacing

> Bug-fix change against the existing `water-footprint-table` capability (spec: `openspec/specs/water-footprint-table/spec.md`, delivered by `openspec/changes/archive/2026-09-14-water-footprint-phase3-4-ui/`). Three user-reported defects on `/water-footprint/`, all verified in the code by the orchestrator.

## Goals

- **Fix the filter buttons' active state (Bug 1).** In `WaterFootprintTable.tsx` (lines 82–104) the five radio+label pairs are wrapped in React `<Fragment>`s. Fragments render **no DOM node**, so all five inputs and five labels become flat siblings inside the same `div.flex`. Tailwind's `peer-checked:` compiles to `.peer:checked ~ label` (general sibling combinator), so any checked radio paints the active (green) style on **every label that follows it in DOM order**. Symptoms: on initial load ("All" checked, first in DOM) all five buttons appear active; selecting "Food & Beverages" (second) leaves everything green except "All". The data filtering below works correctly — only the visual state is wrong. Fix: wrap each input+label pair in its own wrapper `<div>` (replacing the Fragment) so the sibling combinator is scoped per pair.
- **Add visible keyboard focus to the filter group (Bug 2 — WCAG 2.4.7 failure).** The radios are `sr-only` and the labels carry no focus styling, so a keyboard user tabbing into the filter group sees **no focus indicator at all**. Fix: `peer-focus-visible:` styling (focus ring) on each label — which requires the same per-pair scoping as Bug 1, otherwise the flat-sibling problem would highlight all following labels.
- **Fix footnote spacing (Bug 3).** The equivalents footnote in `WaterFootprintContent.tsx` (line 36) has `mt-6` but no bottom margin. The app layout's content wrapper (`apps/web/src/app/layout.tsx` line 106) uses `pb-20 lg:pb-0` — exactly the fixed bottom nav height (`h-20`) on mobile and zero on desktop — so the footnote sits flush against the bottom nav on mobile and the viewport bottom on desktop. Fix: add a bottom margin (`mb-8`) to the footnote paragraph.
- **Correct the spec.** The existing `water-footprint-table` spec codified the broken pattern ("labels SHALL visually indicate the checked state (Tailwind `peer`/`peer-checked` styling)" with no scoping requirement). This change amends the spec so the scoping requirement, the visible-focus requirement, and the footnote spacing requirement are codified and the regression cannot silently reappear.

## Non-Goals

- **No switch away from native radios.** The filter stays a native `<input type="radio">` group — single-select semantics, arrow-key group navigation, checked state natively exposed to assistive technology. `aria-pressed` toggle buttons are explicitly rejected (design.md D2).
- **No state-driven conditional classes.** The established Tailwind `peer`/`peer-checked` idiom (mandated by the original spec) is kept; the fix is DOM scoping, not React-state-driven styling (design.md D1).
- **No changes to filter/sort logic or data flow** — `useState` filter/sort, derived rows, live-region announcements, table/card responsive layouts, attribution, and null/empty renderings are untouched.
- **No global layout changes** — the `pb-20 lg:pb-0` content padding in `app/layout.tsx` stays as-is (its job is to offset the fixed nav so content is not covered); the spacing fix is scoped to the footnote paragraph. Changing global padding would affect all 12 category pages.
- **No visual redesign of the filter chips** — same colors, borders, radii, and hover states; only the scoping of `peer-checked` and the addition of `peer-focus-visible` change.
- **No changes to the other 11 category pages**, the API, `packages/shared`, or any endpoint contract.
- **No new dependencies** — Tailwind utilities already in use cover everything.
- **No SEO/metadata/sitemap/URL changes** — `/water-footprint/` route, canonical, and metadata are untouched.
- **No commits or pushes** — implementation stops at the mandatory user-approval checkpoint (AGENTS.md SDD workflow step 5).

## Impact

| Area | Change |
|------|--------|
| `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` | **MODIFIED** — each filter radio+label pair wrapped in its own `<div>` (replacing the `<Fragment>`); `peer-focus-visible:` focus-ring classes added to the labels; unused `Fragment` import removed |
| `apps/web/src/components/water-footprint/WaterFootprintContent.tsx` | **MODIFIED** — footnote paragraph gains `mb-8` bottom margin |
| `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx` | **MODIFIED** — new structural scoping test (each label's peer input shares a wrapper containing only that pair) and exactly-one-checked test (after activating each option, exactly the selected radio is checked) |
| `apps/web/__tests__/components/water-footprint/__snapshots__/WaterFootprintTable.test.tsx.snap` | **MODIFIED** — regenerated (the wrapper `<div>`s intentionally change the rendered tree); must be visually diffed before commit |
| `apps/web/e2e/water-footprint.spec.ts` | **MODIFIED** — new regression test: after clicking a category filter, computed styles show exactly one label with the active background (real-browser assertion — jsdom cannot catch this CSS bug) |
| `openspec/specs/water-footprint-table/spec.md` | **At archive time** — the three MODIFIED requirements merge in, replacing the broken codification |

**Explicitly unchanged:** filter/sort state logic, live region, table/card layouts, `WaterFootprintContent` logic (only the footnote's `className`), `app/layout.tsx`, the API, `packages/shared`, the other 11 category pages and their snapshots, E2E specs other than `water-footprint.spec.ts`.
