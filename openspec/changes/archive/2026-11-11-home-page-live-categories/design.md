# Design

## Context

See `proposal.md` for motivation. Constraints that shape the approach:

- "Is this category live?" already has a client-safe answer: `CATEGORY_SKELETONS`
  (`lib/categorySkeletons.ts`). `CategoryHeader` uses it to decide the "coming soon" line,
  and `__tests__/lib/categoryPages.test.tsx` keeps it in sync with the server-only
  `CATEGORY_PAGES` registry.
- `<main>` exists only in the root layout; pages render a `<div>` with `pt-header`.
- Links that lead to a category use `NavigationLink` (pending navigation, chart preload).
- Colors come only from the design tokens; `docs/design-system.md` is the source of truth.
- The home must stay static: `next build` never depends on the BFF.

## Goals / Non-Goals

**Goals:**

- One derived source for "live categories", consumed by the home, the sitemap and the
  category metadata, with no second flag to keep in sync by hand.
- A home that is plain server-rendered HTML: no data fetch, and no client code beyond the
  scroll animation of the call to action.
- Adding a category to the home costs one line of copy, and forgetting it fails a test.

**Non-Goals:**

- A carousel or any client-side interaction on the home.
- Reordering the navigation or reading provider health.

## Decisions

### 1. Live set derived from `CATEGORY_SKELETONS`, in `lib/liveCategories.ts`

`isLiveCategory(category)` is `category in CATEGORY_SKELETONS`, and `LIVE_CATEGORIES` is
`Object.values(ECO_CATEGORIES).filter(isLiveCategory)`, so it follows navigation order.
`CategoryHeader` switches to `isLiveCategory` for the same decision it makes today.

- _Why not a new `live: boolean` flag per category:_ it would be a third place stating the
  same fact (`CATEGORY_PAGES`, `CATEGORY_SKELETONS`), kept honest only by more tests.
- _Why not `CATEGORY_PAGES`:_ it is server-only and imports every content component; the
  metadata and sitemap could use it, but a single client-safe source is simpler.

### 2. Card copy in the same module, enforced by a test

`LIVE_CATEGORY_SUMMARIES: Partial<Record<EcoCategory, string>>` holds one short sentence per
live category (at most 120 characters). A unit test asserts its keys equal `LIVE_CATEGORIES`; the existing registry test already keeps
`CATEGORY_SKELETONS`, and so the live set, equal to `CATEGORY_PAGES`.

- _Why not reuse the skeleton `intro` text:_ that text must mirror the category page's own
  intro for the skeleton to match; home copy would then be unable to change on its own.
- _Why not `CATEGORY_DESCRIPTIONS`:_ meta descriptions are 110–160 characters and written
  for search snippets; too long for a card.

The card title is `getCategoryMetadataTitle` (e.g. "CO2 Emissions by Country"), which gives
keyword-bearing `<h3>`s; the link text is `Explore <getCategoryTitle>`.

### 3. Page structure (`app/page.tsx`, server component)

- Hero: logo in the `w-24 h-24 rounded-2xl bg-well` container of `CategoryHeader`, the typed
  `<h1>` (decision 5), the shared site description, and a primary button-styled anchor to
  `#topics` (decision 4) on `bg-accent-solid-strong text-on-accent`: white body-size text
  on `accent-solid` is 3.65:1 and fails the axe contrast audit.
- `<section id="topics" aria-labelledby>` with `<h2>Explore the data</h2>` and a `<ul>`
  grid: one column on mobile (cards stack and scroll vertically), two from `sm`. The
  section carries `scroll-mt-*` so the anchor clears the fixed mobile header.
- Card: `<li>` on `surface-card` with border; icon in a small `bg-well` container, `<h3>`,
  summary, and a `NavigationLink` whose `after:absolute after:inset-0` pseudo-element
  stretches over the card. One link per card, so no nested or duplicate links; the card
  shows a focus ring through `has-focus-visible`.
