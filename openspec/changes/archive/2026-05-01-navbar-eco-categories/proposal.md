## Why

The web app currently has a blank landing page with no navigation, making it impossible to browse the six eco-category sections. A persistent top navigation bar is the minimum viable chrome needed to make the dashboard usable and set the foundation for per-category pages.

## What Changes

- **New**: `slugToTitle` utility — converts an `EcoCategory` slug to a human-readable title (e.g. `air-quality` → `Air Quality`).
- **New**: `Navbar` component — renders one link per `EcoCategory` slug, highlights the active route, and is included in the root layout.
- **New**: Dynamic route `apps/web/src/app/[category]/page.tsx` — placeholder page that displays the section title derived from the slug.
- **Modified**: `apps/web/src/app/layout.tsx` — mounts `<Navbar />` so it appears on every page.
- **New**: Unit tests for `slugToTitle`, `Navbar`, and the `[category]` page.

## Capabilities

### New Capabilities

- `eco-navbar`: Top navigation bar linking to all six eco-category sections with active-link highlighting.
- `slug-to-title`: Pure utility that transforms any `EcoCategory` slug into its display title.
- `category-page`: Dynamic route page that renders the title of the current section.

### Modified Capabilities

*(none — no existing spec-level requirements are changing)*

## Non-Goals

- No data fetching or charts on the category pages (placeholder only).
- No mobile drawer / hamburger menu (simple horizontal nav is sufficient for now).
- No animation or page transitions.
- No changes to the API (`apps/api`).
- No new npm dependencies.

## Impact

- `apps/web/src/app/layout.tsx` — adds `<Navbar />` import and usage.
- `apps/web/src/lib/slugToTitle.ts` — new utility file.
- `apps/web/src/components/Navbar.tsx` — new component.
- `apps/web/src/app/[category]/page.tsx` — new dynamic route.
- `apps/web/__tests__/` — three new test files.
- No API changes, no shared-package changes, no new dependencies.
