## Why

Several architectural deviations and code quality issues were found during an audit that, if left unaddressed, will compound as the codebase grows: `ApiResponse<T>` allows an invalid state where `data` and `error` coexist; `HealthController` lives outside a dedicated module, violating the documented NestJS module convention; two icon components are byte-for-byte identical; several constants use SCREAMING_SNAKE_CASE names that force unnecessary `const` aliasing in JSX; and a utility file uses the wrong extension (`.tsx` instead of `.ts`). Fixing these now keeps the architecture clean before the API modules are built out.

## What Changes

- **`ApiResponse<T>`** (`packages/shared`): Convert to a proper discriminated union — `{ success: true; data: T; status: number } | { success: false; error: string; status: number }` — so TypeScript narrows the type at call sites. **BREAKING** for any existing consumer.
- **`HealthModule`**: Wrap `HealthController` in its own `HealthModule` and import the module into `AppModule`, following the convention documented in `AGENTS.md`.
- **Icon deduplication**: Remove `EcoMetricsEarthIcon.tsx` (identical to `SiteLogoIcon.tsx`). Re-export `SiteLogoIcon` as `EcoMetricsEarthIcon` from the barrel if the name is needed elsewhere.
- **Icon export naming**: Rename `SITE_LOGO_ICON` → `SiteLogoIcon` and `NOT_FOUND_ICON` → `NotFoundIcon` in `categoryIcon.ts` so they can be used directly in JSX without an intermediate `const` alias.
- **`navItems.tsx` → `navItems.ts`**: Rename since the file contains no JSX.
- **`AppConfigService`**: Remove the redundant `?? default` fallback that duplicates Joi schema defaults. Use `getOrThrow` for required values.
- **`BUG-06` warning**: Add a `console.warn` (dev-only) in `getCategoryIcon` when a slug has no registered icon, so missing icons are caught during development rather than silently falling back.
- **Stale `.gitkeep` files**: Remove `apps/web/src/components/.gitkeep` and `apps/web/src/lib/.gitkeep` (directories are no longer empty).
- **Remove `NEXT_PUBLIC_API_URL`**: Delete from `apps/web/.env.example` since it is defined but never consumed.

## Non-Goals

- Migrating the API to a full modular architecture with per-feature modules (only `health` is moved; new modules come with their features).
- Replacing `AppController` / `AppService` stubs (they remain as placeholders until a root API route is designed).
- SVG sprite migration (deferred — low priority, higher effort).
- React import style standardisation across icon files (low impact, addressed in `configuration-and-tests`).

## Capabilities

### New Capabilities

- `api-response-type`: Discriminated union `ApiResponse<T>` with `success` discriminant and `status: number` on both branches.
- `health-module`: Dedicated `HealthModule` encapsulating `HealthController`.

### Modified Capabilities

*(none — no existing spec files exist for these areas)*

## Impact

- **`packages/shared/src/lib/api-response.ts`**: Rewrite type definition. **BREAKING** for all consumers.
- **`apps/api/src/health/`**: New `health.module.ts`; `app.module.ts` updated to import `HealthModule` instead of `HealthController` directly.
- **`apps/web/src/components/icons/`**: Remove `EcoMetricsEarthIcon.tsx`; update `index.ts` barrel to re-export.
- **`apps/web/src/lib/categoryIcon.ts`**: Rename exports; add dev-only warning.
- **`apps/web/src/components/Navbar.tsx`**: Update import to use renamed `SiteLogoIcon` export directly.
- **`apps/web/src/app/not-found.tsx`**: Update import to use renamed `NotFoundIcon` export directly.
- **`apps/web/src/lib/navItems.tsx`**: Rename file to `navItems.ts`.
- **`apps/api/src/config/app-config.service.ts`**: Remove `??` fallbacks; switch to `getOrThrow`.
- **`apps/web/.env.example`**: Remove `NEXT_PUBLIC_API_URL` line.
- **Tests**: `api-response.test.ts` must be rewritten for the new discriminated union shape; `health.controller.test.ts` import paths may change; `navItems.test.ts` must reference new filename.
- **Breaking**: `ApiResponse<T>` shape change — all existing usages in `apps/api` that construct responses must be updated.
