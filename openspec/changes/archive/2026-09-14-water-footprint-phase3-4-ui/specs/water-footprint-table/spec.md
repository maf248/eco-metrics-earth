# Spec: Water Footprint Table UI

> Delta for the new `water-footprint-table` capability. Covers Phase 3 (component, filters, sort, a11y) and Phase 4 (contextual equivalents, responsive layout) plus per-product source attribution.

## ADDED

### Requirement: WaterFootprintTable client component with local filter and sort state

A `'use client'` component `WaterFootprintTable` in `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` SHALL receive the full `products: WaterFootprintProduct[]` array as a prop and own all interactive state locally: the active category filter (`'all' | WaterFootprintCategory`, default `'all'`) and the sort (`{ key: 'name' | 'footprint'; direction: 'asc' | 'desc' }`, default `{ key: 'footprint', direction: 'desc' }`). Visible rows SHALL be derived purely as filter → sort on every render. No context, no effects, no URL state, no refetching.

#### Scenario: Initial render

- **Given** the 52-product dataset as props
- **When** the component renders
- **Then** all 52 products are visible, sorted by water footprint descending
- **Then** products with `waterFootprintLiters === null` are placed last regardless of direction

#### Scenario: Filter and sort compose

- **Given** the Textiles filter is active
- **When** the user sorts by product name ascending
- **Then** only Textiles products are visible, ordered alphabetically

### Requirement: Category filter via native radio group

The filter SHALL be a `<fieldset>` with `<legend>` "Filter by category" containing five native `<input type="radio">` options: "All" (default checked), "Food & Beverages", "Textiles", "Technology", "Manufactured" — derived from `waterFootprintCategorySlugMap`. Radios SHALL be keyboard-navigable (native arrow-key behavior) and their labels SHALL visually indicate the checked state (Tailwind `peer`/`peer-checked` styling). No custom ARIA widget roles.

#### Scenario: Filter by Textiles

- **Given** the page shows all 52 products
- **When** the user activates the "Textiles" radio
- **Then** only the 6 Textiles products remain visible

#### Scenario: Return to All

- **Given** the Textiles filter is active
- **When** the user activates the "All" radio
- **Then** all 52 products are visible again

#### Scenario: Keyboard operation

- **When** a keyboard user tabs into the radio group and uses arrow keys
- **Then** they can move between filter options and activate them with native radio behavior

### Requirement: Sorting by product name and water footprint

The "Product" and "Water footprint" columns SHALL each render a `<button type="button">` inside their `<th scope="col">`; the button's accessible name SHALL be the column label. Activating an inactive column SHALL sort it ascending; activating the active column SHALL flip its direction. The `<th>` of the active sort column SHALL carry `aria-sort="ascending"` or `aria-sort="descending"`; other `<th>` elements SHALL NOT carry `aria-sort`. The "Category", "Contextual equivalent", and "Source" columns are not sortable.

#### Scenario: Default state

- **When** the table renders with no user interaction
- **Then** rows are sorted by water footprint descending and the "Water footprint" `<th>` has `aria-sort="descending"`

#### Scenario: Flip the active sort

- **Given** the default state (water footprint, descending)
- **When** the user activates the "Water footprint" sort button
- **Then** rows are sorted by water footprint ascending (nulls still last) and `aria-sort` becomes `"ascending"`

#### Scenario: Activate the inactive column

- **Given** the default state
- **When** the user activates the "Product" sort button
- **Then** rows are sorted by product name ascending and the "Product" `<th>` has `aria-sort="ascending"`

### Requirement: Screen-reader announcements for filter and sort changes

A live region with `role="status"` and `aria-live="polite"` SHALL sit above the layouts and SHALL announce the result of every filter or sort change in human-readable form, e.g. "Showing 6 of 52 products — Textiles, sorted by water footprint (high to low)".

#### Scenario: Filter change announced

- **Given** all 52 products are shown
- **When** the user activates the "Textiles" radio
- **Then** the live region text changes to reflect 6 of 52 products in Textiles with the current sort

#### Scenario: Sort change announced

- **When** the user flips the water-footprint sort to ascending
- **Then** the live region text reflects the new direction

### Requirement: Keyboard accessibility and focus preservation

Every interactive control (filter radios, sort buttons, source links, methodology disclosures) SHALL be a natively focusable element reachable via Tab. Focus SHALL NOT be lost, reset, or trapped when the table re-renders after a filter or sort change.

#### Scenario: Focus survives re-render

- **Given** focus is on the "Textiles" radio
- **When** the user activates it and the table re-renders
- **Then** focus remains on the "Textiles" radio

### Requirement: Table semantics on desktop

The desktop layout (≥ `lg`) SHALL render a semantic `<table>` with an `<caption>` ("Water footprint by product", visually hidden), `<thead>` headers with `scope="col"`, and product names as row headers with `scope="row"`. Columns: Product · Category · Water footprint (formatted liters + "L" + functional unit) · Contextual equivalent · Source.

#### Scenario: Table structure

- **When** the table renders
- **Then** it exposes the `table` role with a caption, `columnheader` cells with `scope="col"`, and `rowheader` cells with `scope="row"`

