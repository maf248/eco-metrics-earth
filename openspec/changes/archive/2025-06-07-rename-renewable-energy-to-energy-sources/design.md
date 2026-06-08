## Context

The project defines 11 eco-categories via the `ECO_CATEGORIES` constant in `@eco-metrics/shared`. The web app generates a dynamic route `[category]` that renders a page for each slug. Navigation, SEO, and icons are all mapped from this central taxonomy.

Currently the slug `renewable-energy` represents a narrow scope (only renewables). The data-sources documentation already covers broader electricity-mix data (coal, gas, nuclear, hydro, wind, solar, etc.) from providers like Ember, EIA, and ENTSO-E. The taxonomy should reflect that broader scope.

## Goals / Non-Goals

**Goals:**
- Replace the `renewable-energy` slug with `energy-sources` everywhere in the monorepo.
- Ensure the old route `/renewable-energy/` redirects permanently to `/energy-sources/`.
- Update all visual labels, icon names, and test expectations.
- Rename and refresh the data-sources markdown.
- Regenerate snapshots to match the new slug and title.

**Non-Goals:**
- No new data-provider integration code.
- No new chart or visualization components.
- No API endpoint changes (the BFF does not yet serve category data).
- No new Postman collections or upstream OWID chart renames (those refer to external chart slugs, not our taxonomy).

## Decisions

### 1. Next.js permanent redirect for the old route
- **Decision**: Add a `redirects()` entry in `next.config.ts` mapping `/renewable-energy` → `/energy-sources` with status 308 (permanent redirect).
- **Rationale**: Next.js handles this at the edge/Vercel level. It preserves SEO link equity and does not require a custom middleware or route handler.
- **Alternative considered**: Meta-refresh in a catch-all page. Rejected because it is slower and worse for SEO.

### 2. Rename files rather than create duplicates
- **Decision**: Rename `RenewableEnergyIcon.tsx` → `EnergySourcesIcon.tsx`, `renewable-energy.svg` → `energy-sources.svg`, and `renewable-energy.md` → `energy-sources.md`.
- **Rationale**: Keeping old files would create dead code and confusion. The redirect handles external links.
- **Alternative considered**: Leave old files as wrappers/aliases. Rejected to avoid maintenance burden.

### 3. Update snapshots via `--updateSnapshot`
- **Decision**: After renaming, run `npx nx test web -- --updateSnapshot` to regenerate `Navbar.test.tsx.snap`.
- **Rationale**: The snapshot contains hardcoded `href="/renewable-energy"` and title text. Manual editing is error-prone.
- **Alternative considered**: Delete snapshots and let them regenerate on next run. Rejected because it is less explicit.

### 4. Keep the category order in navigation
- **Decision**: `energy-sources` will keep the same position in the nav item list as `renewable-energy` had (to avoid surprising users).
- **Rationale**: The rename is semantic, not structural.
- **Alternative considered**: Reorder categories alphabetically. Rejected — out of scope.

## Risks / Trade-offs

- **[Risk] SEO ranking dip** after changing the canonical URL.
  - **Mitigation**: 308 permanent redirect + updated sitemap.xml + canonical link tag already points to the new trailing-slash URL.
- **[Risk] E2E tests fail** because `e2e/utils/pages.ts` still references the old slug.
  - **Mitigation**: The tasks checklist explicitly includes updating E2E page maps.
- **[Risk] Snapshot diff noise** in the PR.
  - **Mitigation**: The snapshot update is intentional and will be mentioned in the PR description.
- **[Risk] External bookmarks break** if the redirect is misconfigured.
  - **Mitigation**: Add a smoke E2E test that visits `/renewable-energy/` and asserts redirect to `/energy-sources/`.

## Migration Plan

1. Rename shared types and update shared tests.
2. Rename web components/lib files and update all imports/mappings.
3. Rename static assets.
4. Add Next.js redirect in `next.config.ts`.
5. Update E2E page maps and add redirect smoke test.
6. Regenerate snapshots.
7. Rename and update docs.
8. Run `npm run test` and `npm run build` to verify.
9. Commit with `feat(web)!: rename renewable-energy category to energy-sources` (breaking-change marker).

## Open Questions

- Should the nav order change when the rename happens?
  - **Resolution**: No, keep the same order to minimize UX disruption.
