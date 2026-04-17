## 1. Utility — slugToTitle

- [x] 1.1 Create `apps/web/src/lib/slugToTitle.ts` exporting a `slugToTitle(slug: string): string` pure function (split on `-`, capitalize first letter of each word)
- [x] 1.2 Create `apps/web/__tests__/lib/slugToTitle.test.ts` covering all six ECO_CATEGORIES slugs, single-word, multi-word, and numeric-segment cases
- [x] 1.3 Run `npx nx test web` — all tests must pass with zero warnings

## 2. Nav Items Config

- [x] 2.1 Create `apps/web/src/lib/navItems.tsx` exporting `NAV_ITEMS: NavItem[]` built from `Object.values(ECO_CATEGORIES)`, each with `slug`, `label` (via `slugToTitle`), `href`, and an inline SVG icon per category
- [x] 2.2 Verify the array has exactly 6 items and each has a unique `slug`

## 3. NavLink Client Component

- [x] 3.1 Create `apps/web/src/components/NavLink.tsx` as a `'use client'` component accepting `{ href, icon, label }`:
  - Uses `usePathname` from `next/navigation` to detect active route
  - Adds `aria-current="page"` on the active link
  - Responsive layout: `flex-col` (mobile bottom-nav style) → `flex-row` (desktop sidebar style) via Tailwind `lg:` prefix
  - Active color: `text-emerald-400`; inactive: `text-gray-400 hover:text-gray-100`
- [x] 3.2 Create `apps/web/__tests__/components/NavLink.test.tsx` verifying: label renders, href is correct, `aria-current="page"` on active link, no `aria-current` on inactive links, icon renders
- [x] 3.3 Run `npx nx test web` — all tests must pass with zero warnings

## 4. Navbar Server Component (Responsive — SEO + Accessible)

- [x] 4.1 Create `apps/web/src/components/Navbar.tsx` as a Server Component:
  - Single `<nav aria-label="Main navigation">` element (one landmark for screen readers)
  - Mobile/tablet default: `fixed bottom-0 left-0 right-0 h-16 flex flex-row` (bottom nav)
  - Desktop (lg+): `lg:top-0 lg:right-auto lg:h-screen lg:w-64 lg:flex-col` (left sidebar)
  - Brand heading visible in sidebar desktop only (`hidden lg:block`)
  - Iterates `NAV_ITEMS` and renders `<NavLink>` for each
- [x] 4.2 Create `apps/web/__tests__/components/Navbar.test.tsx` verifying:
  - Renders `<nav>` with `aria-label="Main navigation"`
  - Renders 6 links (one per ECO_CATEGORY)
  - Each link `href` matches `/${slug}`
  - Each link text matches `slugToTitle(slug)`
  - Active link has `aria-current="page"`, inactive links do not
- [x] 4.3 Run `npx nx test web` — all tests must pass with zero warnings

## 5. Dynamic Category Page

- [x] 5.1 Create `apps/web/src/app/[category]/page.tsx` — async Server Component:
  - Accepts `params: Promise<{ category: string }>`, awaits it
  - Renders `<h1>` with `slugToTitle(category)` as the visible page title
  - Includes a `<title>` via `generateMetadata` export for SEO
- [x] 5.2 Create `apps/web/__tests__/app/[category]/page.test.tsx` verifying the `<h1>` text for at least three different slugs and `generateMetadata` output
- [x] 5.3 Run `npx nx test web` — all tests must pass with zero warnings

## 6. Wire Up Layout

- [x] 6.1 Update `apps/web/src/app/layout.tsx`: import `<Navbar />`, add `pb-16 lg:pb-0 lg:pl-64` to the content wrapper
- [x] 6.2 Update `apps/web/__tests__/app/layout.test.tsx`: mock `next/navigation` so the test still passes with `<Navbar />` in the tree
- [x] 6.3 Run `npx nx build web` — build must succeed with zero errors
- [x] 6.4 Run `npx nx test web` — full suite must pass with zero warnings
- [x] 6.5 Run `npm run lint` — zero lint errors
