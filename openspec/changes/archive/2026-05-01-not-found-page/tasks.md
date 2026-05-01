## 1. Shared icon constant

- [x] 1.1 Export `NOT_FOUND_ICON = '/icons/error-page-svgrepo-com.svg'` from `apps/web/src/lib/categoryIcon.ts`

## 2. Fix tsconfig

- [x] 2.1 Remove `rootDir`, `outDir`, `tsBuildInfoFile`, and `incremental` from `apps/web/tsconfig.json`

## 3. Home page logo size

- [x] 3.1 Update `apps/web/src/app/page.tsx`: container `w-24 h-24` → `w-48 h-48`, image `64×64` → `128×128`

## 4. Custom 404 page

- [x] 4.1 Create `apps/web/src/app/not-found.tsx` with `export const metadata`, error icon (`128×128`) wrapped in `<Link href="/" aria-label="Go back to home">`, `<h1>¡Ups! We couldn't find that...</h1>`, and generic subtext — no URL disclosure
- [x] 4.2 Add `data-testid="not-found-icon"` to the icon wrapper div

## 5. Category slug validation

- [x] 5.1 In `apps/web/src/app/[category]/page.tsx`, import `notFound` from `next/navigation` and `ECO_CATEGORIES` from `@eco-metrics/shared`
- [x] 5.2 Call `notFound()` in `generateMetadata` if `category` is not in `Object.values(ECO_CATEGORIES)`
- [x] 5.3 Call `notFound()` in `CategoryPage` component if `category` is not in `Object.values(ECO_CATEGORIES)`

## 6. Tests

- [x] 6.1 Create `apps/web/__tests__/app/not-found.test.tsx`: tests for heading content, no-URL assertion, icon wrapper, home link (`href="/"`), and snapshot
- [x] 6.2 Update `apps/web/__tests__/app/[category]/page.test.tsx`: add `jest.mock('next/navigation')` and tests for `notFound()` being called for invalid slugs in both `CategoryPage` and `generateMetadata`
- [x] 6.3 Update snapshots: `HomePage` (logo size change) and `NotFound` (new snapshot)

## 7. Verification

- [x] 7.1 `npx nx test web` — 82 tests, 11 suites, 4 snapshots, zero warnings
- [x] 7.2 `npx nx build web` — compiles successfully, 3 routes generated, zero errors
