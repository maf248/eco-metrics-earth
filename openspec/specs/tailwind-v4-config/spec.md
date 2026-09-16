# tailwind-v4-config Specification

## Purpose
TBD - created by archiving change tailwind-v4. Update Purpose after archive.
## Requirements
### Requirement: PostCSS uses @tailwindcss/postcss plugin
The build toolchain SHALL use `@tailwindcss/postcss` as the sole PostCSS plugin for Tailwind processing. The `tailwindcss` and `autoprefixer` packages SHALL be removed from `package.json`. The `postcss` package SHALL remain as an explicit dependency.

#### Scenario: PostCSS config uses new plugin
- **WHEN** `apps/web/postcss.config.js` is read
- **THEN** it SHALL contain `'@tailwindcss/postcss': {}` and SHALL NOT contain `tailwindcss: {}` or `autoprefixer: {}`

#### Scenario: Removed packages are absent from package.json
- **WHEN** root `package.json` dependencies are inspected
- **THEN** `tailwindcss` and `autoprefixer` SHALL NOT be present, and `@tailwindcss/postcss` SHALL be present with an exact version (no `^` or `~`)

---

### Requirement: tailwind.config.ts is deleted
The file `apps/web/tailwind.config.ts` SHALL be deleted. All configuration previously expressed there SHALL be migrated to CSS.

#### Scenario: Config file does not exist after migration
- **WHEN** the `apps/web/` directory is listed
- **THEN** `tailwind.config.ts` SHALL NOT be present

---

### Requirement: globals.css uses v4 import and declares dark variant
`apps/web/src/app/globals.css` SHALL use `@import "tailwindcss"` in place of the three `@tailwind` directives. It SHALL declare the dark mode variant via `@custom-variant dark (&:where(.dark, .dark *))` to preserve the existing `class`-based dark mode strategy.

#### Scenario: globals.css uses @import directive
- **WHEN** `apps/web/src/app/globals.css` is read
- **THEN** it SHALL contain `@import "tailwindcss"` and SHALL NOT contain `@tailwind base`, `@tailwind components`, or `@tailwind utilities`

#### Scenario: Dark variant is declared in CSS
- **WHEN** `apps/web/src/app/globals.css` is read
- **THEN** it SHALL contain `@custom-variant dark (&:where(.dark, .dark *));`

---

### Requirement: Production build succeeds with Tailwind v4
Running `npx nx build web` SHALL complete without errors after the migration.

#### Scenario: Build completes successfully
- **WHEN** `npx nx build web` is executed after all config changes
- **THEN** the command SHALL exit with code 0 and produce a valid `.next/` output
