# Tasks

## 1. Validation spike (go/no-go)

- [x] 1.1 Enable `cacheComponents` and `partialPrefetching`, make `[category]` and `/data-sources/` build, and verify `npx nx build web` passes with no API listening
- [x] 1.2 Against a production build with the OWID fixture server, verify criteria 1-4 of design D1 and capture the HTML and timing evidence
- [x] 1.4 Record the results and decisions in `design.md`

## 2. Stable shell

- [x] 2.1 Render the only `<main>` in the root layout through `NavigationContent`, reserving the content height, and verify with an E2E test that the footer stays at or below the viewport edge during a delayed navigation
- [x] 2.2 Replace `<main>` with a plain wrapper on every page and keep `pt-14` there, then verify one `<main id="main-content">` on every route
- [x] 2.3 Add `CategoryHeader`, and verify with unit tests for registered and placeholder categories
- [x] 2.4 Add `PendingNavigationProvider` and `NavigationLink`, use them in `NavLink`, `Navbar` and `/data-sources/`, and verify the header appears from category and non-category routes
- [x] 2.5 Update `AGENTS.md` and verify the documented paths exist

## 3. Cache Components migration

- [x] 3.1 Enable both flags, remove `revalidate` and `dynamicParams` from `[category]/page.tsx`, add `ensureStatic = 'navigation'`, then verify the page module test and the build without the BFF
- [x] 3.2 Cache registry reads in `loadCategoryData` with a daily lifetime and 300 s when degraded, and verify unit tests for both lifetimes and for a thrown failure
- [x] 3.3 Keep `fetchEnvelopeFromBff` retry and shape healing working under the cached scope, and verify the `bffFetch` tests pass unmodified
- [x] 3.4 Move `/data-sources/` to `instant = false` with `connection()`, and verify its build without the BFF
- [x] 3.5 Verify a status 404 for unknown slugs with no BFF request
- [x] 3.6 Add a unit test that fails when `generateStaticParams` returns an empty list
- [x] 3.7 Verify `EChart` and `RenderWhenVisible` under hidden `Activity` routes with a back-navigation E2E test
- [x] 3.8 Update the `AGENTS.md` notes on the Data Cache and on adding a category

## 4. Skeletons and charts

- [x] 4.1 Add `CategoryDataSkeleton` and `CATEGORY_SKELETONS` using only documented tokens, and verify unit tests plus `designTokens.test.ts`
- [x] 4.2 Delete `loading.tsx` and `loading.test.tsx`, and verify a placeholder category renders no skeleton
- [x] 4.3 Verify that the keys of `CATEGORY_SKELETONS` match `CATEGORY_PAGES`
- [x] 4.4 Verify with Playwright that CLS on the swap stays under 0.1
- [x] 4.5 Add the `series` and `donut` variants of `ChartSkeleton`, and replace `next/dynamic` with `lazyChart`, with unit tests
- [x] 4.6 Document the skeleton rule and chart loading in `docs/design-system.md`

## 5. Navigation feedback

- [x] 5.1 Add the crossfade with `ViewTransition` and a reduced-motion override
- [x] 5.2 Add `NavigationProgress` with the 200 ms delay, and verify fast and slow navigations with fake timers and an aria-hidden bar
- [x] 5.3 Document the transition and the progress bar in `docs/design-system.md`

## 6. Integration

- [x] 6.1 Extend `seo.spec.ts` to assert complete non-hidden HTML, JSON-LD and no `aria-busy` on provider pages and a placeholder
- [x] 6.2 Cover the instant header with a delayed route payload; `@next/playwright` is not used, because the delay also exercises the skeletons and the footer and needs no new dependency
- [x] 6.3 Verify the prefetch budget by inspecting network payloads on an idle page
- [x] 6.4 Run a11y E2E and `npm run lint`, `npm run build`, `npm run test`, `npm run e2e`, and confirm zero errors

## Deferred verification

These need a pushed preview, so they run after this change lands:

- 1.3 On a Vercel preview, verify criterion 5
- 6.5 On the `develop` preview, re-record the navigation from the original evidence and compare footer, header and skeleton timing
