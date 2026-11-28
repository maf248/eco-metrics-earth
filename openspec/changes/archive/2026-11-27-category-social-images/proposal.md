## Why

Every page shares the site-wide social card `/og-image.png`, so a link to a category looks exactly like a link to the home page in social networks and messaging apps. Nothing in the preview tells the reader which data the link leads to.

## What Changes

- Each of the 12 categories (live and placeholder) gets its own 1200×630 PNG social card at `/<category>/og-image.png`, using the site card's layout and palette with the category's own icon (the one the site already shows), its name and its description, plus the site name as the accent line.
- The cards are prerendered at build time from static data only (no BFF read), like the site card.
- The category page metadata points `og:image` (and so `twitter:image`) at its own card, with an alt text naming the category.
- The site card and the category cards share one layout component, so the site card's output is unchanged.

## Impact

- Web only: a new `app/[category]/og-image.png/route.tsx`, a shared social card layout in `lib/`, `app/og-image.png/route.tsx`, `lib/socialMetadata.ts`, `[category]/page.tsx` metadata, unit and E2E tests.
- No API or shared type change. No configuration change.
- Spec: `seo-metadata`.
