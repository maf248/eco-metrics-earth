## Why

In production the sitemap dates `/ocean-health/`, and through it `/` and `/data-sources/`, at the time of the last request. NOAA LSA publishes no update date, so the API sets the sea level payload's `meta.source.lastUpdated` to its retrieval time (`lastUpdatedBasis: 'retrieval'`), and the category takes the latest date of its sections. A `lastmod` that moves every day while the data does not (the series ends in February 2025) teaches search engines to ignore the site's `lastmod`. The page's `Dataset` JSON-LD has the same problem: its `dateModified` is the latest `lastUpdated` of the sections, so the retrieval time too.

## What Changes

- A section of a sectioned category can declare `dataDate`, the date its data last changed, read from its payload.
- The sea level section declares its last observation, `data.endDate`.
- The ocean-health `Dataset` JSON-LD dates sea level by `data.endDate` as well.

## Impact

- Web only: `lib/categoryPages.tsx`, `lib/oceanHealthStructuredData.ts` and their tests. The API and the shown "Last updated" are unchanged.
- Specs: `category-page-registry`, `ocean-health-page`.
