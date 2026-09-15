# Spec: Water Footprint Table UI — Filter Active State, Focus Visibility, Footnote Spacing (Delta)

> Delta against the existing `water-footprint-table` capability (`openspec/specs/water-footprint-table/spec.md`). Three MODIFIED requirements — no ADDED or REMOVED requirements. All other requirements of the capability are intentionally not delta-ed and must keep passing as-is. Each MODIFIED requirement restates the full requirement as it will exist after the change (repo precedent: `2026-09-11-upgrade-nestjs-12`); unchanged scenarios keep their original titles so the archive merge replaces the correct requirement blocks.

## MODIFIED

### Requirement: Category filter via native radio group

The filter SHALL be a `<fieldset>` with `<legend>` "Filter by category" containing five native `<input type="radio">` options: "All" (default checked), "Food & Beverages", "Textiles", "Technology", "Manufactured" — derived from `waterFootprintCategorySlugMap`. Radios SHALL be keyboard-navigable (native arrow-key behavior). No custom ARIA widget roles. Each radio+label pair SHALL be isolated in its own wrapper element (a `<div>`) so the Tailwind `peer` sibling relationship is scoped to exactly one input+label pair — `peer-checked:` compiles to `.peer:checked ~ label` (general sibling combinator), which without per-pair isolation reaches every following label in the shared flex container and paints them all as active. Exactly one label SHALL visually indicate the checked state at any time (Tailwind `peer`/`peer-checked` styling scoped per pair).

#### Scenario: Filter by Textiles

- **GIVEN** the page shows all 52 products
- **WHEN** the user activates the "Textiles" radio
- **THEN** only the 6 Textiles products remain visible

#### Scenario: Return to All

- **GIVEN** the Textiles filter is active
- **WHEN** the user activates the "All" radio
- **THEN** all 52 products are visible again

#### Scenario: Keyboard operation

- **WHEN** a keyboard user tabs into the radio group and uses arrow keys
- **THEN** they can move between filter options and activate them with native radio behavior

#### Scenario: Initial render marks exactly one label as active

- **GIVEN** the page renders with the default "All" filter ("All" is first in DOM order)
- **WHEN** the filter group paints
- **THEN** exactly the "All" label carries the checked (active) styling
- **AND** the other four labels carry the inactive styling

#### Scenario: Activating a category marks only that label as active

- **GIVEN** the page shows all 52 products with "All" checked
- **WHEN** the user activates the "Food & Beverages" radio
- **THEN** only the "Food & Beverages" label carries the checked (active) styling
- **AND** every other label — including "All", which precedes it in DOM order — carries the inactive styling

### Requirement: Keyboard accessibility and focus preservation

Every interactive control (filter radios, sort buttons, source links, methodology disclosures) SHALL be a natively focusable element reachable via Tab. Focus SHALL NOT be lost, reset, or trapped when the table re-renders after a filter or sort change. Because the filter radios are visually hidden (`sr-only`), each filter label SHALL present a visible focus indicator when its radio receives keyboard focus — Tailwind `peer-focus-visible:` styling scoped per pair (the same wrapper isolation as the checked-state styling) — so keyboard users can always see which filter option has focus (WCAG 2.4.7 Focus Visible). The indicator SHALL appear on the focused option's label only.

#### Scenario: Focus survives re-render

- **GIVEN** focus is on the "Textiles" radio
- **WHEN** the user activates it and the table re-renders
- **THEN** focus remains on the "Textiles" radio

#### Scenario: Visible focus indicator on the filter labels

- **GIVEN** the page is open and the filter group is not focused
- **WHEN** a keyboard user tabs into the radio group, then arrows between options
- **THEN** the focused option's label displays a visible focus indicator (focus ring)
- **AND** no other filter label displays a focus indicator

### Requirement: Contextual equivalents

Each product SHALL display a contextual equivalent computed from constants in `apps/web/src/lib/waterFootprintEquivalents.ts`: `SHOWER_LITERS = 65` (typical 8-minute shower) and `BATHTUB_LITERS = 150` (standard full bathtub). `formatWaterFootprintEquivalents(liters: number | null): string` SHALL follow these deterministic rules:

- `null` → `"—"`
- `liters < 65` → `"under 1 shower"`
- `65 ≤ liters < 150` → `"≈ {n} shower(s)"` with `n = liters / 65`
- `liters ≥ 150` → `"≈ {n} showers · ≈ {m} bathtubs"` with `n = liters / 65`, `m = liters / 150`
- Quotients ≥ 100 round to integers; quotients < 100 keep one decimal; exactly 1 uses the singular noun.

A visible footnote SHALL state the reference values and label them as illustrative references that are not part of the cited dataset. The footnote SHALL carry bottom spacing (a bottom margin, e.g. Tailwind `mb-8`) so it never sits flush against the viewport bottom on desktop nor against the fixed mobile bottom navigation — the app layout's content padding (`pb-20 lg:pb-0`) exactly offsets the fixed bottom nav (`h-20`) on mobile and is zero on desktop, so without its own bottom margin the page's last content element has no breathing room below it.

#### Scenario: Reference values

- **WHEN** `formatWaterFootprintEquivalents` is called with 65, 150, 12760, and 400000
- **THEN** it returns "≈ 1 shower", "≈ 2.3 showers · ≈ 1 bathtub", "≈ 196 showers · ≈ 85.1 bathtubs", and "≈ 6,154 showers · ≈ 2,667 bathtubs" respectively

#### Scenario: No data

- **WHEN** a product has `waterFootprintLiters: null`
- **THEN** its equivalent cell shows "—"

#### Scenario: Footnote disclaimer

- **WHEN** the data renders successfully
- **THEN** a footnote visible on all breakpoints states the shower/bathtub reference values and that they are illustrative, not part of the cited dataset

#### Scenario: Footnote bottom spacing

- **GIVEN** the "All" filter is active and the page is scrolled to the bottom
- **WHEN** the footnote is visible
- **THEN** clear whitespace separates the footnote text from the bottom edge of the viewport on desktop
- **AND** clear whitespace separates it from the top edge of the fixed bottom navigation on mobile

## File Changes

### MODIFIED: `apps/web/src/components/water-footprint/WaterFootprintTable.tsx`

Filter radio group: each `<input type="radio">` + `<label>` pair wrapped in its own `<div>` (replacing the `<Fragment>`); labels gain `peer-focus-visible:` focus-ring classes; unused `Fragment` import removed. No logic changes.

### MODIFIED: `apps/web/src/components/water-footprint/WaterFootprintContent.tsx`

Footnote paragraph gains a bottom margin (`mb-8`). No logic changes.

### MODIFIED: `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx`

New tests: per-pair structural scoping (each label's peer input shares a wrapper containing only that pair) and exactly-one-checked after activating each option. Existing tests unchanged.

### MODIFIED: `apps/web/__tests__/components/water-footprint/__snapshots__/WaterFootprintTable.test.tsx.snap`

Regenerated — the wrapper `<div>`s intentionally change the rendered tree; visually diffed before commit.

### MODIFIED: `apps/web/e2e/water-footprint.spec.ts`

New regression test in the Interaction describe: after clicking a category filter, computed styles show exactly one label with the active background (real-browser assertion — jsdom cannot catch this CSS bug).
