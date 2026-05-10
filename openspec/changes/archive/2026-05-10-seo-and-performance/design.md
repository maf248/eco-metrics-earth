## Context

The web app's root layout metadata is missing key Open Graph and Twitter card fields that social platforms require to display rich previews. All 11 category pages use dynamic SSR despite their content being determined entirely by a static set of known slugs from `ECO_CATEGORIES`. The PWA manifest lacks raster icons required for Chrome's install prompt. The sitemap and robots.txt have minor omissions.

Current state:
- `layout.tsx` has `openGraph` and `twitter` metadata objects but without `type`, `images`, `siteName`, `themeColor`, or `icons`.
- `[category]/page.tsx` exports no `generateStaticParams` — Next.js defaults to SSR for all category routes.
- `manifest.ts` only declares an SVG icon entry — no 192px or 512px PNGs.
- `sitemap.ts` returns entries without `lastModified`.
- `robots.ts` has no `disallow` rules.
- `not-found.tsx` metadata has no `description`.

## Goals / Non-Goals

**Goals:**
- Complete the root layout `Metadata` export so social shares and browser chrome use correct values.
- Pre-render all category pages at build time using `generateStaticParams`.
- Add 192×192 and 512×512 PNG icons to the PWA manifest.
- Add `lastModified` to sitemap entries.
- Disallow API path crawling in robots.txt.
- Declare the SVG favicon via Next.js metadata `icons` field.

**Non-Goals:**
- Custom OG image design (the SVG logo is used as a placeholder).
- Structured data / JSON-LD.
- Multi-sitemap index.
- Dynamic OG images via `opengraph-image.tsx` route segment files.
- Analytics integration.

## Decisions

### D1 — Use SVG as placeholder OG image

**Decision**: Use `/icons/eco-metrics-earth.svg` as the OG image URL with declared dimensions of 512×512. Social crawlers (OpenGraph.io, Slack unfurler, Twitter card validator) support SVG in most cases. A proper raster OG image (1200×630) is a design task outside this scope.

**Alternative considered**: Skip OG images entirely until a proper image is designed. Rejected — empty `og:image` causes blank previews, which is worse than the SVG placeholder.

### D2 — `generateStaticParams` + implicit `force-static`

**Decision**: Export `generateStaticParams()` returning all `ECO_CATEGORIES` keys as `{ category: string }[]`. Next.js App Router will automatically switch the route segment to static rendering when `generateStaticParams` is present — no need to explicitly set `export const dynamic = 'force-static'`.

**Alternative considered**: Add `export const dynamic = 'force-static'` as well. Redundant — `generateStaticParams` already implies static rendering. Adding it explicitly would cause a build error if any dynamic data fetching were later introduced.

**Rationale**: All category slugs are known at build time (`ECO_CATEGORIES` is a compile-time constant). SSG eliminates per-request server render overhead and improves TTFB for end users.

### D3 — PNG icons via one-off `scripts/generate-pwa-icons.mjs` using `sharp`

**Decision**: Create a standalone ESM script at the repo root (`scripts/generate-pwa-icons.mjs`) that imports `sharp`, reads the SVG from `apps/web/public/icons/eco-metrics-earth.svg`, and outputs `icon-192.png` and `icon-512.png` to the same directory. The generated PNGs are committed to the repo. The script is NOT added to the build pipeline — it is run once manually (or in the future as part of an asset pipeline).

**Alternative considered**: Use a Next.js `instrumentation.ts` hook or a Webpack plugin to generate icons at build time. Rejected — adds build complexity and regenerates icons on every build unnecessarily.

**`sharp` installation**: Add `sharp` to root `devDependencies` with exact version (check latest compatible with Node 20). `sharp` uses native binaries — it is a devDependency only since PNGs are pre-committed.

### D4 — Keep existing SVG icon entry in manifest alongside PNGs

**Decision**: The manifest will include all three icon entries: SVG (`any`), PNG 192 (`any maskable`), PNG 512 (`any maskable`). The `purpose: 'any maskable'` on PNGs allows Android to use adaptive icon masking.

**Rationale**: SVG gives sharp rendering on browsers that support it (Firefox, Chrome 94+); PNGs provide fallback for Chrome's PWA install requirement.

## Risks / Trade-offs

- **SVG OG image**: Some crawlers (WhatsApp, LinkedIn) may not render SVG OG images. Accepted risk — a proper raster OG image is a design task tracked separately.
- **`sharp` native binaries**: `sharp` requires a native build per OS/arch. Since it is a devDependency and the PNGs are pre-committed, this only affects developers who run the generation script. Node 20 + `sharp` 0.33.x is tested on Linux, macOS, and Windows.
- **Sitemap `lastModified: new Date()`**: This is the build date, not the actual content modification date. It changes on every build. Acceptable for the current static content; will need a content management strategy when real data is added.

## Open Questions

- Should `generateStaticParams` return a `notFound: true` fallback for unknown slugs, or let the `[category]/page.tsx` existing guard handle it (returning `notFound()` from the page itself)? → Use the existing `notFound()` call in the page component with `dynamicParams: false` exported to ensure unknown slugs return 404 at build time.
