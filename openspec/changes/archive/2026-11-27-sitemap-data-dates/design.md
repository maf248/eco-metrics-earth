## Context

`loadCategoryData(category)` (`lib/categoryPages.tsx`) is the cached read of a category page (`use cache`, `cacheLife` of 24 h, 5 min when degraded). Its result shape depends on the registry entry: a `ProviderPageState`, a record of section states, or a static payload. Every payload with `meta` carries `meta.source.lastUpdated` (ISO 8601, the upstream data's last update; for static datasets, the dataset's own date).

## Decisions

### The date comes from the registry, not from the sitemap

`CategoryPageDefinition` gains `lastModified?: (data: T) => string | undefined`. `defineProviderCategoryPage` derives it from the state's payload (absent for an unavailable state without payload); `defineSectionedProviderCategoryPage` takes the latest across the sections that have a payload; `waste-recycling` reads its payload's `meta`; `water-footprint` (no `meta`) declares none. The sitemap stays generic: it never knows a payload shape.

A new exported `getCategoryLastModified(category): Promise<Date | undefined>` calls `loadCategoryData` and the definition's `lastModified`, and returns `undefined` on any failure (the page itself reports BFF failures; the sitemap must never fail because of one category).

### Request time, never build time

With Cache Components, a route handler that calls a `use cache` function is prerendered at build time, which would make `next build` read the BFF. `sitemap.ts` awaits `connection()` first, so it renders per request. The underlying reads are the pages' own cached reads (in-memory `use cache` plus the fetch Data Cache), so a crawler request normally costs no BFF call. All categories are read concurrently; `maxDuration = 30` matches the category page (worst case 2 attempts x 10 s).

### Home and data sources

Both summarise every category, so they carry the latest known date across categories; with none known, they omit it.

### Alternatives considered

- **Deploy date:** simpler, but it changes on every web deploy even when no data changed, which is the same lack of signal as today.
- **`meta.fetchedAt`:** the retrieval time, which moves every day whether the data changed or not.

## Risks

- A sitemap request on a cold instance may read the BFF for every category; it is bounded by `maxDuration` and the same retry as the pages.
