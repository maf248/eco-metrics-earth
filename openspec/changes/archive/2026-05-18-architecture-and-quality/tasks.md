## 1. ApiResponse discriminated union

- [x] 1.1 In `packages/shared/src/lib/api-response.ts`, rewrite the `ApiResponse<T>` type to the discriminated union: `export type ApiResponse<T> = | { success: true; data: T; status: number } | { success: false; error: string; status: number };` — remove the old interface/type entirely
- [x] 1.2 In `packages/shared/__tests__/lib/api-response.test.ts`, rewrite the test suite to cover: (a) a success response narrows to `data` being accessible; (b) an error response narrows to `error` being accessible; (c) both branches have `status: number`; (d) TypeScript (via ts-jest) rejects a value that mixes `data` and `error` — assert the discriminant `success` boolean on each test object
- [x] 1.3 Run `npx nx test shared` — must pass with zero errors

## 2. HealthModule

- [x] 2.1 Create `apps/api/src/health/health.module.ts` with a `@Module({ controllers: [HealthController] }) export class HealthModule {}` — import `HealthController` from `./health.controller`
- [x] 2.2 In `apps/api/src/app/app.module.ts`, add `HealthModule` to the `imports` array (import from `'../health/health.module'`) and remove `HealthController` from the `controllers` array
- [x] 2.3 Run `npx nx test api` — health controller tests must still pass; fix import paths in `apps/api/__tests__/health/health.controller.test.ts` if needed

## 3. Icon deduplication and renaming

- [x] 3.1 Delete `apps/web/src/components/icons/EcoMetricsEarthIcon.tsx`
- [x] 3.2 In `apps/web/src/components/icons/index.ts`, replace the `EcoMetricsEarthIcon` import line with `export { default as EcoMetricsEarthIcon } from './SiteLogoIcon'` (re-export from SiteLogoIcon for backward compatibility)
- [x] 3.3 In `apps/web/src/lib/categoryIcon.ts`, rename the export `SITE_LOGO_ICON` to `SiteLogoIcon` and `NOT_FOUND_ICON` to `NotFoundIcon` — update all usages within that file
- [x] 3.4 In `apps/web/src/components/Navbar.tsx`, update the import to use `SiteLogoIcon` directly (remove the intermediate `const SiteLogoIcon = SITE_LOGO_ICON` line)
- [x] 3.5 In `apps/web/src/app/not-found.tsx`, update the import to use `NotFoundIcon` directly (remove the intermediate `const NotFoundIcon = NOT_FOUND_ICON` line)
- [x] 3.6 Search the entire codebase for any remaining references to `SITE_LOGO_ICON` or `NOT_FOUND_ICON` and update them

## 4. navItems file rename

- [x] 4.1 Rename `apps/web/src/lib/navItems.tsx` to `apps/web/src/lib/navItems.ts` using `git mv apps/web/src/lib/navItems.tsx apps/web/src/lib/navItems.ts`
- [x] 4.2 Verify all imports of `navItems` across the codebase still resolve (update import extensions if any reference `.tsx` explicitly — they should not since TypeScript resolves without extensions)

## 5. AppConfigService cleanup

- [x] 5.1 In `apps/api/src/config/app-config.service.ts`, replace `this.configService.get<number>('PORT') ?? 3001` with `this.configService.getOrThrow<number>('PORT')` and similarly for any other getters using the `?? default` pattern
- [x] 5.2 Run `npx nx test api` — all config service tests must pass

## 6. Dev-only warning for unregistered icons

- [x] 6.1 In `apps/web/src/lib/categoryIcon.ts`, inside `getCategoryIcon`, after checking the `CATEGORY_ICONS` map and before returning the fallback, add: `if (process.env.NODE_ENV !== 'production') { console.warn(\`[categoryIcon] No icon registered for slug: "${slug}". Falling back to default.\`); }`

## 7. Repository cleanup

- [x] 7.1 Delete `apps/web/src/components/.gitkeep` using `git rm apps/web/src/components/.gitkeep`
- [x] 7.2 Delete `apps/web/src/lib/.gitkeep` using `git rm apps/web/src/lib/.gitkeep`
- [x] 7.3 In `apps/web/.env.example`, remove the `NEXT_PUBLIC_API_URL` line

## 8. Tests

- [x] 8.1 Run `npx nx test shared` — api-response tests must pass with the new discriminated union
- [x] 8.2 Run `npx nx test api` — all tests must pass including health controller after HealthModule refactor
- [x] 8.3 Run `npx nx test web` — all tests must pass; update any test importing `navItems.tsx` or using the old constant names

## 9. Verification

- [x] 9.1 Run `npx nx build api` and `npx nx build web` and `npx nx build shared` — all must succeed
- [x] 9.2 Run `npm run lint` — zero errors and zero warnings
