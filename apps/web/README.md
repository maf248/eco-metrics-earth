# web — Next.js frontend

Environmental metrics dashboard — the user-facing app consuming the NestJS BFF.

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 3
- **Port:** 3000 (development)
- **Deploy target:** Vercel

---

## Architecture

### Routing

All routes use the **App Router** convention (`app/` directory). Category pages are statically generated at build time.

```
src/app/
├── layout.tsx        # Root layout — <html>, Navbar, skip-to-content, global CSS, metadata base
├── page.tsx          # Home — /
├── [category]/
│   └── page.tsx      # Category page — /[slug]/ — statically generated
├── not-found.tsx     # 404 — rendered for unknown slugs and missing routes
├── globals.css       # Tailwind base + custom global styles
├── manifest.ts       # PWA manifest → /manifest.webmanifest
├── robots.ts         # robots.txt — allows /, disallows /api/
└── sitemap.ts        # sitemap.xml — home + all 12 category pages
```

Category pages use `generateStaticParams` to enumerate all `ECO_CATEGORIES` slugs and `dynamicParams = false` to reject any slug not in that list at build time. Unknown slugs call `notFound()`.

### Components

```
src/components/
├── Navbar.tsx             # Responsive nav: bottom bar (mobile) / left sidebar (≥ lg)
├── NavLink.tsx            # Individual nav item — applies aria-current="page" when active
├── NavScrollContainer.tsx # Horizontal scroll wrapper with fade-edge gradients (mobile)
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
    └── BottleIcon.tsx      # Used for plastic-pollution
```

`Navbar` is a single `<nav>` element — responsive layout is CSS-only (no JS switching). Mobile/tablet renders a fixed bottom bar; desktop (≥ `lg`) renders a fixed 64px-wide left sidebar. The root layout offsets the content area via `pb-16 lg:pb-0 lg:pl-64`.

### Utilities (`src/lib/`)

| File | Purpose |
|------|---------|
| `navItems.ts` | Builds `NAV_ITEMS[]` from `ECO_CATEGORIES` — merges slug, label, href, icon into one object |
| `categoryIcon.ts` | Maps a slug to its SVG icon component; warns in development for unknown slugs, falls back to `SiteLogoIcon` |
| `categoryTitle.ts` | Maps a slug to its display title; handles overrides for titles that can't be derived mechanically (`waste-recycling` → `Waste & Recycling`, `co2-emissions` → `CO2 Emissions`) |
| `siteUrl.ts` | Returns the canonical base URL from `NEXT_PUBLIC_SITE_URL`, no trailing slash; falls back to `http://localhost:3000` |
| `slugToTitle.ts` | Generic slug → Title Case conversion (`air-quality` → `Air Quality`) |

### SEO

Every page exports a `metadata` object with `title`, `description`, `alternates.canonical` (trailing-slash URL), and `openGraph` + `twitter` tags. The root layout sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`.

Additional SEO outputs:
- `robots.ts` — allows `/`, disallows `/api/`
- `sitemap.ts` — home (`priority: 1.0`) + all 11 category pages (`priority: 0.8`), `changeFrequency: weekly`
- `manifest.ts` — PWA manifest; `display: standalone`, `theme_color: #10b981`

### Security headers (`next.config.ts`)

Applied to all routes via `async headers()`:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'`; `unsafe-eval` added in development only (Turbopack HMR) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

`trailingSlash: true` is set in `next.config.ts` — all canonical URLs end with `/`.

---

## Environment Variables

Copy `.env.example` before running locally:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical base URL for SEO metadata, sitemap, and Open Graph |

---

## Import Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/` | `apps/web/src/` |
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
