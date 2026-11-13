# web — Next.js frontend

Environmental metrics dashboard — the user-facing app consuming the NestJS BFF.

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Port:** 3000 (development)
- **Deploy target:** Vercel

---

## Architecture

### Routing

All routes use the **App Router** convention (`app/` directory). Category pages are served from cache and refreshed at most once per day (`cacheLife` in `loadCategoryData`), and a direct visit always delivers the complete page. Provider-backed categories show a stale notice (data older than 7 days) or an unavailable state (older than 30 days, or a provider `502` with no snapshot) instead of failing.

```
src/app/
├── layout.tsx        # Root layout — <html>, Navbar/MobileHeader, skip-to-content, theme script, global CSS, metadata base
├── page.tsx          # Home — / — static landing: typed headline, one card per category with live data, site JSON-LD
├── [category]/
│   └── page.tsx      # Category page — /[slug]/ — cached, `ensureStatic`
├── not-found.tsx     # 404 — rendered for unknown slugs and missing routes
├── globals.css       # Tailwind base + custom global styles
├── manifest.ts       # PWA manifest → /manifest.webmanifest
├── og-image.png/
│   └── route.tsx     # Social card (1200×630 PNG) → /og-image.png — prerendered at build
├── robots.ts         # robots.txt — single `User-agent: *` group, allows /
└── sitemap.ts        # sitemap.xml — home + the categories with live data + data sources
```

Category pages use `generateStaticParams` to pre-render every `ECO_CATEGORIES` slug at build time except the categories with live data (the registry in `lib/categoryPages.tsx`: `water-footprint`, `co2-emissions`, `global-temperature`, `energy-sources` and `waste-recycling`), which are generated on demand on their first request and then cached, so the build never needs the BFF. That first request waits for the complete page (`ensureStatic = 'navigation'`): there is no `loading.tsx` or `<Suspense>` around the data, so crawlers always get the content in the visible document. Client navigations show the header and skeletons from `NavigationContent` meanwhile. A rewrite in `next.config.ts` gives unknown slugs a real 404 with the complete not-found page; percent-encoded unknown slugs and valid categories in another case skip it and get a real 404 drawn by JavaScript. If the API fetch fails twice (10 s per attempt), the page throws: during a revalidation the last good page keeps being served.

### Components

```
src/components/
├── BrandText.tsx          # Terminal-style animated brand text — used in Navbar and MobileHeader
├── MobileHeader.tsx       # Mobile-only fixed top header (< lg) — site identity + home link
├── TypewriterText.tsx     # Server-rendered, CSS-only typed text with the brand cursor — the home headline
├── SmoothAnchor.tsx       # In-page anchor whose scroll is animated for that click only — the home call to action
├── Navbar.tsx             # Responsive nav: bottom bar (mobile) / left sidebar (≥ lg)
├── NavLink.tsx            # Individual nav item — applies aria-current="page" when active
├── NavScrollContainer.tsx # Horizontal scroll wrapper with fade-edge gradients (mobile)
├── CountryCombobox.tsx    # WAI-ARIA searchable country selector (generic)
├── CountryFlag.tsx        # flag-icons flag (lazy in lists) or globe
├── GlobeIcon.tsx          # Monochrome currentColor globe (World)
├── charts/                # ECharts wrapper, token theme adapter, lazy loading, chart defaults, ChartPanel, RenderWhenVisible, confidence band helper, energy mix palette support, lazy pie entry (`EPieChart`/`LazyPieEChart`)
├── CountryExplorer.tsx    # Generic explorer shell: country selection (World default) + layout
├── MeasureToggle.tsx      # Generic radio-group toggle between the measures of a chart
├── YearDataTable.tsx      # Generic collapsed year table, the text equivalent of a chart (`wide` for many columns)
├── DataAttribution.tsx    # Generic "Data:" line from the API's meta and dataset identity
├── OriginCredit.tsx       # Credit of an upstream origin (producer, linked title and license, notice, citation)
├── co2-emissions/         # CO2 page: key figures, explorer, data table, content
├── energy-sources/        # Energy sources page: key figures, explorer (stacked area + toggle, donut), year and latest-year tables, content
├── waste-recycling/       # Waste & Recycling page: key figures, world map with measure selector and country table, treatment and composition bars, projection chart, content
├── global-temperature/    # Global temperature page: key figures, country explorer, long-run pre-industrial section, content
├── ThemeProvider.tsx      # React Context theme provider — light/dark + localStorage persistence
├── ThemeToggle.tsx        # Lamp-style theme toggle — zero-flash via blocking script in layout
└── icons/
    ├── index.ts           # Re-exports all icon components
    ├── SiteLogoIcon.tsx
    ├── AirQualityIcon.tsx
    ├── Co2EmissionsIcon.tsx
    ├── DeforestationIcon.tsx
    ├── EndangeredSpeciesIcon.tsx
    ├── GlacierMeltingIcon.tsx
    ├── GlobalTemperatureIcon.tsx
    ├── NotFoundIcon.tsx
    ├── OceanHealthIcon.tsx
    ├── ReforestationIcon.tsx
    ├── EnergySourcesIcon.tsx
    ├── WasteRecyclingIcon.tsx
    ├── WaterFootprintIcon.tsx
    ├── LightBulbIcon.tsx   # Used by ThemeToggle
    └── BottleIcon.tsx      # Used for plastic-pollution
```

