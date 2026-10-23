# Tasks: SEO metadata copy

Read `docs/design-system.md` before task 7 (social image). Copy strings must be copied verbatim from the delta specs.

## Implementation

- [x] 1. In `apps/web/src/lib/socialMetadata.ts`, export `SITE_DESCRIPTION` (the 146-character string from the `page-metadata` delta) and update `OG_IMAGE.alt` to `eco-metrics earth | Environmental data on CO2, climate, energy and water`. (Scenarios: Layout default description, Social image tagline is aligned)
- [x] 2. Create `apps/web/src/lib/categoryMetadata.ts` exporting `CATEGORY_DESCRIPTIONS: Record<EcoCategory, string>` (all 12 entries: 11 placeholders from the `page-metadata` delta, water-footprint from the `water-footprint-page` delta), `getCategoryMetadataTitle(category)` (returns `Water Footprint of Food & Products` for water-footprint, otherwise `getCategoryTitle(category)`). (Scenarios: Length bounds, Uniqueness, Missing category fails type-checking)
- [x] 3. In `apps/web/src/app/layout.tsx`, set `title.template` to `%s | eco-metrics earth` and `description` to `SITE_DESCRIPTION`. (Scenarios: Layout template uses the pipe, Layout default description)
- [x] 4. In `apps/web/src/app/page.tsx`, set `TITLE` to `eco-metrics earth | CO2, Climate, Energy & Water Data` and `DESCRIPTION` to `SITE_DESCRIPTION`; keep using `buildOpenGraph`/`buildTwitter`. (Scenarios: Home title and description, Home social metadata matches)
- [x] 5. In `apps/web/src/app/[category]/page.tsx` `generateMetadata`, use `getCategoryMetadataTitle` and `CATEGORY_DESCRIPTIONS[category]` instead of `getCategoryTitle` and the template-string description; leave the page heading on `getCategoryTitle`. (Scenarios: Category description comes from the map, Metadata unchanged, Category page title uses the pipe)
- [x] 6. In `apps/web/src/app/og-image.png/route.tsx`, replace the local `TAGLINE` literal with `SITE_DESCRIPTION`. (Scenario: Social image tagline is aligned)
- [x] 7. In the same route, add the `Explore the data →` line under the tagline using only the existing palette (emerald accent, secondary size), then open `/og-image.png` and visually verify it fits 1200×630, does not collide with the tagline or bottom bar, and the arrow glyph renders. (Scenarios: CTA is present in the card source, Visual check)
- [x] 8. Update the social-card paragraph in `docs/design-system.md` to mention the CTA line.

## Test updates (existing tests that pin old text)

- [x] 9. `apps/web/__tests__/app/layout.test.tsx`: change the template expectation (line ~87) from `'%s — eco-metrics earth'` to `'%s | eco-metrics earth'`; assert the description equals `SITE_DESCRIPTION` and is 110-160 characters.
- [x] 10. `apps/web/__tests__/app/page.test.tsx`: update the `title "eco-metrics earth"` test (line ~42) and the `openGraph title` test (line ~52) to the new home title; add assertions that the title is 50-60 characters, the description equals `SITE_DESCRIPTION`, and `openGraph`/`twitter` title and description match.
- [x] 11. `apps/web/__tests__/app/[category]/page.test.tsx`: replace `expect(metadata.description).toContain('air quality')` (line ~138) with an assertion against the `air-quality` map entry; add water-footprint cases (title `Water Footprint of Food & Products`, new description, og/twitter match) while the `<h1>` test (line ~293) keeps `Water Footprint`. Check that the mocked water-footprint fetch is not required for `generateMetadata`.
- [x] 12. Create `apps/web/__tests__/lib/categoryMetadata.test.ts`: every `EcoCategory` has a description of 110-160 characters, all descriptions are unique and differ from `SITE_DESCRIPTION`, the 11 non-water-footprint descriptions contain "coming soon" or "coming to eco-metrics earth", and `getCategoryMetadataTitle` returns the override for water-footprint and the category name for the others.
- [x] 13. `apps/web/__tests__/lib/socialMetadata.test.ts`: add a `SITE_DESCRIPTION` test (length 110-160) and keep the existing OG_IMAGE assertions green after the alt change.
- [x] 14. No unit test for the social image route (it would require mocking `next/og`): it is covered by the existing `seo.spec.ts` E2E (`200` PNG) plus the visual check in task 7.
- [x] 15. `apps/web/e2e/utils/pages.ts`: update `homePage.title` and `homePage.description`, and change `categoryPage().title` to `` `${title} | eco-metrics earth` ``; add an exported water-footprint title/description constant if useful.
- [x] 16. `apps/web/e2e/seo.spec.ts`: no literal old text is hard-coded (it reads from `pages.ts`), but verify the home and category metadata tests pass; add a test that a category page's `meta[name="description"]` equals the expected per-category description and that two different categories have different descriptions.
- [x] 17. `apps/web/e2e/water-footprint.spec.ts`: change the title assertion (line ~31) to `Water Footprint of Food & Products | eco-metrics earth`; add assertions for the meta description and `og:title`/`og:description`.

## Gates

- [x] 18. Run `npm run lint`, `npx nx build web` (type-check, confirms the `Record<EcoCategory, string>` completeness), `npm run test`, `npm run format:check`.
- [x] 19. Run the relevant E2E specs: `seo.spec.ts` and `water-footprint.spec.ts` (and `navigation.spec.ts`, `mobile-navigation.spec.ts`, `a11y.spec.ts` and `security-headers.spec.ts`, which also consume `pages.ts`), checking ports first so the user's dev server on :3000 is not clobbered. Result: 293/296 on the first full run; the two navigation failures were a stale water-footprint fixture (fixed in `pages.ts`) and a load timeout, both green on re-run. The remaining intermittent failure (firefox home a11y color-contrast on the bottom nav, 1 of 185 in a repeat run, foreground varying mid `transition-colors`) is pre-existing and unrelated to this change.
- [x] 20. Confirm in the built HTML that the home `<title>` has no template suffix and that the old texts (`Track and visualize`, ` — eco-metrics earth`) no longer appear in `apps/web/src` or `apps/web/e2e`.
