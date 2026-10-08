# Tasks

## 1. Icon assets

- [x] 1.1 Extend `scripts/generate-pwa-icons.mjs` to emit the five PNGs in design D3: transparent `icon-192.png`/`icon-512.png`; `icon-maskable-192.png`/`icon-maskable-512.png` with the logo at 56% centered on opaque `#000000`; `apple-touch-icon.png` at 180×180 with the logo at 80% centered on opaque `#000000`. Maskable and apple outputs are flattened (no alpha channel).
- [x] 1.2 Run `node scripts/generate-pwa-icons.mjs` from the repo root and visually inspect the five PNGs (logo fully inside the safe zone, no transparency where there should be none).

## 2. Manifest

- [x] 2.1 `apps/web/src/app/manifest.ts`: SVG entry `purpose: 'any'`; `icon-192.png`/`icon-512.png` `purpose: 'any'`; add `icon-maskable-192.png`/`icon-maskable-512.png` entries with `purpose: 'maskable'`.

## 3. Social metadata

- [x] 3.1 Add `apps/web/src/lib/socialMetadata.ts` (design D2): `SITE_NAME`, `OG_IMAGE`, `buildOpenGraph()`, `buildTwitter()`.
- [x] 3.2 Add `apps/web/src/app/og-image.png/route.tsx` (design D1): static `ImageResponse` 1200×630 with the inline `SiteLogoIcon`, site name, tagline and emerald accent, using the default bundled font.
- [x] 3.3 `apps/web/src/app/layout.tsx`: `openGraph`/`twitter` via the helpers (removes the SVG social images); `icons.apple` is `/icons/apple-touch-icon.png`.
- [x] 3.4 `apps/web/src/app/page.tsx` and `apps/web/src/app/[category]/page.tsx`: wrap their `openGraph`/`twitter` objects in `buildOpenGraph()`/`buildTwitter()`.

## 4. robots.txt and CSP

- [x] 4.1 `apps/web/src/app/robots.ts`: a single rule `{ userAgent: '*', allow: '/' }` plus the sitemap.
- [x] 4.2 `apps/web/next.config.ts`: `style-src 'self' 'unsafe-inline'`, `font-src 'self'`.

## 5. Tests

- [x] 5.1 `__tests__/app/manifest.test.ts`: assert SVG `any`, both `any` PNG entries, both `maskable` PNG entries, and that no entry combines purposes.
- [x] 5.2 `__tests__/app/robots.test.ts`: assert a single rule object, `allow: '/'`, and no `disallow`.
- [x] 5.3 `__tests__/app/layout.test.tsx`: `twitter.card` is `summary_large_image`, `icons.apple` points to the PNG, and no SVG appears in `openGraph.images`/`twitter.images`. Add page-metadata assertions for `twitter.card` on home and category pages where those tests live.
- [x] 5.4 Unit-test `socialMetadata.ts` (defaults, field overrides, `OG_IMAGE` shape). The `og-image.png` route (`next/og` does not load in jsdom) is covered by E2E; keep the coverage thresholds green.
- [x] 5.5 Add a unit test asserting that the generated PNG assets exist with the right dimensions and that maskable/apple PNGs have no alpha channel (using `sharp` metadata).
- [x] 5.6 `e2e/seo.spec.ts`: Twitter card `summary_large_image`; `og:image` (absolute, width 1200, height 630, non-empty alt) and `twitter:image` on home and a category page; the `og:image` URL returns `200 image/png`; robots has a single `User-agent: *`, `Allow: /` and no `Disallow`; the manifest has `any` and `maskable` entries; `apple-touch-icon` link points to the PNG.
- [x] 5.7 `e2e/security-headers.spec.ts`: the CSP contains `font-src 'self'` and does not contain `fonts.googleapis.com` / `fonts.gstatic.com`.

## 6. Docs

- [x] 6.1 `apps/web/README.md`: update the robots description (no `/api/` disallow) and list `og-image.png/route.tsx` and `lib/socialMetadata.ts`.
- [x] 6.2 `ROADMAP.md`: remove I13 (it is the last I-item, so no renumbering), update every cross-reference, and bump "Última actualización".
- [x] 6.3 Update the `sitemap-and-robots` canonical Purpose, which no longer covers robots.

## 7. Gates

- [x] 7.1 `npm run lint`, `npm run build`, `npm run test` green, with zero warnings in tests.
- [x] 7.2 `npm run e2e` green (seo, security-headers, a11y across the five projects).
- [x] 7.3 Build and inspect the real HTML of `/`, `/co2-emissions/` and a 404 for `og:image`, `twitter:card` and `twitter:image`, and visually inspect `/og-image.png`.
