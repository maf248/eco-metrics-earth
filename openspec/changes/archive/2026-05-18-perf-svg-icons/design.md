## Context

Navigation icons are currently loaded as static SVG files from `/public/icons/` using Next.js `<Image>`. On a page with the full navbar (13 items), this causes up to 13 separate HTTP requests at page load — one per icon. `<img>`-rendered SVGs cannot inherit CSS `currentColor`, so Tailwind colour utilities on the parent element do not apply to the icon fill/stroke.

Inlining SVGs as React components eliminates the HTTP requests, enables `currentColor` theming, preserves full TypeScript type safety, and keeps the SVG source colocated with the component code that uses it.

The 13 SVG source files already exist at `apps/web/public/icons/`. They will be manually converted to React components — no new build-time tooling (e.g. `@svgr/webpack`) is introduced, keeping the change self-contained and reversible.

## Goals / Non-Goals

**Goals:**
- Create typed React SVG components for all 13 icons in `apps/web/src/components/icons/`.
- Update `categoryIcon.ts` to export component references keyed by category slug and special keys (`SITE_LOGO`, `NOT_FOUND`).
- Update `NavLink`, `Navbar`, all pages, and `not-found.tsx` to render icon components directly.
- Keep `/public/icons/` SVG files intact for non-React consumers (manifest icon, OG images).
- Update all affected tests and snapshots.

**Non-Goals:**
- SVG sprite sheet approach — React component inlining is preferred for type safety.
- Removing `/public/icons/` files.
- Minifying or optimising SVG source at this step.
- Adding new icons.
- Changes to the API app or shared package.

## Decisions

### D1 — Manual SVG-to-React conversion rather than `@svgr/webpack`
**Decision**: Hand-write 13 React SVG components rather than adding `@svgr/webpack` or `@svgr/cli`.  
**Rationale**: Adding a webpack plugin introduces a build-time dependency and requires `next.config.ts` changes. For 13 static icons that won't change frequently, manual conversion is faster, produces readable output, and has no new runtime or build dependencies. `@svgr` can be added later if the icon set grows significantly.  
**Alternative considered**: `@svgr/webpack` with `next.config.ts` — rejected due to build complexity and extra dependency for a small, bounded icon set.

### D2 — Components accept `React.SVGProps<SVGSVGElement>`
**Decision**: Each icon component signature is `(props: React.SVGProps<SVGSVGElement>) => JSX.Element`.  
**Rationale**: This is the idiomatic pattern — it passes all standard SVG attributes (including `className`, `width`, `height`, `aria-hidden`, `role`) through via spread, so callers can adjust size and accessibility without a custom prop API.  
**Alternative considered**: Custom `{ size, className }` prop interface — rejected because it hides standard SVG attributes and requires maintaining a bespoke interface.

### D3 — `categoryIcon.ts` exports `React.ComponentType<React.SVGProps<SVGSVGElement>>`
**Decision**: Change the `categoryIcon` map value type from `string` (path) to a React component type.  
**Rationale**: Consumers currently read the path and pass it to `<Image src={...} />`. After this change they render the component directly: `<Icon className="..." aria-hidden />`. The contract change is intentional and all callers are updated in this same change.  
**Alternative considered**: Keep `categoryIcon.ts` returning strings and build a second map for components — rejected because it duplicates mapping logic and leaves dead code.

### D4 — Barrel export at `apps/web/src/components/icons/index.ts`
**Decision**: Export all 13 icon components from a single index file.  
**Rationale**: Consumers that need a specific icon can import by name (`import { AirQualityIcon } from '@/components/icons'`); `categoryIcon.ts` can reference them directly without 13 separate import paths.

## Risks / Trade-offs

- **[Risk] SVG attributes use React-camelCase (`strokeLinecap`) while raw SVG uses kebab-case (`stroke-linecap`)** → Manual conversion must ensure all SVG attribute names are camelCased. Mitigation: review each converted component before committing; JSX will throw a compile error for any kebab-case attribute.
- **[Risk] `<Image>` optimisation (lazy loading, format conversion) is lost for icons** → Nav icons are small SVGs (< 2 KB each) and are already above the fold. The HTTP-request cost far exceeds the optimisation benefit. Accepted trade-off.
- **[Trade-off] Inline SVG increases JS bundle size slightly** → 13 small SVGs add roughly 2–5 KB gzipped to the JS bundle. This is negligible compared to the ~13 HTTP requests saved per page load.
