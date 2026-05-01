## Why

Any unrecognised URL in the app — including invalid category slugs like `/papa/` — rendered a dynamic page with the slug as its title instead of returning a proper 404. This produced confusing UX, exposed internal URL structure on-screen, and gave wrong HTTP status codes to crawlers and clients.

## What Changes

- Add a custom `not-found.tsx` page (Next.js App Router convention) that returns HTTP 404 with a branded error screen: error SVG icon (clickable, links back to home), a generic human-readable message, and no URL disclosure.
- Add slug validation to `[category]/page.tsx` and its `generateMetadata`: call `notFound()` for any slug not present in `ECO_CATEGORIES`, so invalid routes are handled uniformly.
- Export `NOT_FOUND_ICON` constant from `categoryIcon.ts` for use by the not-found page.
- Double the size of the home page logo icon (`64×64` → `128×128`) to improve visual impact at the hero position.
- Fix a pre-existing `rootDir` misconfiguration in `apps/web/tsconfig.json` that was breaking the production build.

## Capabilities

### New Capabilities

- `not-found-page`: Custom Next.js 404 page — branded error screen with error icon, generic copy, no URL disclosure, and a link back to home.

### Modified Capabilities

- `web-app-scaffold`: `apps/web/tsconfig.json` — remove `rootDir`, `outDir`, `tsBuildInfoFile`, and `incremental` (irrelevant for a `noEmit: true` Next.js app; were causing `rootDir` compile errors).

## Non-Goals

- Custom error pages for other HTTP status codes (500, 403, etc.).
- Animated or highly styled error pages.
- Logging or analytics on 404 hits.

## Impact

- `apps/web/src/app/not-found.tsx` — new file
- `apps/web/src/app/[category]/page.tsx` — slug validation added
- `apps/web/src/lib/categoryIcon.ts` — `NOT_FOUND_ICON` export added
- `apps/web/src/app/page.tsx` — home logo size doubled
- `apps/web/tsconfig.json` — removed output-related compiler options
- `apps/web/__tests__/` — new and updated test files, updated snapshots
