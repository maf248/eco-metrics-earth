# Design

## Context

See `proposal.md` for motivation. State before this change:

- `app/[category]/loading.tsx` wrapped the whole page, including the static icon and `<h1>`. `app/[category]/layout.tsx` calls `notFound()` above that boundary to keep a real 404.
- Registered categories were rendered on demand and cached (`revalidate = 86400`, `dynamicParams = true`), and placeholders were pre-rendered. `next build` must never call the BFF.
- `bffFetch.ts` reads with two attempts, the fetch Data Cache at 24 h, `no-store` after a shape mismatch, and 300 s after a provider `502`. Failures throw so that a bad render is never cached.
- `<main>` was rendered by each page, so nothing reserved its height during a navigation. The footer follows `{children}` in the root layout.
- Next.js 16.4.2, React 19.3, Vercel Hobby.

The approved design used a `(categories)` route group and a `<Suspense>` around the data. The spike disproved the second part and the first stopped being needed; D2 and D5 record what replaced them.

## Goals / Non-Goals

**Goals:**

- Keep the observable caching contract while replacing the mechanism.
- Make the header independent of network and of the data lifecycle.

**Non-Goals:**

- Replacing the BFF retry or snapshot logic.
- Using skeletons on direct visits.

## Decisions

### D1. Validate with a spike before relying on the migration

Go/no-go criteria, measured on a production build with the OWID fixture server:

| #   | Criterion                                                                                      | Result                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Cached category page has visible `<h1>` and content in direct HTML, no hidden stream container | Pass on all four data categories, a placeholder and `/data-sources/`                                            |
| 2   | Client navigation shows the header before delayed data                                         | Pass: 50–120 ms with a 1.2 s delay on the route payload                                                         |
| 3   | Unknown slug returns 404 with no BFF call                                                      | Pass                                                                                                            |
| 4   | Failing BFF neither replaces the last good page nor caches a failure                           | Pass: API down on first render gives 500 with nothing cached; API down at revalidation keeps the last good page |
| 5   | Builds and serves on Vercel Hobby within `maxDuration`                                         | **Not verified**: it needs a pushed preview                                                                     |

The spike ran in the working tree instead of a throwaway branch, because its results became the implementation.

### D2. One persistent `<main>` and an optimistic pending view

The root layout renders `NavigationContent`, the only `<main id="main-content">` of the site, and pages render a plain wrapper inside it. Links go through `NavigationLink`, which runs the navigation in `PendingNavigationProvider` (`useTransition` plus `useOptimistic`), so the destination is known at click time. While a category is pending, `NavigationContent` shows its header and skeletons in place of the current page, which stays mounted and hidden.

- A navigation from any route is covered, including home and `/data-sources/`. A layout-level header reading the segment would have covered only category-to-category moves, and only once the URL commits, which is after the route payload arrives.
- The real `<h1>` still comes from the server on direct visits, through `CategoryHeader` in `[category]/page.tsx`.
- Cache Components keeps old routes in hidden `<Activity>`, so a page-owned `<main>` would duplicate the landmark and its id. A root `<main>` avoids this for every route, including `error.tsx` and `not-found.tsx`.

Rejected: the `(categories)` route group, which adds a level without solving either problem.

### D3. Adopt Cache Components and Partial Prefetching; caching is declared per read

Both flags are on. `revalidate`, `dynamicParams` and `dynamic = 'force-static'` exports are gone. `loadCategoryData` wraps each registry `load` in `use cache` with `cacheLife({ stale, revalidate, expire })`: one day, or `DEGRADED_REVALIDATE_SECONDS` when the definition's `isDegraded` says the provider was unavailable.

