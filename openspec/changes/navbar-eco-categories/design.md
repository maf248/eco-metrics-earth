## Context

The web app (`apps/web`) is a Next.js 16 App Router project with Tailwind CSS v3 (dark-mode class strategy). It currently has a single root layout with no navigation and one placeholder home page. The six eco-category slugs are the canonical identifiers defined in `@eco-metrics/shared` (`ECO_CATEGORIES`). No routing or shared navigation chrome exists yet.

## Goals / Non-Goals

**Goals:**
- Single source of truth for navigation items: derive them directly from `ECO_CATEGORIES` so the nav stays in sync automatically if new categories are added.
- `slugToTitle` is a pure, side-effect-free function — easy to test and reuse.
- `Navbar` is a React Server Component by default (no `'use client'`); active-link detection is handled by Next.js's `usePathname` in a thin client sub-component.
- Dynamic `[category]` route handles all six slugs with a single file.

**Non-Goals:**
- No mobile hamburger menu.
- No data fetching on category pages.
- No new npm dependencies.
- No API changes.

## Decisions

### 1. Active-link detection: `usePathname` in a client sub-component
`usePathname` is a client-only hook. Rather than marking the entire `Navbar` as `'use client'`, only the individual link wrapper (`NavLink`) is a client component. This keeps the outer `Navbar` as a Server Component and limits hydration scope.

**Alternatives considered:**
- Mark the whole `Navbar` as `'use client'` — simpler but unnecessarily expands the client bundle.
- CSS `:has()` with `aria-current` — possible without JS but fragile across browsers and requires SSR cooperation.

### 2. Navigation source: `Object.values(ECO_CATEGORIES)`
The nav items are built at render time from `Object.values(ECO_CATEGORIES)`. This means adding a new `EcoCategory` automatically appears in the navbar with zero code changes.

**Alternatives considered:**
- Hardcode an array of `{ slug, title }` objects — explicit but duplicates `@eco-metrics/shared` and drifts.

### 3. `slugToTitle`: simple split-capitalize, no library
`slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')` handles all current slugs correctly. No `title-case` library needed.

### 4. Dynamic route `[category]/page.tsx`
A single `[category]` segment catches all six slugs. The page reads `params.category`, calls `slugToTitle`, and renders the heading. No 404 guard is needed for the navbar scenario — invalid slugs are out of scope.

### 5. Styling: Tailwind utility classes, no extra CSS
The navbar uses Tailwind for layout (flex, gap, padding) and color (dark-mode compatible). Active link gets a distinct color token (`text-emerald-400`) to remain consistent with an eco/green theme.

## Risks / Trade-offs

- **Slug drift**: if `ECO_CATEGORIES` slugs change, `slugToTitle` output changes automatically — this is desired behavior, not a risk.
- **`[category]` catch-all**: any URL like `/foobar` will resolve to the category page and show "Foobar" instead of a 404. Acceptable for now; a guard can be added when real data fetching is introduced.
- **Server vs. client boundary**: splitting `Navbar` (server) and `NavLink` (client) adds a small amount of structural complexity. The trade-off is a smaller client bundle and a clear pattern to follow for future nav enhancements.

## Migration Plan

1. Add `slugToTitle.ts` and `Navbar.tsx` (no breaking changes).
2. Add `[category]/page.tsx` (new route, no conflicts).
3. Update `layout.tsx` to include `<Navbar />` — visible change, but purely additive.
4. Run `npm run test` → must pass. Run `npm run build` → must pass.

No rollback complexity; changes are purely additive to the file tree.

## Open Questions

*(none — scope is clear and constrained)*
