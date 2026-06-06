## 1. Extract path normalisation utility

- [x] 1.1 Create `apps/web/src/lib/path.ts` with `normalise` function (trailing-slash removal + root-path guard `|| '/'`)
- [x] 1.2 Write `apps/web/__tests__/lib/path.test.ts` with tests: strips trailing slash, preserves root `/`, handles paths without slashes, handles multiple trailing slashes

## 2. Memoize NavLink

- [x] 2.1 Update `NavLinkProps` to include `isActive: boolean` field
- [x] 2.2 Replace internal `usePathname()` call with `isActive` prop usage
- [x] 2.3 Import `normalise` from `@/lib/path` instead of local definition (remove local `normalise`)
- [x] 2.4 Wrap default export with `React.memo(NavLink)`
- [x] 2.5 Update `NavLink.test.tsx`: pass `isActive` prop explicitly, remove `usePathname` mock dependency
- [x] 2.6 Update `NavLink.test.tsx.snap` snapshot to match new component output

## 3. Lift isActive computation to Navbar

- [x] 3.1 Add `usePathname` import in `Navbar.tsx`
- [x] 3.2 Import `normalise` from `@/lib/path`
- [x] 3.3 Compute `isActive` for each `NAV_ITEMS` entry and pass to `<NavLink isActive={...}>`
- [x] 3.4 Update `Navbar.test.tsx`: verify isActive prop is passed correctly to NavLink children
- [x] 3.5 Update `Navbar.test.tsx.snap` snapshot

## 4. Create loading skeleton for category routes

- [x] 4.1 Create `apps/web/src/app/[category]/loading.tsx` with pulsing skeleton
- [x] 4.2 Skeleton mirrors page structure: centered column, placeholder icon square, placeholder heading + subtitle bars
- [x] 4.3 Skeleton includes `id="main-content"` and `tabIndex={-1}` for skip-to-content compatibility
- [x] 4.4 Write `apps/web/__tests__/app/[category]/loading.test.tsx` with render and structure tests

## 5. Create ContentTransition wrapper

- [x] 5.1 Create `apps/web/src/components/ContentTransition.tsx` with `'use client'` directive
- [x] 5.2 Uses `usePathname` + `useTransition` to detect navigation and apply opacity transition
- [x] 5.3 Write `apps/web/__tests__/components/ContentTransition.test.tsx`

## 6. Integrate into layout

- [x] 6.1 Import `ContentTransition` in `layout.tsx`
- [x] 6.2 Wrap `{children}` with `<ContentTransition>` inside the existing offset `<div>`
- [x] 6.3 Update `layout.test.tsx` to verify ContentTransition renders and children pass through

## 7. Verification

- [x] 7.1 Run `npm run lint` — zero errors
- [x] 7.2 Run `npm run build` — compiles successfully  
- [x] 7.3 Run `npm run test` — all tests pass, zero warnings/errors
- [x] 7.4 Run `npx prettier --check "apps/web/src/**/*.{ts,tsx}"` — formatting clean
