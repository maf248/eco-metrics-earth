# Tasks

## 1. Live categories configuration

- [x] 1.1 Add `apps/web/src/lib/liveCategories.ts` with `isLiveCategory`, `LIVE_CATEGORIES` (navigation order) and `LIVE_CATEGORY_SUMMARIES`; verify with `__tests__/lib/liveCategories.test.ts` (order, summaries keys equal the live set, each summary at most 120 characters); the existing `CATEGORY_SKELETONS` test in `__tests__/lib/categoryPages.test.tsx` keeps the live set equal to `CATEGORY_PAGES`
- [x] 1.2 Use `isLiveCategory` in `CategoryHeader` for the "coming soon" line; verify its existing tests pass unchanged
- [x] 1.3 Run `npx nx test web` and confirm the suite is green with no warnings

## 2. Indexing of placeholder categories

- [x] 2.1 Add `robots: { index: false, follow: true }` to `generateMetadata` for categories that are not live; verify with unit tests in `__tests__/app/[category]/page.test.tsx` (placeholder is noindex/follow, live has no `robots`)
- [x] 2.2 List only `LIVE_CATEGORIES` in `sitemap.ts`; update `__tests__/app/sitemap.test.ts` (entry count, no placeholder URL)
- [x] 2.3 Update `e2e/seo.spec.ts`: sitemap entry count and slugs, `noindex, follow` on a placeholder page, none on a live page, the home and data sources
- [x] 2.4 Run `npx nx test web` and confirm the suite is green

## 3. Home page

- [x] 3.1 Add `apps/web/src/lib/siteStructuredData.ts` (`buildSiteJsonLd`) with a unit test for the `WebSite` and `Organization` nodes and their URLs
- [x] 3.2 Rewrite `apps/web/src/app/page.tsx` per design (hero, topics cards, data sources block, JSON-LD), reading `docs/design-system.md` first and using tokens only; verify by rendering it in `__tests__/app/page.test.tsx`
- [x] 3.3 Update `__tests__/app/page.test.tsx` and its snapshot: single `<h1>` text, no "coming soon", one card per live category in order with `<h3>` and link, no placeholder link, data sources link, JSON-LD script, no `<main>`
- [x] 3.4 Update E2E: home assertions in `e2e/navigation.spec.ts`, complete-HTML check for `/` and JSON-LD in `e2e/seo.spec.ts`, and a card navigation check; keep the home axe audit passing in both themes
- [x] 3.5 Document the home layout and card pattern in `docs/design-system.md`, and add the card summary step to the new-category recipe in `AGENTS.md`
- [x] 3.6 Add `SmoothAnchor` (client) and its `html.anchor-scrolling` rule in `globals.css` (motion-safe) for the hero call to action; verify with `__tests__/components/SmoothAnchor.test.tsx`, the hero E2E and the back/forward scroll restoration E2E
- [x] 3.7 Add `TypewriterText` (server component) and its `typewriter-*` rules in `globals.css`, and use it in the home `<h1>` with the brand mono accent style and `aria-label`; verify with `__tests__/components/TypewriterText.test.tsx`, the home unit tests and the home axe audit
- [x] 3.8 Run `npx nx test web` and `npx nx build web` and confirm both are green

## 4. Category page titles

- [x] 4.1 Add `lib/pageTitleClassName.ts` and use it in the home `<h1>` and in `CategoryHeader`; verify with the `CategoryHeader` unit test (title carries the mono accent classes, no cursor) and the updated snapshots
- [x] 4.2 Update the page-title rule in `docs/design-system.md` and confirm the axe audits of a category page pass in both themes
- [x] 4.3 Run `npx nx test web` and `npx nx build web` and confirm both are green

- [x] 4.4 Apply the reviewer findings: `scroll-mt-header` utility for the topics anchor, home axe audit in both themes, E2E for typing, reduced motion and the scoped smooth scroll, occurrence-based keys in `TypewriterText`, the `category-page-registry` delta, and the `@smoke` tag only on render and pointer checks; verify with `npx nx test web` and the home E2E specs

## 5. Integration checks

- [x] 5.1 Run `npm run lint`, `npm run build` and `npm run test`; confirm zero errors and warnings
- [x] 5.2 Run `npm run e2e` and confirm the suite is green
- [x] 5.3 Run `npx openspec validate home-page-live-categories --strict` and confirm it passes

## Workflow follow-up

- Reviewer audit, then archive with `npx openspec archive home-page-live-categories --yes` before the commit.
- Commit and push only after explicit user approval.
