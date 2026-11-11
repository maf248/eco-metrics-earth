# Proposal

## Why

The home page is still a placeholder: a logo, the brand name as `<h1>` and "coming soon". It
states no value proposition, links to no section and gives search engines nothing to index,
while four categories already ship real data. Meanwhile the eight placeholder category pages
are indexable and listed in the sitemap, so thin content competes with the pages that matter.

## What Changes

- Replace the placeholder home with a server-rendered landing page:
  - A compact hero: the site logo at the size of a category icon, an `<h1>` with the value
    proposition ("Environmental data, made readable", the footer tagline) that types itself
    in with the terminal style of the brand, a one-line description and one call to action
    that scrolls smoothly to the list of topics.
  - One card per category with live data, in navigation order: icon, title, a short
    description and a call to action linking to that category. Categories without data are
    not shown.
  - A short "where the data comes from" block linking to the data sources page.
  - `WebSite` and `Organization` structured data.
- The set of live categories comes from configuration only. Shipping data for a category
  adds its card to the home with one extra line of copy, enforced by a unit test.
- Category page titles take the same monospace accent style as the home headline, without
  the typing animation, so every page title shares the terminal look of the brand.
- Placeholder category pages declare `noindex, follow` and leave the sitemap. They stay
  reachable from the navigation, whose order does not change.

## Non-Goals

- No figures, charts or map previews on the home cards (cards carry no data from the BFF).
- No "coming next" list of placeholder categories on the home.
- No country picker, FAQ block or per-section social image.
- No change to the navigation order or to which categories the navigation lists.
- No check of provider health to decide which cards show: a provider outage is handled by
  the category page itself.
- No change to the home `<title>`, meta description or social metadata.

## Capabilities

### New Capabilities

- `home-page`: content, structure, links and structured data of the home page, and the rule
  that decides which categories it lists.

### Modified Capabilities

- `sitemap`: the sitemap lists only the categories with live data instead of all twelve.
- `page-metadata`: placeholder category pages declare `noindex, follow`; live ones stay
  indexable.
- `category-page-registry`: a category with live data also needs its home card summary.
- `light-mode-styling`: the page title of the home and of category pages uses the accent
  token instead of the primary foreground token.

## Impact

- `apps/web/src/app/page.tsx` (rewritten), `apps/web/src/app/sitemap.ts`,
  `apps/web/src/app/[category]/page.tsx` (`generateMetadata`),
  `apps/web/src/components/CategoryHeader.tsx` (title style, shared through
  `apps/web/src/lib/pageTitleClassName.ts`).
- New `apps/web/src/lib/liveCategories.ts` (live set and card copy) and
  `apps/web/src/lib/siteStructuredData.ts`.
- New `apps/web/src/components/TypewriterText.tsx` (typed headline, CSS-only) and
  `apps/web/src/components/SmoothAnchor.tsx` (animated in-page anchor), with their rules in
  `apps/web/src/app/globals.css`.
- Unit tests and snapshot of the home, sitemap and category metadata; E2E specs for SEO,
  navigation and accessibility of the home.
- `docs/design-system.md` (home layout and card pattern), `AGENTS.md` (the recipe for a new
  category gains the card copy step).
- No API, shared type or dependency change. The home stays fully static: it makes no BFF
  request at build or at runtime.
