# Design: SEO metadata copy

## Technical approach

### Title separator and template behavior

- `layout.tsx`: `title.template` becomes `%s | eco-metrics earth`; `title.default` stays `eco-metrics earth` (used only by routes that declare no title, e.g. fallbacks).
- The home `page.tsx` shares a segment with the root layout, so Next.js does not apply the layout template to it (the current E2E test already shows the home title rendered without a suffix). The new home title `eco-metrics earth | CO2, Climate, Energy & Water Data` (53 characters) is therefore the full, brand-first string. The coder must confirm in the built HTML that it is not suffixed.
- `[category]/page.tsx` is a child segment, so the template applies: the page declares only the category name (or the water-footprint title) and the rendered title gains ` | eco-metrics earth`.
- Open Graph and Twitter titles are not templated by Next.js, so they carry the bare page title (`Air Quality`, `Water Footprint of Food & Products`); `og:site_name` carries the brand. This matches today's behavior for categories.

### Shared site description

Add `SITE_DESCRIPTION` to `apps/web/src/lib/socialMetadata.ts`, next to `SITE_NAME` (the social image route already imports from this module). Consumers: `layout.tsx` (`description`), `page.tsx` (`DESCRIPTION`), `og-image.png/route.tsx` (`TAGLINE`). This removes the three duplicated literals. Update `OG_IMAGE.alt` to `eco-metrics earth | Environmental data on CO2, climate, energy and water`.

### Per-category copy

New file `apps/web/src/lib/categoryMetadata.ts`:

- `CATEGORY_DESCRIPTIONS: Record<EcoCategory, string>`, with all 12 entries (11 placeholders from the spec, water-footprint from the water-footprint-page delta). A missing key fails `tsc`/`next build`, which satisfies the "missing category fails type-checking" scenario.
- `getCategoryMetadataTitle(category: EcoCategory): string`: returns `Water Footprint of Food & Products` for water-footprint and `getCategoryTitle(category)` otherwise. Implemented with a small override map, mirroring `TITLE_OVERRIDES` in `categoryTitle.ts`, but kept separate because `getCategoryTitle` also drives the `<h1>` and nav labels, which must stay `Water Footprint`.

`generateMetadata` in `[category]/page.tsx` replaces the template-string description and the `getCategoryTitle` title with these helpers. The `isEcoCategory` guard stays first; its return type changes from `boolean` to the type predicate `slug is EcoCategory` (runtime unchanged) so it actually narrows `category` to `EcoCategory` for the map lookup.

When a future data module (CO2, temperature, energy, etc.) ships, its change replaces that category's placeholder description in the map with copy describing the live content, and updates the "coming soon" test accordingly (the honesty test applies only to categories still flagged as placeholders; see tasks). Water-footprint is the first such category.

### Social image CTA

In `og-image.png/route.tsx`, add a third text line under the tagline: `Explore the data →`, in the existing flex column. Constraints from `docs/design-system.md` (brand rasters use black `#000000` and emerald `#10b981`): reuse those colors only; use the emerald accent for the CTA text at roughly 30px so it is clearly secondary to the 68px brand name, and verify contrast on black (emerald-500 on black is well above 4.5:1). Keep the layout within 1200×630 with the 96px side padding; the tagline is now 146 characters at 34px, so wrap behavior and total height must be checked visually (reduce tagline size slightly if it collides with the bottom bar). Satori (used by `next/og`) needs `display: flex` on every element with multiple children, as in the existing code. The arrow `→` must render with the default font; if it renders as a missing glyph, fall back to a text-only CTA and raise it as an open question instead of bundling a font.

Update the social-card paragraph in `docs/design-system.md` to mention the CTA line (a new presentation decision belongs in that doc in the same change).

### Tests

Unit tests asserting length bounds (110-160 for every description, 50-60 for the home title), uniqueness, honesty keywords for placeholders, the pipe template, and shared-constant alignment. E2E and unit tests that pinned old texts are listed in `tasks.md`.

## Alternatives considered

- **Expand placeholder titles with keywords** (e.g. `Air Quality Data: PM2.5 & Ozone`): rejected by the user; titles stay as category names, and keyword-stuffing placeholder pages promises content that does not exist.
- **`title: { absolute: ... }` for water-footprint**: rejected; relying on the template keeps the separator and suffix defined in one place.
- **Generating descriptions from a template per category**: rejected; this is the cause of the near-duplicate descriptions being ignored by Google.
- **Putting descriptions in `@eco-metrics/shared`**: rejected; copy is presentation for the web app only and would couple the API package to SEO text.
- **Extending `TITLE_OVERRIDES` for the water-footprint title**: rejected; it would change the `<h1>`, nav labels and `getCategoryTitle` contract (`co2-title-override` spec).
- **Duplicating the description string in the OG route**: rejected in favor of one exported constant, so the tagline cannot drift.

## Risk assessment

| Risk                                                                                     | Mitigation                                                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Home title unexpectedly receives the template suffix (`... \| eco-metrics earth \| ...`) | E2E asserts the exact home `<title>`; coder checks the built HTML before finishing.              |
| `→` glyph missing in the OG font                                                         | Visual check of the PNG; fallback is a text-only CTA, escalated as an open question.             |
| Longer tagline overflows or collides with the card's bottom bar                          | Visual check of the PNG; adjust font size or line height within the existing palette.            |
| Placeholder copy goes stale when a category ships real data                              | Documented in the spec and design; each data change owns replacing its description.              |
| Cached ISR water-footprint page keeps the old title until revalidation                   | Expected: at most 24 h (`revalidate = 86400`); a new deployment regenerates it on first request. |
| Stale tests pinning the old texts cause CI failures                                      | Full list in `tasks.md`; run the whole unit suite plus the SEO and water-footprint E2E specs.    |
| Snapshot churn                                                                           | No component markup changes; if a snapshot changes, diff it and treat it as unintended.          |
