# Spec Delta: water-footprint-table

## ADDED Requirements

### Requirement: Water type surfaced per product

Every product row and card SHALL display its measurement scope, rendered from `waterFootprintWaterTypeLabels[product.waterType]` (`'Blue water'`, `'Green + blue + grey'`, `'Life cycle (on-site)'`, `'Life cycle (total)'`). On desktop this is a "Water type" column; on mobile it is its own line in the card. The column SHALL NOT be sortable — name and water footprint remain the only sort keys.

#### Scenario: Water type on desktop

- **WHEN** the table renders
- **THEN** a "Water type" `columnheader` is present and every row shows its label

#### Scenario: Water type on mobile

- **WHEN** the card list renders
- **THEN** every card shows its water-type label

#### Scenario: Water type is not a sort key

- **WHEN** the user inspects the column headers
- **THEN** only "Product" and "Water footprint" expose sort buttons

### Requirement: Cross-methodology comparability note

A persistent note SHALL be visible on all breakpoints stating that entries are measured on different bases and that values with different water types are not directly comparable. It SHALL be styled and positioned consistently with the existing contextual-equivalents footnote.

This exists because the default sort is water footprint descending across the whole dataset, which places blue-water-only values (Poore & Nemecek) alongside green + blue + grey totals (Mekonnen & Hoekstra) and on-site alongside total life-cycle figures. The ordering is arithmetically correct and semantically misleading without the disclosure.

#### Scenario: Note is visible

- **WHEN** the data renders successfully
- **THEN** the comparability note is present on both the desktop and mobile layouts

### Requirement: Sub-litre water footprint formatting

`formatLiters(liters: number): string` in `apps/web/src/lib/waterFootprintEquivalents.ts` SHALL render values below 1 L with enough significant digits to remain readable, and SHALL leave the rendering of values at or above 1 L byte-identical to its current output.

The current implementation uses `Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })`, which renders `0.00026` as `"0"`. With the `Digital & Computing` entries present that would publish an AI inference footprint of "0 L per prompt".

#### Scenario: Sub-litre value

- **WHEN** `formatLiters(0.00026)` is called
- **THEN** it returns a readable representation of 0.00026, not `"0"`

#### Scenario: Existing renderings unchanged

- **WHEN** `formatLiters` is called with 0.5, 1451.2 and 5400000
- **THEN** it returns `"0.5"`, `"1,451.2"` and `"5,400,000"`

#### Scenario: Sub-litre equivalent reads sensibly

- **WHEN** `formatWaterFootprintEquivalents(0.00026)` is called
- **THEN** it returns `"under 1 shower"`

## MODIFIED Requirements

### Requirement: WaterFootprintTable client component with local filter and sort state

A `'use client'` component `WaterFootprintTable` in `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` SHALL receive the full `products: WaterFootprintProduct[]` array as a prop and own all interactive state locally: the active category filter (`'all' | WaterFootprintCategory`, default `'all'`) and the sort (`{ key: 'name' | 'footprint'; direction: 'asc' | 'desc' }`, default `{ key: 'footprint', direction: 'desc' }`). Visible rows SHALL be derived purely as filter → sort on every render. No context, no effects, no URL state, no refetching.

#### Scenario: Initial render

- **GIVEN** the 53-product dataset as props
- **WHEN** the component renders
- **THEN** all 53 products are visible, sorted by water footprint descending
- **THEN** products with `waterFootprintLiters === null` are placed last regardless of direction

#### Scenario: Filter and sort compose

- **GIVEN** the Textiles filter is active
- **WHEN** the user sorts by product name ascending
- **THEN** only Textiles products are visible, ordered alphabetically

### Requirement: Category filter via native radio group

The filter SHALL be a `<fieldset>` with `<legend>` "Filter by category" containing six native `<input type="radio">` options: "All" (default checked), "Food & Beverages", "Textiles", "Technology", "Manufactured", "Digital & Computing" — derived from `waterFootprintCategorySlugMap`. Radios SHALL be keyboard-navigable (native arrow-key behavior). No custom ARIA widget roles. Each radio+label pair SHALL be isolated in its own wrapper element (a `<div>`) so the Tailwind `peer` sibling relationship is scoped to exactly one input+label pair — `peer-checked:` compiles to `.peer:checked ~ label` (general sibling combinator), which without per-pair isolation reaches every following label in the shared flex container and paints them all as active. Exactly one label SHALL visually indicate the checked state at any time (Tailwind `peer`/`peer-checked` styling scoped per pair).

#### Scenario: Filter by Textiles

- **GIVEN** the page shows all 53 products
- **WHEN** the user activates the "Textiles" radio
- **THEN** only the 6 Textiles products remain visible

#### Scenario: Filter by Digital & Computing

- **GIVEN** the page shows all 53 products
- **WHEN** the user activates the "Digital & Computing" radio
- **THEN** only the 5 Digital & Computing products remain visible

#### Scenario: Return to All

- **GIVEN** the Textiles filter is active
- **WHEN** the user activates the "All" radio
- **THEN** all 53 products are visible again

#### Scenario: Keyboard operation

- **WHEN** a keyboard user tabs into the radio group and uses arrow keys
- **THEN** they can move between filter options and activate them with native radio behavior

#### Scenario: Initial render marks exactly one label as active

- **GIVEN** the page renders with the default "All" filter ("All" is first in DOM order)
- **WHEN** the filter group paints
- **THEN** exactly one label carries the active styling

### Requirement: Screen-reader announcements for filter and sort changes

A live region with `role="status"` and `aria-live="polite"` SHALL sit above the layouts and SHALL announce the result of every filter or sort change in human-readable form, e.g. "Showing 6 of 53 products — Textiles, sorted by water footprint (high to low)".

#### Scenario: Filter announcement

- **GIVEN** all 53 products are shown
- **WHEN** the user activates the Textiles filter
- **THEN** the live region text changes to reflect 6 of 53 products in Textiles with the current sort

### Requirement: Table semantics on desktop

The desktop layout (≥ `lg`) SHALL render a semantic `<table>` with an `<caption>` ("Water footprint by product", visually hidden), `<thead>` headers with `scope="col"`, and product names as row headers with `scope="row"`. Columns: Product · Category · Water footprint (formatted liters + "L" + functional unit) · Water type · Contextual equivalent · Source.

#### Scenario: Table structure

- **WHEN** the table renders
- **THEN** it exposes the `table` role with a caption, `columnheader` cells with `scope="col"`, and `rowheader` cells with `scope="row"`

### Requirement: Card list on mobile

The mobile layout (< `lg`) SHALL render a `<ul>` card list — one `<li>` per product showing the product name (emphasized text, no headings), category, formatted footprint + functional unit, water type, contextual equivalent, and source attribution. Both structures SHALL render in the DOM with CSS controlling visibility (`hidden lg:block` on the table wrapper, `lg:hidden` on the card list) so each breakpoint gets correct semantics without JavaScript media queries.

#### Scenario: Desktop viewport

- **GIVEN** a viewport ≥ 1024 px wide
- **WHEN** the page renders
- **THEN** the data table is visible and the card list is not

#### Scenario: Mobile viewport

- **GIVEN** a viewport < 1024 px wide
- **WHEN** the page renders
- **THEN** the card list is visible and the data table is not
