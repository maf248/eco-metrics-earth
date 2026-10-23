# Proposal: SEO metadata copy

## Why (Goals)

A meta-tag inspector run on the home page flagged three warnings, and a review of the category pages found a fourth problem:

- The home `<title>` is only the brand (`eco-metrics earth`, 17 characters). Search engines get no keywords telling them what the site is about.
- The site description (`Track and visualize environmental metrics for a sustainable planet.`, 67 characters) is too short and is duplicated in `layout.tsx`, `page.tsx` and the social image tagline.
- The social image (`/og-image.png`) shows logo, brand and tagline but no call to action.
- All 12 category pages have 31-38 character titles and descriptions generated from one template (`Track and visualize <x> metrics for a sustainable planet.`). Near-identical descriptions across pages are ignored by Google. Eleven of the twelve categories are still placeholders, so their copy must stay honest about what the page offers today.

Goals:

1. Replace the title separator `—` with `|` site-wide.
2. Give the home page a keyword-bearing title (50-60 characters) and a 110-160 character description.
3. Keep one site description shared by the layout default, the home page and the social image tagline (single constant).
4. Add a subtle call to action (`Explore the data →`) to the social image.
5. Give the water-footprint page a keyword-bearing title and a descriptive, source-citing description.
6. Give each of the 11 placeholder categories a unique, honest description (110-160 characters) that does not promise data that is not there.
7. Lock the length bounds and uniqueness with a unit test, and make a missing category copy a type error.

## Non-Goals

- No changes to page content, headings (`<h1>`), on-page copy or the `Water Footprint` heading. Only `<title>`, meta description, Open Graph and Twitter metadata, and the social image change.
- No keyword expansion of titles for the 11 placeholder categories: their title stays the category name (plus the site suffix).
- No new metadata fields: no structured data (JSON-LD), no keywords meta tag, no per-category social images, no hreflang.
- No change to canonical URLs, sitemap, robots, trailing-slash behavior or the manifest.
- No change to the 404 page metadata or the PWA manifest name/description.
- No new theming or palette decisions for the social image; it reuses the existing black background and emerald accent.
- No automated social-card visual regression testing.
- No localization; copy is English only.

## Impact

- `apps/web/src/app/layout.tsx`: default title kept, template becomes `%s | eco-metrics earth`, description uses the shared constant.
- `apps/web/src/app/page.tsx`: new title; description uses the shared constant.
- `apps/web/src/app/[category]/page.tsx`: description and (water-footprint only) title come from a typed per-category copy map instead of the template string.
- `apps/web/src/app/og-image.png/route.tsx`: tagline uses the shared constant; CTA added.
- `apps/web/src/lib/socialMetadata.ts`: hosts the shared site description constant; `OG_IMAGE.alt` aligned with the new wording.
- New `apps/web/src/lib/categoryMetadata.ts`: per-category copy map.
- `apps/web/src/lib/isEcoCategory.ts`: return type becomes the type predicate `slug is EcoCategory` (runtime unchanged) so the guard narrows `category` for the typed map lookup.
- Canonical specs touched through delta specs: `page-metadata`, `seo-metadata`, `water-footprint-page`.
- Unit tests and E2E tests that pin the old texts are updated (listed in `tasks.md`).
- `docs/design-system.md` social-card paragraph is updated to mention the CTA.
