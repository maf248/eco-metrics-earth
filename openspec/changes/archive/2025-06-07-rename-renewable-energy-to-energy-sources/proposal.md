## Why

The current "Renewable Energy" category is too narrow for the project's goal of surfacing meaningful environmental data. The dashboard should show the full electricity generation mix (fossil fuels, nuclear, hydro, wind, solar, etc.) so visitors can understand the true energy profile of each country — not just the renewable share. Renaming the category to "Energy Sources" aligns the taxonomy with the broader data scope already documented in the data-sources markdown.

## What Changes

- **BREAKING**: Rename the shared category slug from `renewable-energy` to `energy-sources`.
- **BREAKING**: Rename the public route from `/renewable-energy/` to `/energy-sources/`.
- Redirect the old `/renewable-energy/` slug to `/energy-sources/` (permanent, 308 or meta-refresh for SEO) so existing links and bookmarks do not break.
- Update the category title from "Renewable Energy" to "Energy Sources".
- Rename the React icon component from `RenewableEnergyIcon` to `EnergySourcesIcon`.
- Update all mapping files (`categoryIcon.ts`, `categoryTitle.ts`, `navItems.ts`, `slugToTitle.ts`, `path.ts`) to use the new slug and title.
- Update all unit and E2E tests that reference the old slug, title, or icon name.
- Update snapshot files that contain the old `href` or title text.
- Rename the static SVG asset in `public/icons/` from `renewable-energy.svg` to `energy-sources.svg`.
- Rename and update the data-sources documentation from `renewable-energy.md` to `energy-sources.md`.
- Update cross-references in other docs (e.g., `co2-emissions.md` linking to `renewable-energy.md`).
- Update `openspec/config.yaml` and root `README.md` to list the new slug.

## Capabilities

### New Capabilities
- `energy-sources-category`: Defines the new category taxonomy, route, title, icon, and navigation mappings for "Energy Sources".

### Modified Capabilities
- *(none — no existing formal specs in openspec/specs/ are being altered)*

## Impact

- `packages/shared/src/lib/eco-category.ts` — slug constant rename.
- `packages/shared/__tests__/` — test expectations updated.
- `apps/web/src/lib/categoryIcon.ts`, `categoryTitle.ts`, `navItems.ts`, `slugToTitle.ts`, `path.ts` — mappings updated.
- `apps/web/src/components/icons/RenewableEnergyIcon.tsx` → `EnergySourcesIcon.tsx` — component and export rename.
- `apps/web/src/components/icons/index.ts` — barrel export updated.
- `apps/web/public/icons/renewable-energy.svg` → `energy-sources.svg` — asset rename.
- `apps/web/src/app/[category]/` — dynamic route continues to work, but SEO metadata and sitemap must reflect the new slug.
- `apps/web/__tests__/` — unit tests and snapshots regenerated.
- `apps/web/e2e/` — E2E navigation and page maps updated.
- `docs/data-sources/renewable-energy.md` → `energy-sources.md` — doc rename and content refresh.
- `docs/data-sources/co2-emissions.md` — cross-reference link updated.
- `openspec/config.yaml` — category slug list updated.
- `README.md` (root and `apps/web/README.md`) — references updated.
- `postman/` collections — references to `renewable-share-energy` endpoints are **out of scope** for this rename (they refer to upstream OWID chart slugs, not our taxonomy).

## Non-Goals

- No new data-provider integration code is written (the docs already cover Ember, EIA, ENTSO-E, etc.).
- No UI redesign or new chart components are introduced.
- No changes to the API endpoints or BFF logic (the API does not yet serve category-specific data).
- No redirects or migration scripts for external bookmarks beyond the Next.js route redirect.