- Thrown failures are not cached (criterion 4).
- `new Date()` in `defineProviderCategoryPage.load` runs inside the cached scope, so freshness is evaluated once per generation.
- The `fetch` Data Cache stays underneath because `use cache` is in-memory on serverless and does not survive deploys.
- `/data-sources/` uses `instant = false` and `await connection()`: it stays per-request, and a client navigation to it blocks as it did. `sitemap.xml` becomes a dynamic route in the build output because of `new Date()`, which does not change what it serves.
- `og-image.png` drops `force-static`, which Cache Components rejects.

Rejected: ISR plus intent prefetch cannot deliver complete direct HTML; pre-rendering provider pages at build makes the build depend on the BFF.

### D4. `ensureStatic = 'navigation'` on `[category]/page.tsx`

The first visit after a deploy waits for the complete page, so a crawler can never get a partial one. Chosen over a shell-then-upgrade first visit, which would put skeletons in direct HTML. Under `ensureStatic`, `use cache` needs `expire` ≥ 5 min, `stale` ≥ 30 s and `revalidate` ≠ 0; the lifetimes above comply. It also needs `generateStaticParams` to return at least one param, guarded by a unit test. The route blocks on purpose, so it declares `instant = false`, which only turns off the framework's instant-navigation validation; the feedback comes from D2.

### D5. No Suspense around the data

React outlines any Suspense boundary over 12,800 bytes (`progressiveChunkSize`, not configurable from Next) into `<div hidden id="S:0">` after the footer. With a boundary around the data, large pages can never have their content inline, which is the first goal of the change. So the page awaits its data at the top, and the skeletons live only in the client pending view.

Blocks are declared in `lib/categorySkeletons.ts`, which is client-safe because `categoryPages.tsx` imports server code. A unit test keeps its keys equal to `CATEGORY_PAGES`. `CategoryDataSkeleton` renders them with `ChartSkeleton` and the core `well`, `well-active` and `hover` tokens, which replace the legacy `skeleton*` tokens, removed with their only consumer.

### D6. Real 404 for unknown slugs

The slug check stays in `[category]/layout.tsx`. With `ensureStatic` it returns a real 404. `proxy.ts` was not needed. The 404 response carries the page in its route payload with an empty `<body>`, so it needs JavaScript to draw, unlike an unmatched path; status and `noindex` are correct, so a proxy on every request was not worth it.

### D7. Stable footer

The root `<main>` has `min-h-screen`, at the only level that does not change during navigation.

### D8. Feedback with platform primitives

`<ViewTransition>` wraps the page in `NavigationContent`, with the duration in `globals.css` and a `prefers-reduced-motion` override. `NavigationProgress` shows a thin token-coloured bar after 200 ms, driven by the pending state of D2 rather than `useLinkStatus`, which only reaches components inside a `Link`. No new runtime dependency.

### D9. Prefetch budget

Default `<Link>` behaviour stays, with no `prefetch={true}`. `NavigationLink` asks for the chart chunk on pointer enter, focus and navigation when the destination draws a chart.

### D10. Charts load without `next/dynamic`

`next/dynamic` puts charts behind a Suspense boundary, which delayed the first chart by about 800 ms even with the chunk loaded. `lazyChart` keeps the chunk on demand and client-only with plain state, draws synchronously once loaded (about 120 ms after commit) and retries a failed import when a chart mounts. `EChart` shortens the entry animation to 300 ms, because the old default made lines feel slow. Effects in `EChart` and `RenderWhenVisible` are cleaned up on hide and recreated on show under `<Activity>`.

## Risks / Trade-offs

- [The first visit after a deploy waits for the BFF] → Accepted for complete HTML; `maxDuration = 30` covers the worst case. A client navigation shows the header and skeletons meanwhile.
- [Vercel behaviour is unverified] → Criterion 5 stays open until a preview exists. Rollback is a revert; the Data Cache and API are unaffected.
- [Every link goes through a client component] → `Navbar` already shipped the icons; the extra code is small.
- [All categories registered some day] → A unit test fails when static params become empty.

## Migration Plan

1. Deploy to a preview and verify criterion 5 and the original recording.
2. No API change is involved, so no deployment order applies.
