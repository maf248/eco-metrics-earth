# water-footprint-table — Delta

## MODIFIED Requirements

### Requirement: WaterFootprintTable client component with local filter and sort state

A `'use client'` component `WaterFootprintTable` in `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` SHALL receive the full `products: WaterFootprintProduct[]` array as a prop and own all interactive state locally: the active category filter (`'all' | WaterFootprintCategory`, default `'all'`) and the sort (`{ key: 'name' | 'footprint'; direction: 'asc' | 'desc' }`, default `{ key: 'footprint', direction: 'desc' }`). Visible rows SHALL be derived purely as filter → sort on every render. No context, no effects, no URL state, no refetching.

#### Scenario: Initial render

- **GIVEN** the 60-product dataset as props
- **WHEN** the component renders
- **THEN** all 60 products are visible, sorted by water footprint descending
- **THEN** products with `waterFootprintLiters === null` are placed last regardless of direction

#### Scenario: Filter and sort compose

- **GIVEN** the Textiles filter is active
- **WHEN** the user sorts by product name ascending
- **THEN** only Textiles products are visible, ordered alphabetically

### Requirement: Category filter via native radio group

The filter SHALL be a `<fieldset>` with `<legend>` "Filter by category" containing eight native `<input type="radio">` options: "All" (default checked), "Food & Beverages", "Textiles", "Technology", "Manufactured", "Digital & Computing", "Vehicles", "Energy & Extractives" — derived from `waterFootprintCategorySlugMap`. Radios SHALL be keyboard-navigable (native arrow-key behavior). No custom ARIA widget roles. Each radio+label pair SHALL be isolated in its own wrapper element (a `<div>`) so the Tailwind `peer` sibling relationship is scoped to exactly one input+label pair — `peer-checked:` compiles to `.peer:checked ~ label` (general sibling combinator), which without per-pair isolation reaches every following label in the shared flex container and paints them all as active. Exactly one label SHALL visually indicate the checked state at any time (Tailwind `peer`/`peer-checked` styling scoped per pair).

#### Scenario: Filter by Textiles

- **GIVEN** the page shows all 60 products
- **WHEN** the user activates the "Textiles" radio
- **THEN** only the 5 Textiles products remain visible

#### Scenario: Filter by Digital & Computing

- **GIVEN** the page shows all 60 products
- **WHEN** the user activates the "Digital & Computing" radio
- **THEN** only the 5 Digital & Computing products remain visible

#### Scenario: Filter by Vehicles

- **GIVEN** the page shows all 60 products
- **WHEN** the user activates the "Vehicles" radio
- **THEN** only the 3 Vehicles products remain visible

#### Scenario: Return to All

- **GIVEN** the Textiles filter is active
- **WHEN** the user activates the "All" radio
- **THEN** all 60 products are visible again

#### Scenario: Keyboard operation

- **WHEN** a keyboard user tabs into the radio group and uses arrow keys
- **THEN** they can move between filter options and activate them with native radio behavior

#### Scenario: Initial render marks exactly one label as active

- **GIVEN** the page renders with the default "All" filter ("All" is first in DOM order)
- **WHEN** the filter group paints
- **THEN** exactly the "All" label carries the checked (active) styling
- **AND** the other seven labels carry the inactive styling

#### Scenario: Activating a category marks only that label as active

- **GIVEN** the page shows all 60 products with "All" checked
- **WHEN** the user activates the "Food & Beverages" radio
- **THEN** only the "Food & Beverages" label carries the checked (active) styling
- **AND** every other label — including "All", which precedes it in DOM order — carries the inactive styling

### Requirement: Screen-reader announcements for filter and sort changes

A live region with `role="status"` and `aria-live="polite"` SHALL sit above the layouts and SHALL announce the result of every filter or sort change in human-readable form, e.g. "Showing 5 of 60 products — Textiles, sorted by water footprint (high to low)".

#### Scenario: Filter change announced

- **GIVEN** all 60 products are shown
- **WHEN** the user activates the "Textiles" radio
- **THEN** the live region text changes to reflect 5 of 60 products in Textiles with the current sort

#### Scenario: Sort change announced

- **WHEN** the user flips the water-footprint sort to ascending
- **THEN** the live region text reflects the new direction

### Requirement: Null and empty renderings

Products with `waterFootprintLiters === null` SHALL render "No data" in the footprint cell (instead of a number), sort last, and show "—" as their equivalent. When the active filter matches zero products, the component SHALL render the message "No products match the selected filter." in place of both layouts.

The null-handling behavior SHALL be defensive: the `WaterFootprintProduct` contract continues to allow `waterFootprintLiters: null`, and the component SHALL keep rendering it correctly, but the dataset itself SHALL NOT be required to contain a null-footprint entry — the behavior is verified through test fixtures rather than a live dataset row.

#### Scenario: Null footprint product

- **GIVEN** a fixture product with `waterFootprintLiters: null` (no dataset entry is required to carry a null value)
- **WHEN** products are listed
- **THEN** that product shows "No data" for the footprint, "—" for the equivalent, and is ordered last

#### Scenario: Empty filter result

- **GIVEN** a fixture where the active category filter matches no products
- **WHEN** the filter is active
- **THEN** the "No products match the selected filter." message renders and neither the table nor the card list is shown
