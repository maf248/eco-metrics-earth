## Context

`apps/web` serves no `robots.txt`, no `sitemap.xml`, and no Web App Manifest. Without `robots.txt`, crawlers fall back to full-access defaults but have no `Sitemap:` pointer, so the 11 category pages may never be automatically enqueued. Without a sitemap, Google Search Console cannot report crawl coverage. Without a manifest, the app cannot be installed as a PWA and lacks browser-tab theming.

Next.js 16 App Router supports all three via typed route handlers (`robots.ts`, `sitemap.ts`, `manifest.ts`) that compile to static files at build time with no runtime cost. This is the canonical Next.js approach and avoids placing static files in `public/` (which can't reference env vars or computed values).

This change depends on the `siteUrl.ts` helper introduced by `seo-metadata-og` for the base URL.

## Goals / Non-Goals

**Goals:**
- Expose `/robots.txt` that allows all crawlers and points to `/sitemap.xml`.
- Expose `/sitemap.xml` listing home (`/`) and all 11 category pages, each with trailing slash, `changeFrequency: 'weekly'`, and priority values.
- Expose `/manifest.webmanifest` with name, short_name, start_url (`/`), display, theme and background colours, and a reference to the site icon.

**Non-Goals:**
- Service worker / offline support.
- Sitemap index for multiple sitemaps.
- Dynamic sitemap entries from API data.
- Push notifications or background sync.
- Changes to API app or shared package.

## Decisions

### D1 — Next.js built-in route handlers over static files in `public/`
**Decision**: Use `robots.ts`, `sitemap.ts`, `manifest.ts` in `apps/web/src/app/`.  
**Rationale**: Route handlers can import TypeScript modules (including `siteUrl.ts` and `ECO_CATEGORIES`), are type-checked, and are tree-shaken at build. Static files in `public/` are not typed, cannot import env vars, and must be manually kept in sync with the category list.  
**Alternative considered**: Place `robots.txt`, `sitemap.xml`, `manifest.webmanifest` directly in `public/` — rejected because they would require manual maintenance and can't use the canonical base URL from the env var.

### D2 — Derive sitemap entries from `ECO_CATEGORIES`
**Decision**: `sitemap.ts` iterates over `ECO_CATEGORIES` (from `@eco-metrics/shared`) to build category entries.  
**Rationale**: Single source of truth for the category list. Adding a new category automatically adds it to the sitemap without code changes.  
**Alternative considered**: Hard-code the 11 slugs in sitemap.ts — rejected because it creates a secondary list to maintain.

### D3 — Theme colour `#10b981` (Tailwind `emerald-500`)
**Decision**: Use `#10b981` as the PWA theme colour and `#000000` as background.  
**Rationale**: Matches the brand green used throughout the UI. Background black matches the dark-mode base (`bg-black` in `layout.tsx`).

## Risks / Trade-offs

- **[Risk] `siteUrl.ts` not yet present when this change is applied in isolation** → This change depends on `seo-metadata-og` being implemented first. Tasks must enforce that ordering.
- **[Risk] Search engines cache a stale sitemap after a category is renamed or removed** → Mitigated by `changeFrequency: 'weekly'` and the fact that Next.js rebuilds the sitemap on each deployment.
- **[Trade-off] No `lastModified` on sitemap entries** → Would require tracking a real deployment timestamp or content-updated-at. Omitting it is acceptable; crawlers will re-check on their own schedule.
