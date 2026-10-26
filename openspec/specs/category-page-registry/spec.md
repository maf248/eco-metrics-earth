# category-page-registry Specification

## Purpose

Dispatch category pages with live data through a registry, so new categories only add a loader and a content component.

## Requirements

### Requirement: Per-category page registry

`apps/web/src/lib/categoryPages.tsx` SHALL export `CATEGORY_PAGES`, a partial record keyed by `EcoCategory` whose values define `load: () => Promise<T>` (the server-side data fetch) and `Content: ComponentType<{ data: T }>` (the category's content), built with a type-safe helper that avoids `any`. `[category]/page.tsx` SHALL look the category up in the registry instead of testing for a specific category: with an entry it awaits `load()` and renders `Content` with the data under the common header (icon and `<h1>`); without one it renders the unchanged placeholder. The page SHALL NOT catch errors from `load()`. Adding a category with live data SHALL require only a registry entry plus its own files.

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
- **THEN** it has entries for exactly `water-footprint`, `co2-emissions` and `global-temperature`

### Requirement: Water-footprint is migrated without behavior change

The `water-footprint` entry SHALL use `getWaterFootprintProducts` as `load` and render `WaterFootprintContent` with the fetched products inside the same container as before (`mt-8 w-full flex justify-center`). The rendered output, metadata, retry behavior and error behavior of `/water-footprint/` SHALL be unchanged.

#### Scenario: Existing page tests pass

- **WHEN** the existing `[category]/page.test.tsx` water-footprint cases run (with only mocking adjusted to the registry if necessary)
- **THEN** they pass with the same assertions on headings, content, empty state and thrown errors

#### Scenario: Water-footprint output is identical

- **WHEN** `/water-footprint/` is rendered with the same products before and after the change
- **THEN** the markup of the page body is identical

### Requirement: Static params follow the registry

`generateStaticParams` SHALL return every `ECO_CATEGORIES` slug without a registry entry, so that registering a category removes it from build-time pre-rendering without editing a second list.

#### Scenario: Registering a category removes it from static params

- **GIVEN** a registry with `water-footprint`, `co2-emissions` and `global-temperature`
- **WHEN** `generateStaticParams()` is called
- **THEN** none of those slugs is returned and the other 9 are

### Requirement: The recipe for new categories is documented

`AGENTS.md` SHALL document, under Common Development Tasks, the end-to-end recipe for an OWID-backed category using this change as the reference: shared wire types, the API module (service on `OwidClient`, `OwidProviderStatus` registration, controller with `@ApiBadGatewayResponse`, `AppModule` import, fixtures and tests), the web side (`lib/<category>.ts` on `fetchEnvelopeFromBff`, content component, registry entry, metadata description, chart option builder on `LazyEChart`), E2E coverage, and docs. It SHALL also describe the `ProviderError` -> `502` rule and the liveness vs dependencies health split.

#### Scenario: AGENTS.md carries the recipe

- **WHEN** `AGENTS.md` is read
- **THEN** its Common Development Tasks section lists the steps above and the project structure section shows the new folders
