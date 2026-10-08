# web — Next.js frontend

Environmental metrics dashboard — the user-facing app consuming the NestJS BFF.

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Port:** 3000 (development)
- **Deploy target:** Vercel

---

## Architecture

### Routing

All routes use the **App Router** convention (`app/` directory). Category pages are statically generated at build time.

```
src/app/
├── layout.tsx        # Root layout — <html>, Navbar/MobileHeader, skip-to-content, theme script, global CSS, metadata base
├── page.tsx          # Home — /
├── [category]/
│   └── page.tsx      # Category page — /[slug]/ — statically generated
├── not-found.tsx     # 404 — rendered for unknown slugs and missing routes
├── globals.css       # Tailwind base + custom global styles
├── manifest.ts       # PWA manifest → /manifest.webmanifest
├── og-image.png/
│   └── route.tsx     # Social card (1200×630 PNG) → /og-image.png — prerendered at build
├── robots.ts         # robots.txt — single `User-agent: *` group, allows /
└── sitemap.ts        # sitemap.xml — home + all 12 category pages
```

Category pages use `generateStaticParams` to enumerate all `ECO_CATEGORIES` slugs and `dynamicParams = false` to reject any slug not in that list at build time. Unknown slugs call `notFound()`.

### Components

```
src/components/
├── BrandText.tsx          # Terminal-style animated brand text — used in Navbar and MobileHeader
├── MobileHeader.tsx       # Mobile-only fixed top header (< lg) — site identity + home link
├── Navbar.tsx             # Responsive nav: bottom bar (mobile) / left sidebar (≥ lg)
├── NavLink.tsx            # Individual nav item — applies aria-current="page" when active
├── NavScrollContainer.tsx # Horizontal scroll wrapper with fade-edge gradients (mobile)
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
| `slugToTitle.ts`    | Generic slug → Title Case conversion (`air-quality` → `Air Quality`)                                                                                                           |

### SEO

Every page exports a `metadata` object with `title`, `description`, `alternates.canonical` (trailing-slash URL), and `openGraph` + `twitter` tags built with `buildOpenGraph()` / `buildTwitter()` from `lib/socialMetadata.ts` — Next.js merges metadata shallowly, so the helpers keep the shared type, site name, social card and `summary_large_image` card on every page. The root layout sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`.

Additional SEO outputs:

- `robots.ts` — a single `User-agent: *` group allowing `/`; no disallow rules (the API lives on its own domain)
- `og-image.png/route.tsx` — site-wide 1200×630 social card, referenced as `og:image`/`twitter:image` by every page
- `sitemap.ts` — home (`priority: 1.0`) + all 12 category pages (`priority: 0.8`), `changeFrequency: weekly`
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

| Variable               | Default                        | Description                                                                                                                        |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`        | Canonical base URL for SEO metadata, sitemap, and Open Graph                                                                       |
| `API_BASE_URL`         | `http://localhost:3001/api/v1` | Base URL of the NestJS BFF (server-side only). Set to the deployed API URL in production                                           |
| `INTERNAL_API_KEY`     | —                              | Server-only shared secret sent as `X-Internal-Api-Key` so the API skips rate limiting for the Next.js server. Never `NEXT_PUBLIC_` |
| `ANALYZE`              | `false`                        | Set to `true` to generate a bundle analysis report on build (webpack only)                                                         |

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
