## Context

Next.js App Router provides a file-based convention for custom 404 pages: any `not-found.tsx` file in the `app/` directory is automatically served with HTTP 404 when `notFound()` is called from a route, or when no route matches. Prior to this change, the `[category]/page.tsx` dynamic route accepted any slug without validation, causing invalid URLs to render with the slug as their title and returning HTTP 200 — incorrect status and a poor UX pattern.

The home page logo was also undersized (64×64px) for a hero position and the web tsconfig had stale output-related options (`rootDir`, `outDir`, `tsBuildInfoFile`, `incremental`) that were incompatible with workspace path aliases and broke the production build.

## Goals / Non-Goals

**Goals:**
- Return proper HTTP 404 for any URL that does not match a known route or valid category slug.
- Show a branded, generic 404 screen with no URL disclosure.
- The 404 icon links back to home for easy recovery.
- Keep the `not-found.tsx` visually consistent with the rest of the app (same layout structure, same dark theme).
- Fix the pre-existing tsconfig build breakage as part of this change.

**Non-Goals:**
- Custom error pages for 5xx or other status codes.
- Server-side logging or analytics of 404 events.
- Internationalisation of the error message.

## Decisions

### 1. Use `not-found.tsx` + `notFound()` (Next.js convention) over a catch-all route

**Decision:** Use the native `not-found.tsx` file convention and `notFound()` from `next/navigation` inside `[category]/page.tsx`.

**Rationale:** Next.js App Router handles the 404 status code automatically when this convention is used. A catch-all `[...slug]/page.tsx` would intercept every unknown URL but would require manual status-code setting, bypass Next.js's built-in not-found boundary, and add complexity for no benefit.

**Alternative considered:** `[[...slug]]/page.tsx` optional catch-all — rejected because it conflicts with the existing `[category]` segment and makes the route tree harder to reason about.

---

### 2. Validate slugs against `ECO_CATEGORIES` at runtime (not via `generateStaticParams` alone)

**Decision:** Call `notFound()` explicitly inside both `CategoryPage` and `generateMetadata` after checking `Object.values(ECO_CATEGORIES).includes(category)`.

**Rationale:** `generateStaticParams` only controls which paths are pre-rendered at build time. At runtime (dynamic fallback), Next.js still calls the page component for unrecognised slugs unless `dynamicParams = false` is set. Explicit runtime validation is the clearest, most defensive approach and works regardless of rendering mode.

**Alternative considered:** `export const dynamicParams = false` — this would cause Next.js to return 404 automatically for unknown slugs without a `generateStaticParams` match, but it requires the static params list to be exhaustive and is less explicit. Runtime validation was preferred for clarity.

---

### 3. Icon as `<Link>` with `aria-label`, not a separate "Back to home" text link

**Decision:** Wrap the error icon `<div>` in a `<Link href="/" aria-label="Go back to home">`. No separate visible text link.

**Rationale:** The icon is a large, prominent element — making it the navigation affordance keeps the layout clean and avoids redundant UI. The `aria-label` ensures accessibility for screen readers. The icon itself uses `alt=""` + `aria-hidden` since its decorative role is explained by the surrounding heading.

---

### 4. Remove `rootDir`/`outDir`/`tsBuildInfoFile`/`incremental` from `apps/web/tsconfig.json`

**Decision:** Remove these four compiler options entirely from `apps/web/tsconfig.json`.

**Rationale:** `noEmit: true` means the compiler never writes output files, making `outDir` and `tsBuildInfoFile` meaningless. `rootDir` restricts which files the compiler can include — but workspace path aliases resolve to files outside `src/` (e.g. `packages/shared/src/index.ts`), causing a compile error. `incremental` without a `tsBuildInfoFile` falls back to `.tsbuildinfo` in the project root, polluting the workspace. None of these options serve a purpose in a Next.js app that delegates bundling and emission to the Next.js compiler.

## Risks / Trade-offs

- **Risk:** Future addition of a new `EcoCategory` requires no code change in the not-found logic (validation uses `ECO_CATEGORIES` directly) — but if a category is removed from `ECO_CATEGORIES`, its URL will start returning 404. This is the desired behaviour.
  → Mitigation: none needed; this is correct-by-design.

- **Risk:** `not-found.tsx` does not support `generateMetadata` in all Next.js versions (the `export const metadata` static export is used instead).
  → Mitigation: static `metadata` export is the documented pattern for `not-found.tsx`; the title template in `layout.tsx` still applies.

## Open Questions

None — this change is fully implemented and tested.
