## ADDED Requirements

### Requirement: A failed section is hidden, not the page

`defineSectionedProviderCategoryPage` SHALL read every section concurrently and settle each one independently. A section whose read rejects SHALL resolve to the state `{ kind: 'failed' }`, which `ProviderBackedContent` and the section components render as nothing (no heading, no content, no notice) and from which no key figure, structured data or `lastModified` is derived. Each failed section SHALL be reported with `Sentry.captureException`, tagged with its section key (`tags: { section }`; section keys are unique across categories). A page with a failed section SHALL count as degraded (`isDegraded`), so it leaves the 24 h cache within `DEGRADED_REVALIDATE_SECONDS`. When every section's read rejects, the load SHALL reject with the first section's error and report nothing itself (the request error hook reports it).

#### Scenario: One section fails

- **GIVEN** a sectioned entry with three sections whose second read rejects
- **WHEN** it loads
- **THEN** it resolves with the second section in the `failed` state and the other two resolved as usual
- **AND** `Sentry.captureException` is called once with that error
- **AND** `isDegraded` is `true`

#### Scenario: Every section fails

- **GIVEN** a sectioned entry whose reads all reject
- **WHEN** it loads
- **THEN** it rejects with the first section's error and `Sentry.captureException` is not called

#### Scenario: A failed section renders nothing

- **WHEN** `ProviderBackedContent` renders a `failed` state
- **THEN** it renders nothing

### Requirement: Category data failure keeps the category and a warning

`apps/web/src/app/[category]/error.tsx` SHALL be the error boundary of category pages. It SHALL render the category header of the current slug (from `useParams`) and, in place of the content, the same neutral warning panel as a provider outage (`DataUnavailable`, without a provider name: "We couldn't load this data right now"), plus a "Try again" control that calls `retry` (re-fetch and re-render). It SHALL report to Sentry only an error without a `digest`, like the root boundary. It SHALL NOT change the response status (a failed server render stays a `5xx`) and SHALL NOT render the not-found page, which stays reserved for invalid routes. The page cache SHALL keep `expire` at 30 days, so a failed regeneration keeps serving the last successfully rendered page for up to 30 days before this boundary is reached.

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
