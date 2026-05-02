## 1. Robots Route

- [ ] 1.1 Create `apps/web/src/app/robots.ts` exporting a `MetadataRoute.Robots` object that allows all user-agents and includes `sitemap: siteUrl() + "/sitemap.xml"`
- [ ] 1.2 Write `apps/web/__tests__/app/robots.test.ts` asserting the `sitemap` URL and that `rules` allows all agents

## 2. Sitemap Route

- [ ] 2.1 Create `apps/web/src/app/sitemap.ts` exporting a `MetadataRoute.Sitemap` array with a home entry (`priority: 1.0`) and one entry per `ECO_CATEGORIES` slug (`priority: 0.8`), all with trailing slash and `changeFrequency: 'weekly'`
- [ ] 2.2 Write `apps/web/__tests__/app/sitemap.test.ts` asserting: total entry count is 12 (1 home + 11 categories), all URLs end with `/`, home has `priority: 1.0`, category entries have `priority: 0.8`

## 3. Web App Manifest Route

- [ ] 3.1 Create `apps/web/src/app/manifest.ts` exporting a `MetadataRoute.Manifest` object with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#10b981"`, `background_color: "#000000"`, and `icons` array referencing `/icons/eco-metrics-earth.svg`
- [ ] 3.2 Write `apps/web/__tests__/app/manifest.test.ts` asserting the `name`, `theme_color`, `background_color`, and that `icons` has at least one entry

## 4. Verification

- [ ] 4.1 Run `npx nx test web` — all tests pass with zero errors or warnings
- [ ] 4.2 Run `npx nx build web` — build succeeds with no TypeScript errors
- [ ] 4.3 Run `npm run lint` — no lint errors
