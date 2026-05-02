## Why

Search engines cannot automatically discover the 11 category pages because `apps/web` has no sitemap, and default crawler rules lack an explicit `Sitemap:` pointer or `Disallow` directives. There is also no Web App Manifest, so the app cannot be installed or themed on mobile browsers. Adding `robots.ts`, `sitemap.ts`, and `manifest.ts` via Next.js built-in support closes all three gaps in a single, low-risk change.

## What Changes

- Add `apps/web/src/app/robots.ts` — `MetadataRoute.Robots` allowing all crawlers, pointing to the sitemap URL.
- Add `apps/web/src/app/sitemap.ts` — `MetadataRoute.Sitemap` with entries for home (`/`) and all 11 category slugs from `ECO_CATEGORIES`. All URLs with trailing slash. `changeFrequency: 'weekly'`, priority home=1.0, categories=0.8.
- Add `apps/web/src/app/manifest.ts` — `MetadataRoute.Manifest` with name, short_name, start_url, display, theme_color (`#10b981`), background_color (`#000000`), and icon entry pointing to the site logo SVG.
- All three files derive the base URL from `siteUrl.ts` (introduced by `seo-metadata-og`).

## Capabilities

### New Capabilities

- `robots`: Exposes `/robots.txt` via Next.js route, configuring crawler access and sitemap discovery.
- `sitemap`: Exposes `/sitemap.xml` via Next.js route, listing all public URLs (home + 11 category pages) for search engine indexing.
- `web-app-manifest`: Exposes `/manifest.webmanifest` via Next.js route, enabling PWA install and browser tab theming.

### Modified Capabilities

_(none)_

## Non-Goals

- Multiple sitemaps / sitemap index — not needed at current scale.
- Dynamic sitemap entries from API data — deferred until real content endpoints exist.
- Service worker / offline support — out of scope.
- Push notifications or background sync — out of scope.
- Changes to the API app or shared package.

## Impact

- `apps/web/src/app/robots.ts` — new file.
- `apps/web/src/app/sitemap.ts` — new file.
- `apps/web/src/app/manifest.ts` — new file.
- Depends on `siteUrl.ts` from the `seo-metadata-og` change.
- `apps/web/__tests__/app/` — new test files for each route.