- `<section>` "Where the data comes from": static sentence plus a `LINK_CLASS_NAME` link to
  `/data-sources/`. No provider names are listed: they live in the API catalog and would go
  stale here.
- `JsonLd` with a `@graph` of `Organization` (`@id` `<site>/#organization`, logo
  `/icons/apple-touch-icon.png`, the existing 180×180 PNG) and `WebSite`
  (`@id` `<site>/#website`, `publisher` referencing the organization), built by a pure
  `buildSiteJsonLd(siteUrl)` in `lib/siteStructuredData.ts`.

### 4. Smooth scroll scoped to the call to action

`SmoothAnchor`, a small client component, renders a plain `<a href="#topics">` and, on
click, sets a class on `<html>` for one second; `globals.css` turns that class into
`scroll-behavior: smooth` under `prefers-reduced-motion: no-preference`. The browser still
performs the fragment navigation (hash, focus, history), so the link works without
JavaScript and reduced motion is decided in CSS.

- _Why not `scroll-behavior: smooth` on `<html>` site-wide:_ it animates the browser's own
  scroll restoration on back and forward, which broke the restored position of category
  pages (`data-scroll-behavior="smooth"` only covers Next.js route transitions).
- _Why not `scrollIntoView` with `preventDefault`:_ the handler would have to redo the hash,
  the history entry and the focus move the browser already does.

### 5. Typewriter headline in CSS

`TypewriterText` (server component) renders one `<span>` per character with its position in
`--typewriter-index`, plus a closing cursor. `globals.css` keeps each character hidden for
`index × 45 ms` and shows an out-of-flow cursor after it for one step, a small gap away
from the text; the closing cursor
reuses `animate-cursor-blink`. All of it sits under `prefers-reduced-motion: no-preference`.
The `<h1>` carries `aria-label` and the characters are `aria-hidden`, the usual pattern for
split text.

- _Why not the `BrandText` approach (state + `setInterval`):_ it server-renders an empty
  string, which is fine for a decorative brand inside a labelled link but not for the `<h1>`.
- _Why not a width animation with `steps()`:_ it only works on a single line, and the
  headline wraps on mobile.

### 6. One page-title style, shared

`PAGE_TITLE_CLASS_NAME` (`lib/pageTitleClassName.ts`) holds the mono accent title classes,
used by the home `<h1>` and by `CategoryHeader`. Categories get the style only: their header
also renders in the pending-navigation view, so a typing animation would run twice, and
repeating it on every navigation would delay reading the title. The not-found and data
sources titles are left as they are.

### 7. `noindex` and sitemap

`generateMetadata` adds `robots: { index: false, follow: true }` when
`!isLiveCategory(category)`. `sitemap.ts` maps `LIVE_CATEGORIES`. Keeping the placeholder
out of the sitemap and `noindex` at once is consistent: a sitemap should list only
indexable URLs. `follow` keeps the placeholder's nav links crawlable.

## Risks / Trade-offs

- [Placeholder pages already indexed drop out of the index] → Intended; they return when
  the category ships data, since the same derived flag removes `noindex` and adds the
  sitemap entry.
- [`sr`/crawler sees the brand name less on the home: it leaves the `<h1>`] → The `<title>`,
  the description, the header/footer brand and the JSON-LD `name` still carry it; the `<h1>`
  now carries the topic keywords instead.
- [Card copy drifts from the category content] → One sentence per category, reviewed when
  the category changes; the test only guarantees presence and length.
- [A provider outage leaves a card pointing at an "unavailable" page] → Accepted (see
  Non-Goals); the category page explains the outage and recovers on its own.

## Migration Plan

Web-only, no API or contract change: deploy as usual. Rollback is reverting the commit.
After deploy, confirm in production that `NEXT_PUBLIC_SITE_URL` is the public domain, since
the canonical URLs, sitemap and JSON-LD are built from it.
