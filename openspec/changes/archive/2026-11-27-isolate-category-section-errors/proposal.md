## Why

On the sectioned category pages (`ocean-health`, `deforestation`) only a provider outage is isolated in its own section. Any other failure of a single section's read (a `404` during a deploy mismatch, a payload of another shape, a `500` of our own BFF) rejects the whole page load and shows the generic root `error.tsx` ("Oops! Something went wrong…"), hiding every section that did load. And when a category's data fails entirely, the visitor gets that same generic error instead of the category with a clear "data unavailable" state.

## What Changes

- **Partial failure:** when one section's read rejects (anything that is not a provider outage, which keeps its snapshot, notice and unavailable states), the section is hidden entirely (heading and content), the rest of the page renders normally, and the error is reported to Sentry tagged with its section. The page counts as degraded, so it leaves the cache within minutes like a provider outage.
- **Total failure:** when every section's read rejects (or the only read of a single-source page rejects), the load still throws: nothing is cached from it and the last successfully rendered page keeps being served while it is within the cache's 30-day expiry (Next's documented behavior on a failed regeneration). This is the stale-if-error window; this change keeps it at 30 days, aligned with the provider "unavailable after 30 days" rule, and locks it with tests.
- **No cached version at all** (first render after a deploy, or past expiry): the category gets its own `error.tsx` that keeps the category header and shows the warning panel of the provider outage ("Data temporarily unavailable"), with the same `5xx` status as today. `not-found` stays reserved for invalid routes.

## Impact

- Web only: `lib/categoryPages.tsx`, `ProviderBackedContent`, `OceanSection`, `OceanHealthContent`, `DeforestationContent`, `DataUnavailable`, a new `app/[category]/error.tsx`, unit and E2E tests, `docs/design-system.md`.
- No API or shared type change. No configuration change.
- Specs: `category-page-registry`, `ocean-health-page`, `deforestation-page`.
