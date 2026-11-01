# Spec Delta

## MODIFIED Requirements

### Requirement: Per-category page registry

`apps/web/src/lib/categoryPages.tsx` SHALL export `CATEGORY_PAGES`, a partial record keyed by `EcoCategory` whose values define `load: () => Promise<T>` (the server-side data fetch) and `Content: ComponentType<{ data: T }>` (the category's content), built with a type-safe helper that avoids `any`. `[category]/page.tsx` SHALL look the category up in the registry instead of testing for a specific category: with an entry it awaits `load()` through a cached loader and renders `Content` with the data under the common header (icon and `<h1>`); without one it renders the unchanged placeholder. The page SHALL NOT catch errors from `load()`. Adding a category with live data SHALL require only a registry entry plus its own files. Each registered category SHALL also have an entry in `CATEGORY_SKELETONS`, a client-safe record that lists the skeleton blocks of its data region, so a pending navigation can show them without importing server code.

#### Scenario: Registered category renders its content

- **GIVEN** a registry entry whose `load` resolves to `D`
- **WHEN** the page renders that category
- **THEN** `Content` is rendered with `data = D` below the header

#### Scenario: Unregistered category renders the placeholder

- **WHEN** the page renders a category with no entry (e.g. `ocean-health`)
- **THEN** the "coming soon" placeholder is rendered and no `load` is called

#### Scenario: Fetch failure propagates

- **GIVEN** a registered `load` that rejects
- **WHEN** the page renders
- **THEN** the rejection propagates (nothing is rendered or cached from it)

#### Scenario: Water-footprint and CO2 are registered

- **WHEN** `CATEGORY_PAGES` is inspected
- **THEN** it has entries for exactly `water-footprint`, `co2-emissions`, `global-temperature` and `energy-sources`

#### Scenario: Energy sources renders through the registry

- **GIVEN** the `energy-sources` entry whose `load` is `getEnergySources`
- **WHEN** the page renders `energy-sources`
- **THEN** `EnergySourcesContent` is rendered with the fetched payload inside the container `mt-8 w-full flex justify-center`, below the common header

#### Scenario: Declared skeleton blocks shape the data region

- **GIVEN** a `CATEGORY_SKELETONS` entry
- **WHEN** a navigation to that category is pending
- **THEN** the blocks are rendered in the declared order

#### Scenario: Every registered category has its skeleton

- **WHEN** the keys of `CATEGORY_PAGES` and `CATEGORY_SKELETONS` are compared in a unit test
- **THEN** they are the same set
