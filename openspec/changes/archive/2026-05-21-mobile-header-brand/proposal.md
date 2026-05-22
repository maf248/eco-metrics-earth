## Why

On mobile, the bottom nav bar only shows category links — there is no way to navigate back to the home page. Desktop is unaffected because the sidebar already has the brand logo linked to `/`. A mobile-only sticky header with the site logo and a distinctive terminal-style animated brand name fixes this gap while reinforcing site identity on every page.

## What Changes

- New `MobileHeader` component: a `<header>` fixed to the top of the viewport, visible only below the `lg` breakpoint, containing:
  - The site logo SVG (same as `SiteLogoIcon` used in `HomePage`)
  - The brand text `~ eco-metrics.earth` rendered in a terminal/CLI aesthetic
  - A realistic blinking cursor animation following the brand text
  - The entire header is a single `<a href="/">` landmark linking to home
- `layout.tsx`: render `MobileHeader` above `Navbar`; update content top offset from current `pt-20` in pages to accommodate the new header height
- `[category]/page.tsx` and `page.tsx`: adjust top padding so content clears both the fixed header and the brand text area

## Capabilities

### New Capabilities

- `mobile-header-brand`: A mobile-only sticky `<header>` with semantic landmark, accessible link to home, SEO-friendly brand text, and a CSS-driven blinking cursor animation styled to match the existing dark nav palette.

### Modified Capabilities

- `nav-items`: The mobile layout now has two fixed UI zones — a top header and a bottom nav bar. Content offset rules change: `pb-20` stays (bottom nav), top content must now also clear the new header height.

## Impact

- New file: `apps/web/src/components/MobileHeader.tsx`
- Modified: `apps/web/src/app/layout.tsx` (add `MobileHeader`, update comment on offset)
- Modified: `apps/web/src/app/page.tsx` (adjust top padding)
- Modified: `apps/web/src/app/[category]/page.tsx` (adjust top padding)
- New test file: `apps/web/__tests__/components/MobileHeader.test.tsx`
- Updated snapshots: `Navbar.test.tsx.snap`, `layout.test.tsx` assertions, `page.test.tsx.snap`, `[category]/page.test.tsx.snap`
- No new dependencies — animation is pure CSS (`@keyframes` via Tailwind arbitrary or globals.css)
- No API changes, no shared package changes

## Non-Goals

- No desktop header — the sidebar brand already covers this
- No hamburger menu or drawer — out of scope
- No dark/light mode toggle in the header
- No search bar or user avatar
- The cursor animation is CSS-only — no JS timer, no accessibility issues from JS-driven flicker
- No changes to the bottom nav bar itself
