## Context

`defineSectionedProviderCategoryPage` runs the section reads with `Promise.all`, so one rejected read rejects the whole load. `loadCategoryData` (`use cache`, `cacheLife({ stale, revalidate, expire: 30 days })`) never stores a failure. The root `error.tsx` is the only boundary, so a category failure loses the category header and shows a generic message.

## Decisions

### `failed` is a section state, not a page state

`SectionState<P> = ProviderPageState<P> | { kind: 'failed' }`, used only by `SectionStates`. Single-source pages keep `ProviderPageState`, so nothing changes for them. `ProviderBackedContent` accepts `SectionState` and returns `null` for `failed`; `OceanSection` and `DeforestationSection` return `null` before drawing their card and heading; the `shownPayload` helpers already return `undefined` for any state without a shown payload, so key figures and JSON-LD skip the section.

### Settle, report, throw only when nothing is left

The load uses `Promise.allSettled`. Rejections become `failed` states and are reported with `Sentry.captureException(error, { tags: { section } })`: the registry does not know its slug, and the section keys are unique across categories (`sst`, `anomaly`, `heat`, `seaLevel`, `ph`, `forestArea`, `treeCoverLoss`), so the tag identifies both; the error message also names the data. A sustained section failure is re-reported on each degraded regeneration (every 5 minutes), which Sentry groups into one issue (`bffFetch` already logs each failed attempt). If every section rejected, the load rethrows the first reason: the request then fails like any other category, is reported once by `onRequestError`, and nothing is cached. A partial result counts as degraded, so the hidden section comes back within 5 minutes.

### Stale-if-error comes from the page cache

Next serves the last successfully generated page when a regeneration throws (ISR guide: "the last successfully generated data will continue to be served from the cache"), and the fetch Data Cache keeps BFF responses across deployments. Both already apply; the decision is to keep `expire` at 30 days (aligned with the provider "unavailable after 30 days" rule) and cover it with a unit test of the `cacheLife` call, plus a one-off local check against a production build (cache lifetime shortened in a scratch copy, API stopped, page still served).

Known limit: a page served stale from cache shows the freshness notices evaluated when it was rendered.

### Category boundary

`app/[category]/error.tsx` (client) reads the slug with `useParams`, renders `CategoryHeader` inside `CATEGORY_PAGE_CLASS_NAME` and `DataUnavailable` without a provider name, with a secondary "Try again" button calling `retry` (Next 16: re-fetches and re-renders, unlike `reset`), which recovers once the data is back. An unknown slug never reaches it (the rewrite sends it to the not-found page). The status code of a failed server render is not changed by an error boundary.

`DataUnavailable.providerName` becomes optional: without it the text reads "We couldn't load this data right now. We're keeping an eye on it and it should be back soon."

## Alternatives considered

- **Show a warning in the failed section's slot** instead of hiding it: rejected by the product decision; the error still reaches Sentry and the logs.
- **Render the warning with `200`** on a total failure: Google could index an empty page; a `5xx` tells crawlers the outage is temporary.
