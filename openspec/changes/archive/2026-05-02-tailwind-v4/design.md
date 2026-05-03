## Context

`apps/web` currently uses Tailwind CSS v3.4.19 with:
- `apps/web/tailwind.config.ts` — `darkMode: 'class'`, no custom theme extensions, no plugins
- `apps/web/postcss.config.js` — `tailwindcss: {}` + `autoprefixer: {}`
- `apps/web/src/app/globals.css` — three `@tailwind` directives only
- Root `package.json` pins: `tailwindcss@3.4.19`, `autoprefixer@10.5.0`, `postcss@8.5.13`

A utility-class audit of `apps/web/src/**` shows the project uses standard layout, color, spacing, and interactive utilities. No deprecated v3 patterns (`bg-opacity-*`, `text-opacity-*`, `border-opacity-*`, `divide-*`) are present. The most sensitive usage is:
- `focus-visible:ring-2 focus-visible:ring-offset-2` (explicit sizes — unaffected by ring default change)
- `bg-white/8`, `bg-white/5`, `bg-white/10`, `bg-white/15` (opacity modifiers — syntax unchanged in v4)
- `sr-only focus:not-sr-only` (still supported in v4)

## Goals / Non-Goals

**Goals:**
- Upgrade to Tailwind CSS v4 (latest stable, exact pin)
- Migrate build tooling: replace `tailwindcss` + `autoprefixer` → `@tailwindcss/postcss`
- Migrate configuration: delete `tailwind.config.ts`, move dark mode variant to CSS
- Ensure build, lint, and all 130 tests pass after migration with zero warnings

**Non-Goals:**
- Adopting v4-only features (container queries, `@starting-style`, 3D transforms, etc.)
- Changing the dark mode strategy from `class` to `media`
- Migrating from PostCSS to the Vite plugin (`@tailwindcss/vite`)
- Modifying `apps/api` or `packages/shared`

## Decisions

### D1 — Manual migration over official codemod

**Decision:** Migrate manually; do not run `npx @tailwindcss/upgrade`.

**Rationale:** The codemod rewrites `package.json` with `^` version ranges, which violates the project's exact-pin policy. The existing config is minimal (no custom theme, no plugins), making manual migration straightforward and giving full control over every change. The codemod also modifies CSS files in ways that may conflict with existing formatting conventions.

**Alternative considered:** Running the codemod then fixing version pins afterward — rejected because it introduces more noise and risk of unintended changes.

---

### D2 — CSS-first config: `@import "tailwindcss"` + `@custom-variant dark`

**Decision:** Delete `tailwind.config.ts` entirely. Express the only non-default setting (`darkMode: 'class'`) as a `@custom-variant` rule in `globals.css`.

**v3 → v4 mapping:**
```css
/* v3: tailwind.config.ts */
darkMode: 'class'

/* v4: globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

**Rationale:** v4's CSS-first model is the canonical approach; keeping a JS config file is not supported in v4. Content detection is now automatic — the `content` array is no longer needed.

**Alternative considered:** Using a `@config` directive to point to a minimal JS file — rejected as unnecessary complexity when there is nothing to configure beyond the dark variant.

---

### D3 — Remove `autoprefixer` as a standalone dependency

**Decision:** Remove `autoprefixer@10.5.0` from `package.json`. `@tailwindcss/postcss` bundles Lightning CSS, which handles vendor prefixing internally.

**Rationale:** `autoprefixer` is redundant in v4 and the official docs explicitly state it is no longer needed. Keeping it adds unnecessary work with no benefit.

**Alternative considered:** Keeping `autoprefixer` as a no-op — rejected; it's dead weight and could cause confusion.

---

### D4 — Keep `postcss` as an explicit dependency

**Decision:** Retain `postcss` in root `package.json` at its current version (or upgrade to whatever `@tailwindcss/postcss` requires as a peer dep).

**Rationale:** `postcss` is a peer dependency of `@tailwindcss/postcss`. Next.js also requires it explicitly. Keeping it pinned prevents accidental version drift.

## Risks / Trade-offs

**[Risk] Ring default width changed: `ring` renders 1px in v4 (was 3px in v3)**
→ Mitigation: All ring usages in the codebase use explicit sizes (`ring-2`), so the default change has no effect. Verified by audit.

**[Risk] v4 auto content detection may miss files**
→ Mitigation: v4 scans all `.html`, `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs` files by default, which covers the entire `apps/web/src/` tree. If a class goes missing in the build output, add an explicit `@source` directive in `globals.css`.

**[Risk] `bg-white/8` is a non-standard opacity step**
→ Mitigation: v4 supports arbitrary opacity modifiers natively (as v3 did via JIT). No change required.

**[Risk] Build cache (NX + Next.js) may serve stale CSS after migration**
→ Mitigation: Clear `.next/` and NX cache (`rm -rf apps/web/.next .nx/cache`) before final verification build.

## Migration Plan

1. Update `package.json` (root): remove `tailwindcss`, `autoprefixer`; add `@tailwindcss/postcss` (exact pin)
2. Run `npm install`
3. Update `apps/web/postcss.config.js`: replace plugin block
4. Delete `apps/web/tailwind.config.ts`
5. Migrate `apps/web/src/app/globals.css`: replace `@tailwind` directives
6. Clear `.next/` and NX cache
7. Run `npx nx build web` — fix any missing/renamed utilities
8. Run `npm run test` — fix any snapshot diffs
9. Run `npm run lint`
10. Commit: `chore(deps): migrate tailwind css v3 to v4`

**Rollback:** `git revert` the single commit; run `npm install` to restore v3 packages.

## Open Questions

- *(none — migration scope is fully defined)*