`Navbar` is a single `<nav>` element — responsive layout is CSS-only (no JS switching). Mobile/tablet renders a fixed bottom bar; desktop (≥ `lg`) renders a fixed 64px-wide left sidebar. Below `lg`, `MobileHeader` renders a fixed top header — every `<main>` clears it with `pt-14`. `BrandText` (terminal-style typewriter, reduced-motion aware) is shared by the mobile header and the desktop sidebar brand. Theming: `ThemeProvider` (React Context + localStorage persistence) and `ThemeToggle` (lamp-style button, zero-flash via a blocking script in the root layout).

### Utilities (`src/lib/`)

| File                | Purpose                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `navItems.ts`       | Builds `NAV_ITEMS[]` from `ECO_CATEGORIES` — merges slug, label, href, icon into one object                                                                                    |
| `categoryIcon.ts`   | Maps a slug to its SVG icon component; warns in development for unknown slugs, falls back to `SiteLogoIcon`                                                                    |
| `categoryTitle.ts`  | Maps a slug to its display title; handles overrides for titles that can't be derived mechanically (`waste-recycling` → `Waste & Recycling`, `co2-emissions` → `CO2 Emissions`) |
| `siteUrl.ts`        | Returns the canonical base URL from `NEXT_PUBLIC_SITE_URL`, no trailing slash; falls back to `http://localhost:3000`                                                           |
| `socialMetadata.ts` | Shared social metadata: `OG_IMAGE`, `buildOpenGraph()`, `buildTwitter()`                                                                                                       |
| `categoryPages.tsx` | Registry of categories with live data (`load` + `Content`); drives the page dispatch and `generateStaticParams`                                                                |
| `bffFetch.ts`       | Server-side BFF reads with retry and shape validation; `fetchEnvelopeFromBff` also returns the attribution `meta`                                                              |
| `slugToTitle.ts`    | Generic slug → Title Case conversion (`air-quality` → `Air Quality`)                                                                                                           |

### SEO

Every page exports a `metadata` object with `title`, `description`, `alternates.canonical` (trailing-slash URL), and `openGraph` + `twitter` tags built with `buildOpenGraph()` / `buildTwitter()` from `lib/socialMetadata.ts` — Next.js merges metadata shallowly, so the helpers keep the shared type, site name, social card and `summary_large_image` card on every page. The root layout sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`.

Additional SEO outputs:

- `robots.ts` — a single `User-agent: *` group allowing `/`; no disallow rules (the API lives on its own domain)
- `og-image.png/route.tsx` — site-wide 1200×630 social card, referenced as `og:image`/`twitter:image` by every page
- `sitemap.ts` — home (`priority: 1.0`) + the category pages with live data (`priority: 0.8`), `changeFrequency: weekly`, + data sources (`0.5`, monthly). Placeholder categories are left out and declare `robots: noindex, follow` in their metadata; both follow `isLiveCategory` (`lib/liveCategories.ts`)
- Structured data — `WebSite` + `Organization` on the home (`lib/siteStructuredData.ts`), `Dataset` on each provider-backed category page (`lib/datasetJsonLd.ts`), whose `isBasedOn` sources are `CreativeWork` (`buildSourceWork`), never nested `Dataset`s
- `manifest.ts` — PWA manifest; `display: standalone`, `theme_color: #10b981`

### Security headers (`next.config.ts`)

Applied to all routes via `async headers()`:

| Header                    | Value                                                                         |
| ------------------------- | ----------------------------------------------------------------------------- |
| `Content-Security-Policy` | `default-src 'self'`; `unsafe-eval` added in development only (Turbopack HMR) |
| `X-Frame-Options`         | `DENY`                                                                        |
| `X-Content-Type-Options`  | `nosniff`                                                                     |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                             |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=()`                                    |

`trailingSlash: true` is set in `next.config.ts` — all canonical URLs end with `/`.

---

## Environment Variables

Copy `.env.example` before running locally:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable               | Default                        | Description                                                                                             |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`        | Canonical base URL for SEO metadata, sitemap, and Open Graph                                            |
| `API_BASE_URL`         | `http://localhost:3001/api/v1` | Base URL of the NestJS BFF (server-side only). Set to the deployed API URL in production                |
| `INTERNAL_API_KEY`     | —                              | Server-only secret sent as `X-Internal-Api-Key`; the API answers `401` without it. Never `NEXT_PUBLIC_` |
| `ANALYZE`              | `false`                        | Set to `true` to generate a bundle analysis report on build (webpack only)                              |

---

## Import Aliases

| Alias                 | Resolves to                    |
| --------------------- | ------------------------------ |
| `@/`                  | `apps/web/src/`                |
| `@eco-metrics/shared` | `packages/shared/src/index.ts` |

---

## Testing

```bash
npx nx test web
```

- **Runner:** Jest + Testing Library with **jsdom**
- **Setup:** `jest.setup.ts` — extends `@testing-library/jest-dom` matchers
- **Test location:** `__tests__/` mirroring `src/`
- **Coverage thresholds:** 80% statements/functions/lines; 75% branches (icon `title` prop creates a branch that renders `aria-labelledby` vs `aria-hidden` — not exercisable in jsdom)

### Known jsdom gotchas

- **Trailing slashes:** `next/link` strips trailing slashes in jsdom even when `trailingSlash: true` is set. Assert rendered `href` attributes without the trailing slash (e.g. `toBe('/air-quality')`), but keep trailing-slash hrefs in component logic to match real `usePathname()` output.
- **`next/image` with `aria-hidden`:** renders with `role="presentation"` in jsdom — `getByRole('img', { hidden: true })` will not find it. Use `data-testid` on the wrapper element instead.
