## Why

`sitemap.ts` sets `lastModified: new Date()` on every entry, so the sitemap always says "now". Google ignores a `lastmod` that does not track real content changes, so the field carries no signal today. The data the pages show already carries a real date: every provider-backed and static payload has `meta.source.lastUpdated`, the upstream data's last update.

## What Changes

- Each live category entry carries the latest `meta.source.lastUpdated` of the data its page shows (the latest across sections for sectioned pages).
- The home and data sources entries carry the latest date across all categories.
- An entry whose date is unknown (the read failed, or the payload has no `meta`, as `water-footprint`) omits `lastModified` instead of inventing one.
- The sitemap is rendered at request time (`connection()`), so `next build` never reads the BFF; the reads go through the same cached `loadCategoryData` the pages use, so the sitemap costs no extra BFF traffic in the normal case.
- The category registry gains an optional `lastModified(data)` per definition, derived by the generic provider helpers; static categories declare their own.

## Impact

- Web only: `app/sitemap.ts`, `lib/categoryPages.tsx`, unit tests, the sitemap E2E check.
- No API or shared type change.
- Specs: `sitemap`, `sitemap-and-robots`, `category-page-registry`.
