# category-page-registry Specification

## Purpose

Dispatch category pages with live data through a registry, so new categories only add a loader and a content component.

## Requirements

### Requirement: Per-category page registry

`apps/web/src/lib/categoryPages.tsx` SHALL export `CATEGORY_PAGES`, a partial record keyed by `EcoCategory` whose values define `load: () => Promise<T>` (the server-side data fetch) and `Content: ComponentType<{ data: T }>` (the category's content), built with a type-safe helper that avoids `any`. `[category]/page.tsx` SHALL look the category up in the registry instead of testing for a specific category: with an entry it awaits `load()` through a cached loader and renders `Content` with the data under the common header (icon and `<h1>`); without one it renders the unchanged placeholder. The page SHALL NOT catch errors from `load()`. Adding a category with live data SHALL require only a registry entry plus its own files and its home card summary (see `home-page`). Each registered category SHALL also have an entry in `CATEGORY_SKELETONS`, a client-safe record that lists the skeleton blocks of its data region, so a pending navigation can show them without importing server code.

#### Scenario: Registered category renders its content

- **GIVEN** a registry entry whose `load` resolves to `D`
- **WHEN** the page renders that category
- **THEN** `Content` is rendered with `data = D` below the header

#### Scenario: Unregistered category renders the placeholder

- **WHEN** the page renders a category with no entry (e.g. `air-quality`)
- **THEN** the "coming soon" placeholder is rendered and no `load` is called

#### Scenario: Fetch failure propagates

- **GIVEN** a registered `load` that rejects
- **WHEN** the page renders
- **THEN** the rejection propagates (nothing is rendered or cached from it)

#### Scenario: Water-footprint and CO2 are registered

- **WHEN** `CATEGORY_PAGES` is inspected
- **THEN** it has entries for exactly `water-footprint`, `co2-emissions`, `global-temperature`, `energy-sources`, `waste-recycling` and `ocean-health`

#### Scenario: Energy sources renders through the registry

- **GIVEN** the `energy-sources` entry whose `load` is `getEnergySources`
- **WHEN** the page renders `energy-sources`
- **THEN** `EnergySourcesContent` is rendered with the fetched payload inside the container `mt-8 w-full flex justify-center`, below the common header

#### Scenario: Waste and recycling renders through the registry

- **GIVEN** the `waste-recycling` entry whose `load` is `getWasteRecycling`
- **WHEN** the page renders `waste-recycling`
- **THEN** `WasteRecyclingContent` is rendered with the fetched payload below the common header

#### Scenario: Ocean health renders through a sectioned registry entry

- **GIVEN** the `ocean-health` entry built with `defineSectionedProviderCategoryPage`
- **WHEN** the page renders `ocean-health`
- **THEN** `OceanHealthContent` is rendered with the map of section states inside the container `mt-8 w-full flex justify-center`, below the common header

#### Scenario: Declared skeleton blocks shape the data region

- **GIVEN** a `CATEGORY_SKELETONS` entry
- **WHEN** a navigation to that category is pending
- **THEN** the blocks are rendered in the declared order

#### Scenario: Every registered category has its skeleton

- **WHEN** the keys of `CATEGORY_PAGES` and `CATEGORY_SKELETONS` are compared in a unit test
- **THEN** they are the same set

#### Scenario: Every registered category has its home card summary

- **WHEN** the categories with a home card summary are compared in a unit test with the categories that have a skeleton
- **THEN** they are the same set

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

- **GIVEN** a registry with `water-footprint`, `co2-emissions`, `global-temperature` and `energy-sources`
- **WHEN** `generateStaticParams()` is called
- **THEN** none of those slugs is returned and the other 8 are

### Requirement: The recipe for new categories is documented

`AGENTS.md` SHALL document, under Common Development Tasks, the end-to-end recipe for an OWID-backed category using this change as the reference: shared wire types, the API module (service on `OwidClient`, `OwidProviderStatus` registration, controller with `@ApiBadGatewayResponse`, `AppModule` import, fixtures and tests), the web side (`lib/<category>.ts` on `fetchEnvelopeFromBff`, content component, registry entry, metadata description, chart option builder on `LazyEChart`), E2E coverage, and docs. It SHALL also describe the `ProviderError` -> `502` rule and the liveness vs dependencies health split.

#### Scenario: AGENTS.md carries the recipe

- **WHEN** `AGENTS.md` is read
- **THEN** its Common Development Tasks section lists the steps above and the project structure section shows the new folders

### Requirement: The recipe documents the snapshot fallback for provider-backed categories

`AGENTS.md` SHALL state, in "Adding an OWID-backed category (end to end)", that a provider-backed category assembles its payload through `ProviderSnapshotService.resolve` (serving `meta.stale` and `meta.fetchedAt`), passes `fetchedAt` and `stale` to `buildOwidEnvelope`, and registers its web page with `defineProviderCategoryPage` (provider name, optional freshness override); it SHALL list `common/snapshots/` and the new web pieces in the structure tree and mention `SNAPSHOT_BUCKET` and `SNAPSHOT_PREFIX`. The resilience item SHALL be removed from `ROADMAP.md` and the remaining IDs renumbered without gaps.

#### Scenario: AGENTS.md carries the fallback steps

- **WHEN** `AGENTS.md` is read
- **THEN** the OWID-backed category recipe names `ProviderSnapshotService.resolve`, `defineProviderCategoryPage` and the stale/unavailable behavior, and the structure tree lists `common/snapshots/`

#### Scenario: Roadmap is continuous

- **WHEN** `ROADMAP.md` is read
- **THEN** it has no block for the closed resilience item and no gap in the remaining `Pxx`/`Dxx`/`Ixx` sequences, with every cross-reference updated

### Requirement: Registry entries declare their data date

`CategoryPageDefinition` SHALL accept an optional `lastModified: (data: T) => string | undefined` returning the ISO 8601 date the shown data last changed: `meta.source.lastUpdated`, unless a section declares `dataDate`. `defineProviderCategoryPage` SHALL derive it from the state's payload and return `undefined` for a state without payload. `ProviderSectionOptions` SHALL accept an optional `dataDate: (payload: P) => string | undefined` for a provider whose `meta.source.lastUpdated` is the retrieval time rather than an upstream update date; a section that declares it is dated by it instead of its meta. `defineSectionedProviderCategoryPage` SHALL return the latest date across the sections that have a payload, or `undefined` when none has. The `ocean-health` sea level section (NOAA LSA, which publishes no update date) SHALL declare its last observation, `data.endDate`. `lib/categoryPages.tsx` SHALL export `getCategoryLastModified(category): Promise<Date | undefined>`, which reads the category through `loadCategoryData` and its definition's `lastModified`, and resolves to `undefined` when the category has no entry, no `lastModified`, an unparseable date, or when the read rejects.

#### Scenario: A provider-backed category reports its payload date

- **GIVEN** a provider-backed entry whose payload has `meta.source.lastUpdated` `2026-11-20T00:00:00.000Z`
- **WHEN** `getCategoryLastModified` is called for it
- **THEN** it resolves to that date

#### Scenario: A sectioned category reports its latest section date

- **GIVEN** a sectioned entry whose sections were last updated on `2026-10-01` and `2026-11-15`, and a third section unavailable without payload
- **WHEN** its `lastModified` is evaluated
- **THEN** it returns the `2026-11-15` date

#### Scenario: A failed read has no date

- **GIVEN** a registered category whose read rejects
- **WHEN** `getCategoryLastModified` is called for it
- **THEN** it resolves to `undefined` and does not reject

#### Scenario: A category without dated data has no date

- **WHEN** `getCategoryLastModified` is called for `water-footprint`
- **THEN** it resolves to `undefined`

#### Scenario: A section dated by its data, not its retrieval

- **GIVEN** the `ocean-health` entry whose only section with a payload is sea level, with `data.endDate` `2025-02-15` and a `meta.source.lastUpdated` set to the retrieval time
- **WHEN** its `lastModified` is evaluated
- **THEN** it returns `2025-02-15`

### Requirement: A failed section is hidden, not the page

`defineSectionedProviderCategoryPage` SHALL read every section concurrently and settle each one independently. A section whose read rejects SHALL resolve to the state `{ kind: 'failed' }`, which `ProviderBackedContent` and the section components render as nothing (no heading, no content, no notice) and from which no key figure, structured data or `lastModified` is derived. Each failed section SHALL be reported with `Sentry.captureException`, tagged with its section key (`tags: { section }`; section keys are unique across categories), through `reportSectionFailure` (`lib/sectionFailureReporter.ts`), which reports a section at most once per 6 hours per server instance, so a degraded page regenerating every few minutes cannot exhaust the Sentry event limit. A page with a failed section SHALL count as degraded (`isDegraded`), so it leaves the 24 h cache within `DEGRADED_REVALIDATE_SECONDS`. When every section's read rejects, the load SHALL reject with the first section's error and report nothing itself (the request error hook reports it).

#### Scenario: One section fails

- **GIVEN** a sectioned entry with three sections whose second read rejects
- **WHEN** it loads
- **THEN** it resolves with the second section in the `failed` state and the other two resolved as usual
- **AND** the failure is reported once through `reportSectionFailure` with the section key and that error
- **AND** `isDegraded` is `true`

#### Scenario: Every section fails

- **GIVEN** a sectioned entry whose reads all reject
- **WHEN** it loads
- **THEN** it rejects with the first section's error and no section failure is reported

#### Scenario: A failed section renders nothing

- **WHEN** `ProviderBackedContent` renders a `failed` state
- **THEN** it renders nothing

#### Scenario: A sustained failure is reported once per window

- **GIVEN** a section that keeps failing on every regeneration
- **WHEN** it fails again within 6 hours of its last report
- **THEN** no new Sentry event is sent; after 6 hours it is reported again

### Requirement: Category data failure keeps the category and a warning

`apps/web/src/app/[category]/error.tsx` SHALL be the error boundary of category pages. It SHALL render the category header of the current slug (from `useParams`) and, in place of the content, for a server error (one with a `digest`) the same neutral warning panel as a provider outage (`DataUnavailable`, without a provider name: "We couldn't load this data right now"), and for an error raised in the browser (no `digest`) a generic `role="alert"` message ("Something went wrong"), plus a "Try again" control that calls `retry` (re-fetch and re-render). It SHALL report to Sentry only an error without a `digest`, like the root boundary. It SHALL NOT change the response status (a failed server render stays a `5xx`) and SHALL NOT render the not-found page, which stays reserved for invalid routes. The page cache SHALL keep `expire` at 30 days, so a failed regeneration keeps serving the last successfully rendered page for up to 30 days before this boundary is reached.

#### Scenario: Category data fails with no cached page

- **GIVEN** a category whose load rejects and no cached render of it
- **WHEN** the category is requested
- **THEN** the response status is `500`
- **AND** the page shows the category icon and `<h1>` and the "Data temporarily unavailable" panel, not "Oops! Something went wrong…"

#### Scenario: Client errors are reported once

- **GIVEN** an error without a `digest`
- **WHEN** the boundary renders
- **THEN** `Sentry.captureException` is called with it; with a `digest` it is not

#### Scenario: Stale page outlives a failing regeneration

- **WHEN** `loadCategoryData` sets its cache lifetime
- **THEN** `expire` is 30 days for both the healthy and the degraded lifetimes

#### Scenario: A browser error is not presented as missing data

- **GIVEN** an error without a `digest`
- **WHEN** the boundary renders
- **THEN** it shows "Something went wrong" with the category header and "Try again", and no data unavailable panel
