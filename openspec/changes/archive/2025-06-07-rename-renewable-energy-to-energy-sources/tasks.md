## 1. Shared Types

- [x] 1.1 Rename `RENEWABLE_ENERGY: 'renewable-energy'` to `ENERGY_SOURCES: 'energy-sources'` in `packages/shared/src/lib/eco-category.ts`.
- [x] 1.2 Update `packages/shared/__tests__/lib/eco-category.test.ts` to assert `energy-sources` and remove assertions for `renewable-energy`.
- [x] 1.3 Run `npx nx test shared` and verify 100% coverage with zero errors.

## 2. Web Library Mappings

- [x] 2.1 Update `apps/web/src/lib/categoryTitle.ts` to map `energy-sources` → "Energy Sources" and remove `renewable-energy` entry.
- [x] 2.2 Update `apps/web/src/lib/categoryIcon.ts` to map `energy-sources` → `EnergySourcesIcon` and remove `renewable-energy` entry.
- [x] 2.3 Update `apps/web/src/lib/navItems.ts` to use `energy-sources` slug with "Energy Sources" label in the same nav position.
- [x] 2.4 Update `apps/web/src/lib/slugToTitle.ts` to map `energy-sources` → "Energy Sources" and remove `renewable-energy` entry.
- [x] 2.5 Update `apps/web/src/lib/path.ts` (if it contains category paths) to reference `energy-sources`.

## 3. Web Components — Icon Rename

- [x] 3.1 Rename `apps/web/src/components/icons/RenewableEnergyIcon.tsx` → `EnergySourcesIcon.tsx`.
- [x] 3.2 Update the component function name to `EnergySourcesIcon` and change internal `aria-labelledby` / `title` IDs from `renewable-energy-icon-title` to `energy-sources-icon-title`.
- [x] 3.3 Update `apps/web/src/components/icons/index.ts` barrel export from `RenewableEnergyIcon` to `EnergySourcesIcon`.
- [x] 3.4 Update `apps/web/__tests__/components/icons/index.test.tsx` to expect `EnergySourcesIcon` in the exports list.

## 4. Web App — Routes, SEO & Redirect

- [x] 4.1 Add a permanent redirect entry in `apps/web/next.config.ts` (or `next.config.js` / `next.config.mjs`) mapping `/renewable-energy` → `/energy-sources` with status 308.
- [x] 4.2 Verify the dynamic `[category]` route (`apps/web/src/app/[category]/page.tsx`) does not contain hardcoded references to `renewable-energy`; it should already work generically via the slug param.
- [x] 4.3 Update `apps/web/src/app/sitemap.ts` (or sitemap generation logic) if it enumerates categories explicitly; ensure it outputs `energy-sources` and not `renewable-energy`.

## 5. Static Assets

- [x] 5.1 Rename `apps/web/public/icons/renewable-energy.svg` → `energy-sources.svg`.
- [x] 5.2 If the SVG file contains an internal `id` or `title` referencing "renewable", update it to "energy sources".

## 6. Unit Tests & Snapshots

- [x] 6.1 Update `apps/web/__tests__/app/[category]/page.test.tsx` to test `energy-sources` instead of `renewable-energy`.
- [x] 6.2 Update `apps/web/__tests__/lib/slugToTitle.test.ts` to assert `slugToTitle('energy-sources')` returns "Energy Sources".
- [x] 6.3 Regenerate snapshots: run `npx nx test web -- --updateSnapshot` and verify only the expected `Navbar.test.tsx.snap` diffs appear (href and title changes).
- [x] 6.4 Visually review the `.snap` diffs to confirm no unintended side effects.

## 7. End-to-End Tests

- [x] 7.1 Update `apps/web/e2e/utils/pages.ts` to map `energy-sources` → "Energy Sources" and remove `renewable-energy`.
- [x] 7.2 Add a new E2E smoke test that visits `/renewable-energy/` and asserts it redirects (308) to `/energy-sources/`.
- [x] 7.3 Run `npx nx run web:e2e` and verify all 219 tests pass with zero failures.

## 8. Documentation

- [x] 8.1 Rename `docs/data-sources/renewable-energy.md` → `energy-sources.md`.
- [x] 8.2 Update the front matter / H1 title in `docs/data-sources/energy-sources.md` from "Renewable Energy" to "Energy Sources".
- [x] 8.3 Update the cross-reference link in `docs/data-sources/co2-emissions.md` from `renewable-energy.md` to `energy-sources.md`.
- [x] 8.4 Review `docs/data-sources/energy-sources.md` for any remaining "Renewable Energy" references that should now read "Energy Sources" (scope expansion).

## 9. Project Configuration & READMEs

- [x] 9.1 Update `openspec/config.yaml` to replace `renewable-energy` with `energy-sources` in the category slug list.
- [x] 9.2 Update `README.md` (root) to replace `renewable-energy` references with `energy-sources`.
- [x] 9.3 Update `apps/web/README.md` to replace `RenewableEnergyIcon.tsx` with `EnergySourcesIcon.tsx`.

## 10. Verification

- [x] 10.1 Run `npx nx run-many --target=build --all` and verify zero TypeScript or build errors.
- [x] 10.2 Run `npm run test` (unit + E2E) and confirm all suites pass with zero errors and zero warnings.
- [x] 10.3 Run `npm run lint` and confirm no ESLint errors.
- [x] 10.4 Do a manual smoke test by starting `npm run dev` and navigating to `/energy-sources/`; verify the page renders and the navbar shows "Energy Sources".
- [x] 10.5 Visit `/renewable-energy/` in the smoke test and confirm the 308 redirect to `/energy-sources/`.
