## 1. Cards

- [x] 1.1 `SocialCard` layout in `lib/socialCard.tsx`; the site card uses it with unchanged output
- [x] 1.2 `app/[category]/og-image.png/route.tsx`: static params for all 12 categories, 404 for any other slug
- [x] 1.3 Unit tests for the route (PNG for a category, 404 otherwise) and the layout

## 2. Metadata

- [x] 2.1 `buildCategoryOgImage(category)` and its use in the category page metadata
- [x] 2.2 Unit tests for the metadata; E2E: the category page declares its own card and the card is served as a PNG without redirect

## 3. Close

- [x] 3.1 Gates: format, lint, typecheck, unit tests, build (12 cards prerendered), SEO E2E, visual check of a few cards
- [x] 3.2 Close the roadmap item; `apps/web/README.md` and `docs/design-system.md` updated
- [x] 3.3 Archive the change
