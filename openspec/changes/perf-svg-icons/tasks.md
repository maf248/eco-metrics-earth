## 1. Create Icon Component Library

- [x] 1.1 Create `apps/web/src/components/icons/` directory
- [x] 1.2 Convert each of the 13 SVG files in `apps/web/public/icons/` to a React component accepting `React.SVGProps<SVGSVGElement>` — one file per icon, PascalCase naming (e.g. `AirQualityIcon.tsx`, `SiteLogoIcon.tsx`, `NotFoundIcon.tsx`, etc.)
- [x] 1.3 Ensure all SVG attribute names are camelCased (e.g. `strokeLinecap`, `fillRule`) and remove any hardcoded colour values that prevent `currentColor` inheritance
- [x] 1.4 Create `apps/web/src/components/icons/index.ts` as a barrel export of all 13 icon components

## 2. Update categoryIcon.ts

- [x] 2.1 Rewrite `apps/web/src/lib/categoryIcon.ts` to export a map (or equivalent helper) keyed by `EcoCategory` slug plus `SITE_LOGO` and `NOT_FOUND`, with values of type `React.ComponentType<React.SVGProps<SVGSVGElement>>`, pointing to the new icon components
- [x] 2.2 Remove any SVG path string exports from `categoryIcon.ts`

## 3. Update navItems and NavLink

- [x] 3.1 Update the `NavItem` interface in `apps/web/src/lib/navItems.tsx` — change `icon` field type from `string` to `React.ComponentType<React.SVGProps<SVGSVGElement>>`
- [x] 3.2 Update each nav item entry in `navItems.tsx` to reference the corresponding icon component from `@/components/icons`
- [x] 3.3 Update `apps/web/src/components/NavLink.tsx` — render the icon as `<Icon className="..." aria-hidden />` instead of `<Image src={icon} ... />`; remove `next/image` import if no longer used

## 4. Update Remaining Consumers

- [x] 4.1 Update `apps/web/src/components/Navbar.tsx` to render the site logo as `<SiteLogoIcon ... />` instead of `<Image src={...} />`
- [x] 4.2 Update `apps/web/src/app/page.tsx` to render the site logo icon component where currently an `<Image>` is used for the logo
- [x] 4.3 Update `apps/web/src/app/[category]/page.tsx` to render the category icon component instead of `<Image src={...} />`
- [x] 4.4 Update `apps/web/src/app/not-found.tsx` to render the `NotFoundIcon` component instead of `<Image src={...} />` if applicable

## 5. Update Tests and Snapshots

- [x] 5.1 Write `apps/web/__tests__/components/icons/index.test.tsx` — assert all 13 named exports are functions (React components) and that each renders an `<svg>` element
- [x] 5.2 Update `apps/web/__tests__/components/NavLink.test.tsx` — assert icon renders as `<svg>`, not `<img>`
- [x] 5.3 Update any other affected test files (Navbar, page, category page, not-found) to reflect inline SVG output
- [x] 5.4 Update all affected Jest snapshot files to reflect the new SVG output

## 6. Verification

- [x] 6.1 Run `npx nx test web` — all tests pass with zero errors or warnings
- [x] 6.2 Run `npx nx build web` — build succeeds with no TypeScript errors
- [x] 6.3 Run `npm run lint` — no lint errors
