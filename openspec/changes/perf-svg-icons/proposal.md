## Why

All 13 UI icons are served as static SVG files from `/public/icons/` and loaded via Next.js `<Image>`. On any page with the full navigation bar, this triggers up to 13 separate HTTP requests just for icons, none of which benefit from CSS theming (`currentColor` is unavailable on `<img>`-rendered SVGs). Inlining icons as React components eliminates these requests, enables colour inheritance from Tailwind classes, and removes the dependency on the Next.js image pipeline for purely decorative UI elements.

## What Changes

- Add `apps/web/src/components/icons/` directory with one React SVG component per icon (13 total), each accepting standard SVG props (`className`, `width`, `height`, `aria-hidden`, etc.).
- Add `apps/web/src/components/icons/index.ts` barrel export.
- Update `apps/web/src/lib/categoryIcon.ts` to export icon components (keyed by `EcoCategory` slug plus `SITE_LOGO` and `NOT_FOUND`) instead of public path strings.
- Update `apps/web/src/lib/navItems.tsx` to carry icon components instead of path strings.
- Update `apps/web/src/components/NavLink.tsx` to render the icon component directly instead of `<Image>`.
- Update `apps/web/src/components/Navbar.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/[category]/page.tsx`, and `apps/web/src/app/not-found.tsx` to use icon components.
- Keep `/public/icons/` SVG files intact (needed for manifest icons, OG images, and other non-React consumers).
- Update all affected tests and snapshots.

## Capabilities

### New Capabilities

- `svg-icon-components`: A set of typed React SVG components in `apps/web/src/components/icons/` that render inline SVG, accept standard HTML SVG attributes, and are exported via a barrel index.

### Modified Capabilities

- `category-icon`: `categoryIcon.ts` changes its export contract from SVG path strings to React components. Any consumer that currently reads path strings must migrate to rendering components.
- `nav-items`: `navItems.tsx` icon field type changes from `string` to a React component type. `NavLink` renders the component instead of `<Image>`.

## Non-Goals

- SVG sprite sheet / `<use>` approach — React component inlining is preferred for type safety and tree-shaking.
- Removing `/public/icons/` files — they remain for non-React consumers.
- Optimising or minifying SVG source — out of scope (can be a follow-up with `@svgr/webpack` or similar).
- Adding new icons — only the existing 13 are in scope.
- Changes to the API app or shared package.

## Impact

- `apps/web/src/components/icons/` — 14 new files (13 components + barrel index).
- `apps/web/src/lib/categoryIcon.ts` — rewritten; export type changes from `string` to `React.ComponentType`.
- `apps/web/src/lib/navItems.tsx` — `NavItem.icon` type changes.
- `apps/web/src/components/NavLink.tsx` — renders icon component, removes `<Image>` import.
- `apps/web/src/components/Navbar.tsx` — uses logo component.
- `apps/web/src/app/page.tsx` — uses logo component.
- `apps/web/src/app/[category]/page.tsx` — uses category icon component.
- `apps/web/src/app/not-found.tsx` — uses error icon component.
- All related `__tests__/` files and snapshot files updated.
