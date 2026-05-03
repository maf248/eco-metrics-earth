## Why

Tailwind CSS v3 reached end of active development; Tailwind CSS v4 ships a fundamentally redesigned engine (Oxide, written in Rust/Lightning CSS) that delivers faster builds, zero-config content detection, and a CSS-first configuration model. Upgrading now keeps the project on the supported release track and unlocks modern CSS features (native cascade layers, `color-mix()`, container queries, etc.) without needing extra plugins.

## What Changes

- **Replace** `tailwindcss@3.4.19` with `tailwindcss@4.x` (latest stable) in root `package.json`
- **Replace** `autoprefixer@10.5.0` with `@tailwindcss/postcss` — v4 bundles autoprefixing internally; the standalone `autoprefixer` package is no longer needed
- **Replace** `postcss.config.js` plugin block (`tailwindcss` + `autoprefixer`) with a single `@tailwindcss/postcss` entry
- **Delete** `apps/web/tailwind.config.ts` — v4 uses CSS-first configuration; the JS config file is eliminated
- **Migrate** `apps/web/src/app/globals.css`: replace `@tailwind base/components/utilities` directives with `@import "tailwindcss"` and move `darkMode: 'class'` to a `@custom-variant dark` rule
- **Audit & fix** any utility class renames between v3 and v4 (e.g. shadow defaults, ring defaults, `divide-*` changes) across all `apps/web/src/**` files
- **Remove** `postcss` as an explicit root dependency if `@tailwindcss/postcss` bundles it (verify peer deps)

## Capabilities

### New Capabilities

- `tailwind-v4-config`: Migrate build tooling and configuration — PostCSS plugin swap, deletion of `tailwind.config.ts`, CSS-based theme/variant config in `globals.css`
- `tailwind-v4-utilities`: Audit all utility classes used in `apps/web/src/**` for v3→v4 breaking renames and apply fixes

### Modified Capabilities

- *(none — no existing openspec specs cover Tailwind styling)*

## Impact

- **`package.json` (root)**: `tailwindcss`, `autoprefixer` removed; `@tailwindcss/postcss` added
- **`apps/web/postcss.config.js`**: plugin config replaced
- **`apps/web/tailwind.config.ts`**: deleted
- **`apps/web/src/app/globals.css`**: directives migrated, dark variant declared
- **`apps/web/src/**/*.{tsx,ts}`**: potential class name fixes (audit required)
- **No changes** to `apps/api`, `packages/shared`, or any backend code
- **No new routes, components, or API contracts** introduced

## Non-Goals

- Adopting new v4-only features (container queries, 3D transforms, `@starting-style`, etc.) — this is a straight migration, no feature additions
- Changing the dark mode strategy from `class` to something else
- Migrating to the Vite-based `@tailwindcss/vite` plugin — the project uses Next.js with PostCSS and stays on that path
- Updating `postcss` beyond what peer deps require
