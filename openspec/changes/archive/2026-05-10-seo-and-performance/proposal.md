## Why

Category pages are currently rendered server-side on every request despite serving static content driven by a fixed set of known slugs. The root layout metadata is incomplete (missing Open Graph images, Twitter card images, theme color, and canonical icon declarations), which causes social-share previews to appear blank and degrades search-engine signals. The sitemap, robots.txt, and PWA manifest also have omissions that limit discoverability and installability. Addressing these now establishes a correct SEO baseline before any real content arrives.

## What Changes

- **Root layout metadata**: Add `og:type`, `og:images`, `og:siteName`, Twitter `card` + `images`, `themeColor`, and `icons` to the Next.js `Metadata` export in `layout.tsx`.
- **Category pages**: Export `generateStaticParams()` from `[category]/page.tsx` using `ECO_CATEGORIES` keys so all 11 category pages are pre-rendered at build time (SSG) instead of SSR.
- **404 page**: Add a `description` field to its `metadata` export.
- **Sitemap**: Add `lastModified: new Date()` to every sitemap entry.
- **Robots.txt**: Add `disallow: ['/api/']` rule to prevent crawlers from indexing API routes.
- **PWA manifest**: Add 192×192 and 512×512 PNG icon entries alongside the existing SVG. Generate the PNG files from the existing SVG using a one-off `scripts/generate-pwa-icons.mjs` script (powered by `sharp`).

## Non-Goals

- Designing or producing a custom OG image (a dedicated graphic asset). The SVG logo is used as a placeholder until a proper OG image is designed.
- Structured data / JSON-LD markup.
- Sitemap index (multi-sitemap) — a single sitemap is sufficient for the current scale.
- Analytics integration.
- Server-side i18n or hreflang tags.

## Capabilities

### New Capabilities

- `seo-metadata`: Complete Open Graph, Twitter card, theme color, and icon declarations in the root layout and individual page metadata exports.
- `static-category-pages`: Static pre-rendering (SSG) of all 11 category pages via `generateStaticParams`.
- `pwa-icons`: Raster PNG icons for PWA installability (192px and 512px), generated from the existing SVG asset.
- `sitemap-and-robots`: Improved sitemap (with `lastModified`) and robots.txt (with API disallow rule).

### Modified Capabilities

*(none — no existing spec-level behavior is changing)*

## Impact

- **`apps/web/src/app/layout.tsx`**: Metadata additions (no structural changes).
- **`apps/web/src/app/[category]/page.tsx`**: New `generateStaticParams` export.
- **`apps/web/src/app/not-found.tsx`**: Metadata `description` addition.
- **`apps/web/src/app/sitemap.ts`**: `lastModified` field added.
- **`apps/web/src/app/robots.ts`**: New disallow rule.
- **`apps/web/src/app/manifest.ts`**: Two new PNG icon entries.
- **`apps/web/public/icons/`**: Two new PNG files (`icon-192.png`, `icon-512.png`).
- **`scripts/generate-pwa-icons.mjs`**: New one-off generation script (root level).
- **`package.json` (root or web)**: `sharp` added as devDependency (exact version).
- **Tests**: Sitemap test length assertion must be verified (currently hardcoded `12` — no change to count, but `lastModified` field should be asserted); `[category]/page.tsx` test should cover `generateStaticParams` output.
- **Breaking**: None.
