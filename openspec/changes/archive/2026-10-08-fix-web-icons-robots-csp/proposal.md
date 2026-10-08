# Proposal

## Why

Sharing an eco-metrics earth link on social networks shows no preview image. Two defects compound: the only `og:image` is an SVG (Facebook, X and LinkedIn do not render SVG previews), and it is declared in the root layout's `openGraph`, which every page replaces wholesale with its own `openGraph` object (Next.js merges metadata shallowly) — so the home and category pages emit neither `og:image` nor `og:type`/`og:site_name`. Alongside it, three small `apps/web` surfaces diverge from their specs or contradict each other: the PWA manifest declares every icon as `maskable` only (no `any` icon, and the logo is full-bleed so masking crops it), iOS ignores the SVG apple-touch-icon, `robots.txt` emits two `User-agent: *` groups while two specs disagree on whether it may disallow anything, and the CSP still allowlists Google Fonts although the site loads none. This is ROADMAP item I13.

## What Changes

- **Social preview image**: a 1200×630 PNG social card (logo, site name, tagline on the black brand background) generated at build time and served at `/og-image.png`. A shared helper builds every segment's `openGraph`/`twitter` metadata, so home, category pages and the 404 all emit `og:type`, `og:site_name`, `og:image` and `twitter:image`, and the Twitter card becomes `summary_large_image` everywhere. The SVG is removed from the social images.
- **PWA icons**: the manifest separates purposes — the SVG and the existing transparent 192/512 PNGs become `purpose: 'any'`, and two new PNGs (`icon-maskable-192.png`, `icon-maskable-512.png`) with the logo inside the maskable safe zone on solid black `#000000` become `purpose: 'maskable'`.
- **Apple touch icon**: a new 180×180 PNG (`apple-touch-icon.png`) on solid black replaces the SVG in `metadata.icons.apple`.
- **Icon generation**: `scripts/generate-pwa-icons.mjs` generates all five PNGs from the SVG logo.
- **robots.txt**: a single `User-agent: *` group with `Allow: /` plus the sitemap. The `Disallow: /api/` rule is removed: the web domain serves no `/api/` routes (the BFF lives on Cloud Run under its own domain), so the rule blocked nothing.
- **CSP**: `https://fonts.googleapis.com` and `https://fonts.gstatic.com` are removed from `style-src` / `font-src`.

## Non-Goals

- Per-category or per-page OG images — one site-wide card is inherited by all routes.
- Redesigning the logo or changing `theme_color` / `background_color`.
- Replacing `favicon.ico` or the SVG `icon` in metadata (both work in every target browser).
- Any other CSP tightening (nonces, removing `'unsafe-inline'`).
- Adding route handlers under `/api/` on the web domain.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `seo-metadata`: Open Graph/Twitter image becomes a generated 1200×630 PNG inherited by all routes; Twitter card becomes `summary_large_image`; apple icon becomes a 180×180 PNG.
- `web-app-manifest`: the SVG icon entry is declared with `purpose: 'any'` (the `'any maskable'` value the spec required is not a valid value in Next's manifest types).
- `pwa-icons`: icon entries split into `any` and `maskable` purposes, new maskable and apple-touch PNGs, and the generation script produces all of them.
- `robots`: a single `User-agent: *` group allowing every path, plus the sitemap.
- `sitemap-and-robots`: the `/api/` disallow requirement is removed.
- `web-security-headers`: the CSP no longer permits Google Fonts origins.

## Impact

- **Code**: `apps/web/src/app/og-image.png/route.tsx` (new), `apps/web/src/lib/socialMetadata.ts` (new), `layout.tsx`, `page.tsx`, `[category]/page.tsx`, `manifest.ts`, `robots.ts`, `apps/web/next.config.ts`, `scripts/generate-pwa-icons.mjs`.
- **Assets**: three new PNGs in `apps/web/public/icons/`.
- **Tests**: unit tests for manifest, robots and layout metadata; E2E `seo.spec.ts` and `security-headers.spec.ts`.
- **Docs**: `apps/web/README.md` (robots description), `ROADMAP.md` (I13 removed).
- **Dependencies**: none new — `ImageResponse` ships with `next`, `sharp` is already a root devDependency.
