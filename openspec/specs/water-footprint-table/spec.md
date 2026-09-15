# water-footprint-table Specification

## Purpose

Defines the `WaterFootprintTable` client component that renders the water-footprint product dataset: local filter and sort state (no refetching, no URL state), native-control accessibility (radio-group filter, sort buttons with `aria-sort`, live-region announcements), responsive layouts (semantic table on desktop, card list on mobile), deterministic contextual equivalents (shower/bathtub references), per-product source attribution, and correct null/empty renderings.

## Requirements

### Requirement: WaterFootprintTable client component with local filter and sort state

A `'use client'` component `WaterFootprintTable` in `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` SHALL receive the full `products: WaterFootprintProduct[]` array as a prop and own all interactive state locally: the active category filter (`'all' | WaterFootprintCategory`, default `'all'`) and the sort (`{ key: 'name' | 'footprint'; direction: 'asc' | 'desc' }`, default `{ key: 'footprint', direction: 'desc' }`). Visible rows SHALL be derived purely as filter → sort on every render. No context, no effects, no URL state, no refetching.

#### Scenario: Initial render

- **GIVEN** the 52-product dataset as props
- **WHEN** the component renders
- **THEN** all 52 products are visible, sorted by water footprint descending
- **THEN** products with `waterFootprintLiters === null` are placed last regardless of direction

#### Scenario: Filter and sort compose

- **GIVEN** the Textiles filter is active
- **WHEN** the user sorts by product name ascending
- **THEN** only Textiles products are visible, ordered alphabetically

### Requirement: Category filter via native radio group

The filter SHALL be a `<fieldset>` with `<legend>` "Filter by category" containing five native `<input type="radio">` options: "All" (default checked), "Food & Beverages", "Textiles", "Technology", "Manufactured" — derived from `waterFootprintCategorySlugMap`. Radios SHALL be keyboard-navigable (native arrow-key behavior) and their labels SHALL visually indicate the checked state (Tailwind `peer`/`peer-checked` styling). No custom ARIA widget roles.

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

### Requirement: Sorting by product name and water footprint

The "Product" and "Water footprint" columns SHALL each render a `<button type="button">` inside their `<th scope="col">`; the button's accessible name SHALL be the column label. Activating an inactive column SHALL sort it ascending; activating the active column SHALL flip its direction. The `<th>` of the active sort column SHALL carry `aria-sort="ascending"` or `aria-sort="descending"`; other `<th>` elements SHALL NOT carry `aria-sort`. The "Category", "Contextual equivalent", and "Source" columns are not sortable.

#### Scenario: Default state

- **WHEN** the table renders with no user interaction
- **THEN** rows are sorted by water footprint descending and the "Water footprint" `<th>` has `aria-sort="descending"`

#### Scenario: Flip the active sort

- **GIVEN** the default state (water footprint, descending)
- **WHEN** the user activates the "Water footprint" sort button
- **THEN** rows are sorted by water footprint ascending (nulls still last) and `aria-sort` becomes `"ascending"`

#### Scenario: Activate the inactive column

- **GIVEN** the default state
- **WHEN** the user activates the "Product" sort button
- **THEN** rows are sorted by product name ascending and the "Product" `<th>` has `aria-sort="ascending"`

### Requirement: Screen-reader announcements for filter and sort changes

A live region with `role="status"` and `aria-live="polite"` SHALL sit above the layouts and SHALL announce the result of every filter or sort change in human-readable form, e.g. "Showing 6 of 52 products — Textiles, sorted by water footprint (high to low)".

#### Scenario: Filter change announced

- **GIVEN** all 52 products are shown
- **WHEN** the user activates the "Textiles" radio
- **THEN** the live region text changes to reflect 6 of 52 products in Textiles with the current sort

#### Scenario: Sort change announced

- **WHEN** the user flips the water-footprint sort to ascending
- **THEN** the live region text reflects the new direction

### Requirement: Keyboard accessibility and focus preservation

Every interactive control (filter radios, sort buttons, source links, methodology disclosures) SHALL be a natively focusable element reachable via Tab. Focus SHALL NOT be lost, reset, or trapped when the table re-renders after a filter or sort change.

#### Scenario: Focus survives re-render

- **GIVEN** focus is on the "Textiles" radio
- **WHEN** the user activates it and the table re-renders
- **THEN** focus remains on the "Textiles" radio

