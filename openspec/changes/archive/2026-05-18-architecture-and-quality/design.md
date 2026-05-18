## Context

Several structural issues were found during audit:

1. **`ApiResponse<T>`** allows `{ data: T, error: string, status: number }` — both fields present simultaneously. TypeScript cannot narrow this without a discriminant, leading to fragile `if (response.error)` checks at call sites.
2. **`HealthController`** is registered directly in `AppModule.controllers[]` instead of inside a dedicated `HealthModule`, violating the AGENTS.md module convention.
3. **`EcoMetricsEarthIcon.tsx`** is byte-for-byte identical to `SiteLogoIcon.tsx` — dead code and a maintenance trap.
4. **`SITE_LOGO_ICON` / `NOT_FOUND_ICON`** are SCREAMING_SNAKE_CASE constants used as React components, forcing `const SiteLogoIcon = SITE_LOGO_ICON` aliasing in every consumer.
5. **`navItems.tsx`** has no JSX but uses the `.tsx` extension.
6. **`AppConfigService`** has redundant `?? default` fallbacks that duplicate Joi schema defaults.
7. **`getCategoryIcon`** silently falls back to a default icon when a slug is unregistered — bugs during development are invisible.
8. **Stale `.gitkeep` files** in non-empty directories.
9. **`NEXT_PUBLIC_API_URL`** in `.env.example` — defined but never consumed.

## Goals / Non-Goals

**Goals:**
- Make `ApiResponse<T>` a discriminated union with a `success` boolean discriminant. Both branches keep `status: number`.
- Create `HealthModule` and import it into `AppModule`.
- Remove `EcoMetricsEarthIcon.tsx` and re-export from `SiteLogoIcon` via the barrel.
- Rename exports: `SITE_LOGO_ICON` → `SiteLogoIcon`, `NOT_FOUND_ICON` → `NotFoundIcon`.
- Rename `navItems.tsx` → `navItems.ts`.
- Remove `?? default` fallbacks from `AppConfigService`; use `getOrThrow`.
- Add dev-only `console.warn` in `getCategoryIcon` for unregistered slugs.
- Remove stale `.gitkeep` files and `NEXT_PUBLIC_API_URL` from `.env.example`.

**Non-Goals:**
- Removing `AppController` / `AppService` stubs.
- Migrating existing API endpoints to use the new `ApiResponse<T>` shape (there is only one: the health endpoint — it uses a plain object, not `ApiResponse<T>`).
- SVG sprite migration.
- Standardising React import style in icon files (separate iteration).

## Decisions

### D1 — `ApiResponse<T>` discriminated union shape

**Decision**:
```ts
export type ApiResponse<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: string; status: number };
```

**Rationale**: The `success` boolean is the most idiomatic discriminant for a result type in TypeScript. It mirrors the pattern used by `fetch` (`Response.ok`), SWR, and tRPC. Both branches keep `status: number` to preserve HTTP status code context (user requirement). TypeScript narrows correctly: inside `if (response.success)`, `response.data` is available; inside `else`, `response.error` is available.

**Alternative considered**: Using `{ ok: true }` or a tagged union with `type: 'success' | 'error'`. The `success` boolean is most readable and requires the least ceremony.

**Impact**: The `HealthController` currently does not use `ApiResponse<T>` — it returns a plain object `{ status: string }`. No migration needed for existing controllers. The type change only affects the shared type definition and its tests.

### D2 — `HealthModule` structure

**Decision**: Create `apps/api/src/health/health.module.ts`:
```ts
@Module({ controllers: [HealthController] })
export class HealthModule {}
```
Update `AppModule` to import `HealthModule` and remove `HealthController` from `AppModule.controllers`.

**Rationale**: Follows the AGENTS.md convention: "Create `<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`" and "Import the new module into `AppModule`." Encapsulation makes it easy to add a `HealthService` later without touching `AppModule`.

### D3 — Icon export renaming strategy

**Decision**: 
- In `categoryIcon.ts`: rename `SITE_LOGO_ICON` → `SiteLogoIcon` and `NOT_FOUND_ICON` → `NotFoundIcon`.
- In `Navbar.tsx`: import `SiteLogoIcon` directly, remove the intermediate `const`.
- In `not-found.tsx`: import `NotFoundIcon` directly, remove the intermediate `const`.
- In `icons/index.ts`: remove `EcoMetricsEarthIcon.tsx` file; add `export { default as EcoMetricsEarthIcon } from './SiteLogoIcon'` to the barrel for backward compatibility.

**Rationale**: PascalCase names are usable directly as JSX component names. The intermediate `const` was a workaround for the naming mismatch — removing the root cause is cleaner than the workaround.

### D4 — `AppConfigService.getOrThrow` pattern

**Decision**: Replace `this.configService.get<T>('KEY') ?? fallback` with `this.configService.getOrThrow<T>('KEY')` for all env vars that have Joi defaults (i.e., are always present after validation). This makes it explicit that the value is expected to be present.

**Rationale**: Joi validation ensures all declared vars are present with their defaults. If `getOrThrow` throws in production, it means the Joi schema is missing a variable — a bug to fix, not to silently swallow.

### D5 — Dev-only warning in `getCategoryIcon`

**Decision**: Add:
```ts
if (process.env.NODE_ENV !== 'production') {
  console.warn(`[categoryIcon] No icon registered for slug: "${slug}". Falling back to default.`);
}
```
**Rationale**: Silent fallback means developers introducing new categories forget to register icons. The warning surfaces the bug in development without affecting production behaviour.

## Risks / Trade-offs

- **`ApiResponse<T>` breaking change**: Any future code that constructs `ApiResponse` objects must use the new shape. Since the only current consumer (`HealthController`) does not use this type, the risk is low. Tests for `ApiResponse` must be rewritten.
- **Renaming `.tsx` → `.ts`**: Some editors/OSes are case-insensitive and may not detect the rename. Use `git mv` to ensure git tracks the rename correctly.
- **`getOrThrow` in tests**: Integration tests that don't set up all env vars may throw. Mitigation: the Joi schema provides defaults for all variables — `getOrThrow` should never throw if `ConfigModule` is properly initialised.

## Open Questions

- Should `EcoMetricsEarthIcon` remain a re-export alias permanently, or should all usages be migrated to `SiteLogoIcon`? → Re-export for now; migrate as part of a future cleanup if the name `EcoMetricsEarthIcon` is never used in the codebase.