### Requirement: Card list on mobile

The mobile layout (< `lg`) SHALL render a `<ul>` card list — one `<li>` per product showing the product name (emphasized text, no headings), category, formatted footprint + functional unit, contextual equivalent, and source attribution. Both structures SHALL render in the DOM with CSS controlling visibility (`hidden lg:block` on the table wrapper, `lg:hidden` on the card list) so each breakpoint gets correct semantics without JavaScript media queries.

#### Scenario: Desktop viewport

- **Given** a viewport ≥ 1024 px wide
- **When** the page renders
- **Then** the data table is visible and the card list is not

#### Scenario: Mobile viewport

- **Given** a viewport < 1024 px wide
- **When** the page renders
- **Then** the card list is visible and the data table is not

### Requirement: Contextual equivalents

Each product SHALL display a contextual equivalent computed from constants in `apps/web/src/lib/waterFootprintEquivalents.ts`: `SHOWER_LITERS = 65` (typical 8-minute shower) and `BATHTUB_LITERS = 150` (standard full bathtub). `formatWaterFootprintEquivalents(liters: number | null): string` SHALL follow these deterministic rules:

- `null` → `"—"`
- `liters < 65` → `"under 1 shower"`
- `65 ≤ liters < 150` → `"≈ {n} shower(s)"` with `n = liters / 65`
- `liters ≥ 150` → `"≈ {n} showers · ≈ {m} bathtubs"` with `n = liters / 65`, `m = liters / 150`
- Quotients ≥ 100 round to integers; quotients < 100 keep one decimal; exactly 1 uses the singular noun.

A visible footnote SHALL state the reference values and label them as illustrative references that are not part of the cited dataset.

#### Scenario: Reference values

- **When** `formatWaterFootprintEquivalents` is called with 65, 150, 12760, and 400000
- **Then** it returns "≈ 1 shower", "≈ 2.3 showers · ≈ 1 bathtub", "≈ 196 showers · ≈ 85.1 bathtubs", and "≈ 6,154 showers · ≈ 2,667 bathtubs" respectively

#### Scenario: No data

- **When** a product has `waterFootprintLiters: null`
- **Then** its equivalent cell shows "—"

#### Scenario: Footnote disclaimer

- **When** the data renders successfully
- **Then** a footnote visible on all breakpoints states the shower/bathtub reference values and that they are illustrative, not part of the cited dataset

### Requirement: Per-product source attribution

Every product row/card SHALL surface the dataset's attribution fields: the `source` citation rendered as an external link to `sourceUrl` (`target="_blank"` + `rel="noopener noreferrer"`), and the `methodology` text inside a native `<details>` disclosure with a "Methodology" `<summary>` — visible and keyboard-accessible in both the table and card layouts.

#### Scenario: Attribution visible per product

- **When** the table renders
- **Then** each row shows its source citation as a link to the product's `sourceUrl`

#### Scenario: Methodology disclosure

- **When** a user activates a row's "Methodology" disclosure
- **Then** the product's `methodology` text becomes visible

### Requirement: Null and empty renderings

Products with `waterFootprintLiters === null` SHALL render "No data" in the footprint cell (instead of a number), sort last, and show "—" as their equivalent. When the active filter matches zero products, the component SHALL render the message "No products match the selected filter." in place of both layouts.

#### Scenario: Null footprint product

- **Given** the dataset contains a product with a null footprint (Cassava)
- **When** products are listed
- **Then** that product shows "No data" for the footprint, "—" for the equivalent, and is ordered last

#### Scenario: Empty filter result

- **Given** a fixture where the active category filter matches no products
- **When** the filter is active
- **Then** the "No products match the selected filter." message renders and neither the table nor the card list is shown

## File Changes

### ADDED: `apps/web/src/components/water-footprint/WaterFootprintTable.tsx`

`'use client'` component — filter radio group, sort buttons with `aria-sort`, live region, responsive table/card list, attribution rendering.

### ADDED: `apps/web/src/lib/waterFootprintEquivalents.ts`

`SHOWER_LITERS`, `BATHTUB_LITERS` constants + `formatLiters(liters: number): string` (`Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })`) + `formatWaterFootprintEquivalents(liters: number | null): string`.

### ADDED: `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx`

Unit + snapshot tests with fixture products (no network). Covers: default sort, null-last, all filters, sort activation/flip, `aria-sort` values, live-region text, table semantics, card list presence, empty-filter message, snapshot of the default render.

### ADDED: `apps/web/__tests__/lib/waterFootprintEquivalents.test.ts`

Unit tests for every formatting branch and boundary value.

### ADDED: `apps/web/e2e/water-footprint.spec.ts`

E2E spec via the deterministic webServer wrapper (boots API + web): server-rendered HTML contains product data, 52 body rows, Textiles filter → 6 rows, sort interaction + `aria-sort` flip, live-region announcement, attribution link + methodology disclosure, responsive table/card visibility per viewport, canonical + title metadata. Core render test tagged `@smoke` (all browser projects); interaction tests untagged (chromium-desktop).
