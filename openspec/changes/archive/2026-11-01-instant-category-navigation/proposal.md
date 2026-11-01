# Proposal

## Why

Navigating to a category with live data shows the footer jumping to the top of an empty page (0.35-1.55 s on the develop preview) and then a skeleton covering the title and icon (1.4-1.9 s), although both are static config. On direct visits, even cached pages send that fallback first and the real `<main>` afterwards inside a hidden `div`, so the `<h1>` is not visible in the delivered HTML until a script swaps it in.

The cause is one page-wide `loading.tsx` boundary. It cannot tell a direct visit, which should arrive complete, from a client navigation, which should only wait where data is missing.

## What Changes

- A direct visit to a category page delivers complete, visible, server-rendered HTML: heading, intro, key figures, tables and structured data, with no fallback and no hidden streamed content.
- On a client navigation to a category, from any route, the icon and title appear immediately from shared config, with no network wait and no skeleton over them. Placeholder categories never show a skeleton.
- Skeletons appear only in the regions still waiting, on client navigation and for client-rendered charts, shaped by a small per-category declaration and fitted to the charts they stand for.
- The footer never jumps during navigation.
- A short crossfade accompanies category changes, plus a thin top progress bar shown only when a navigation takes longer than about 200 ms. Both respect `prefers-reduced-motion`.
- **BREAKING (internal):** the web app adopts Cache Components and Partial Prefetching. `revalidate` and `dynamicParams` segment exports and the `[category]/loading.tsx` file are removed, and the site's single `<main>` moves to the root layout. The observable caching contract stays: daily freshness, a build that never needs the BFF, and failures that are never cached.
- The migration starts with a validation spike with go/no-go criteria. A no-go stops the change and returns the decision to the user.

## Non-Goals

- Server-side rendering of ECharts charts: they stay client-rendered behind a same-height skeleton.
- Prefetching every provider page in full on every view.
- A page-wide overlay during navigation.
- Changes to BFF endpoints, wire types or provider snapshot behavior.
- Pre-rendering provider-backed categories at build time.
- Changes to the home page beyond what the framework migration requires.

## Capabilities

### New Capabilities

- `category-navigation-loading`: what a visitor sees and when, on direct visits and client navigations between categories: instant header, scoped skeletons, stable footer, transition feedback.

### Modified Capabilities

- `static-category-pages`: the caching contract is stated by behavior instead of segment exports, and the `loading.tsx` rationale for the 404 check is removed.
- `category-page-registry`: each registered category declares its skeleton blocks in a client-safe record.
- `water-footprint-page`: the ISR requirement no longer names the `revalidate` export.
- `co2-emissions-page`: there is no Suspense boundary around the fetch, and `revalidate` is no longer named.
- `global-temperature-page`: `revalidate` is no longer named.
- `energy-sources-page`: `revalidate` is no longer named.
- `skip-to-content`, `skip-link-focus`: the `<main>` landmark moves from each page to the root layout.
- `nav-items`, `mobile-header-brand`: `pt-14` moves from `<main>` to the page's outermost element.
- `site-footer`: the footer follows the `<main>` that holds `{children}`.
- `chart-foundation`: charts load on demand without `next/dynamic`, and skeletons take the chart's shape.

## Impact

- **Code:** `apps/web/next.config.ts`, `[category]` route files, `src/lib/categoryPages.tsx`, root layout and every page's outer element, `/data-sources/`, `Navbar`/`NavLink`, chart lazy loading, and new header, skeleton, pending-navigation, transition and progress components.
- **Tests:** `loading.test.tsx` is replaced; page, layout and registry unit tests and snapshots are updated; E2E navigation and SEO specs are extended.
- **Dependencies:** none.
- **Docs:** `docs/design-system.md`, `AGENTS.md`, `README.md` if architecture notes change.
- **Deploy:** the first visit after a deploy waits for the complete page. The API is not affected.
