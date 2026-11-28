## Context

The site card is `app/og-image.png/route.tsx`: a `GET` handler returning a `next/og` `ImageResponse` (logo, site name, tagline, CTA on black with an emerald bottom border), prerendered at build time. The `.png` path is deliberate: with `trailingSlash: true`, extensionless routes (including the `opengraph-image` file convention) get a 308 that some scrapers do not follow.

## Decisions

### Same route shape, one segment down

`app/[category]/og-image.png/route.tsx` with `generateStaticParams` over every `ECO_CATEGORIES` slug, so all 12 cards are prerendered at build time. The handler answers `404` for a slug that is not a category (defensive: `dynamicParams` stays the default, and a non-category never renders). The file convention `opengraph-image.tsx` is not used for the same 308 reason as the site card.

### Shared layout

A `SocialCard` element builder in `lib/socialCard.tsx` holds the canvas, palette and two-column layout (icon, then a column of lines). The site card passes its logo, name, tagline and CTA; a category card passes `CATEGORY_ICONS[category]`, `getCategoryTitle(category)`, `CATEGORY_DESCRIPTIONS[category]` and the site name in the accent color. The site card's markup stays the same.

### Metadata

`buildCategoryOgImage(category)` in `lib/socialMetadata.ts` returns `{ url: '/<category>/og-image.png', width: 1200, height: 630, alt, type: 'image/png' }` with alt `eco-metrics earth | <metadata title>`. `[category]/page.tsx` passes it to `buildOpenGraph({ images: [...] })`; `twitter.images` stays unset, so Next fills it from Open Graph as today.

### No headline figure

A figure would need the BFF on every regeneration (or at build time, which the project forbids). Out of scope.

## Risks

- Long descriptions must fit: the layout uses a smaller body font for category cards and the E2E only checks the PNG is served; a manual look at a few cards is part of the gates.