### Requirement: Table semantics on desktop

The desktop layout (≥ `lg`) SHALL render a semantic `<table>` with an `<caption>` ("Water footprint by product", visually hidden), `<thead>` headers with `scope="col"`, and product names as row headers with `scope="row"`. Columns: Product · Category · Water footprint (formatted liters + "L" + functional unit) · Contextual equivalent · Source.

#### Scenario: Table structure

- **WHEN** the table renders
- **THEN** it exposes the `table` role with a caption, `columnheader` cells with `scope="col"`, and `rowheader` cells with `scope="row"`

### Requirement: Card list on mobile

The mobile layout (< `lg`) SHALL render a `<ul>` card list — one `<li>` per product showing the product name (emphasized text, no headings), category, formatted footprint + functional unit, contextual equivalent, and source attribution. Both structures SHALL render in the DOM with CSS controlling visibility (`hidden lg:block` on the table wrapper, `lg:hidden` on the card list) so each breakpoint gets correct semantics without JavaScript media queries.

#### Scenario: Desktop viewport

- **GIVEN** a viewport ≥ 1024 px wide
- **WHEN** the page renders
- **THEN** the data table is visible and the card list is not

#### Scenario: Mobile viewport

- **GIVEN** a viewport < 1024 px wide
- **WHEN** the page renders
- **THEN** the card list is visible and the data table is not

### Requirement: Contextual equivalents

Each product SHALL display a contextual equivalent computed from constants in `apps/web/src/lib/waterFootprintEquivalents.ts`: `SHOWER_LITERS = 65` (typical 8-minute shower) and `BATHTUB_LITERS = 150` (standard full bathtub). `formatWaterFootprintEquivalents(liters: number | null): string` SHALL follow these deterministic rules:

- `null` → `"—"`
- `liters < 65` → `"under 1 shower"`
- `65 ≤ liters < 150` → `"≈ {n} shower(s)"` with `n = liters / 65`
- `liters ≥ 150` → `"≈ {n} showers · ≈ {m} bathtubs"` with `n = liters / 65`, `m = liters / 150`
- Quotients ≥ 100 round to integers; quotients < 100 keep one decimal; exactly 1 uses the singular noun.

A visible footnote SHALL state the reference values and label them as illustrative references that are not part of the cited dataset.

#### Scenario: Reference values

- **WHEN** `formatWaterFootprintEquivalents` is called with 65, 150, 12760, and 400000
- **THEN** it returns "≈ 1 shower", "≈ 2.3 showers · ≈ 1 bathtub", "≈ 196 showers · ≈ 85.1 bathtubs", and "≈ 6,154 showers · ≈ 2,667 bathtubs" respectively

#### Scenario: No data

- **WHEN** a product has `waterFootprintLiters: null`
- **THEN** its equivalent cell shows "—"

#### Scenario: Footnote disclaimer

- **WHEN** the data renders successfully
- **THEN** a footnote visible on all breakpoints states the shower/bathtub reference values and that they are illustrative, not part of the cited dataset

### Requirement: Per-product source attribution

Every product row/card SHALL surface the dataset's attribution fields: the `source` citation rendered as an external link to `sourceUrl` (`target="_blank"` + `rel="noopener noreferrer"`), and the `methodology` text inside a native `<details>` disclosure with a "Methodology" `<summary>` — visible and keyboard-accessible in both the table and card layouts.

#### Scenario: Attribution visible per product

- **WHEN** the table renders
- **THEN** each row shows its source citation as a link to the product's `sourceUrl`

#### Scenario: Methodology disclosure

- **WHEN** a user activates a row's "Methodology" disclosure
- **THEN** the product's `methodology` text becomes visible

### Requirement: Null and empty renderings

Products with `waterFootprintLiters === null` SHALL render "No data" in the footprint cell (instead of a number), sort last, and show "—" as their equivalent. When the active filter matches zero products, the component SHALL render the message "No products match the selected filter." in place of both layouts.

#### Scenario: Null footprint product

- **GIVEN** the dataset contains a product with a null footprint (Cassava)
- **WHEN** products are listed
- **THEN** that product shows "No data" for the footprint, "—" for the equivalent, and is ordered last

#### Scenario: Empty filter result

- **GIVEN** a fixture where the active category filter matches no products
- **WHEN** the filter is active
- **THEN** the "No products match the selected filter." message renders and neither the table nor the card list is shown
