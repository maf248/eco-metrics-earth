## 1. CSS Animation

- [x] 1.1 Add `@keyframes cursor-blink` to `apps/web/src/app/globals.css` using `step-end` timing: at 0%/100% opacity 1, at 50% opacity 0. Wrap animation usage in `@media (prefers-reduced-motion: no-preference)`.

## 2. MobileHeader Component

- [x] 2.1 Create `apps/web/src/components/MobileHeader.tsx` as a Server Component (no `'use client'`).
- [x] 2.2 Render a `<header>` with `aria-label="Site header"` and `lg:hidden` plus fixed positioning classes (`fixed top-0 left-0 right-0 z-50 h-14`), dark background (`bg-black/95 backdrop-blur-sm`), and bottom border (`border-b border-gray-800`).
- [x] 2.3 Inside the header, render a `<Link href="/">` spanning the full header height with `aria-label="eco-metrics earth — go to home"`, flex layout, horizontal padding, and hover state matching the nav palette.
- [x] 2.4 Inside the link, render `<SiteLogoIcon aria-hidden className="w-7 h-7 flex-shrink-0" />`.
- [x] 2.5 Inside the link, render `<span aria-hidden="true">` containing the brand text `~ eco-metrics.earth` in `font-mono text-sm font-medium text-emerald-400`.
- [x] 2.6 Immediately after the brand text span, render `<span aria-hidden="true" className="...cursor-blink...">▋</span>` with the blinking cursor animation class and `text-emerald-400`.

## 3. Layout Integration

- [x] 3.1 In `apps/web/src/app/layout.tsx`, import `MobileHeader` and render it before `<Navbar />` inside `<body>`.
- [x] 3.2 Update the comment in `layout.tsx` to note the three offset zones: top header (mobile), bottom nav (mobile), left sidebar (desktop).

## 4. Page Padding Adjustment

- [x] 4.1 In `apps/web/src/app/page.tsx`, update `<main>` className from `pt-20` to `pt-14` (header now provides the top clearance).
- [x] 4.2 In `apps/web/src/app/[category]/page.tsx`, update `<main>` className from `pt-20` to `pt-14`.

## 5. Tests

- [x] 5.1 Create `apps/web/__tests__/components/MobileHeader.test.tsx` with describe blocks covering: landmark semantics (`<header>` with correct `aria-label`), home link (`href="/"`, `aria-label`), logo presence and `aria-hidden`, brand text presence and `aria-hidden`, cursor character presence and `aria-hidden`, and a snapshot.
- [x] 5.2 Update `apps/web/__tests__/app/layout.test.tsx`: add assertion that the rendered HTML contains the `MobileHeader` (`aria-label="Site header"`).
- [x] 5.3 Update `apps/web/__tests__/app/page.test.tsx`: update `pt-20` assertion → `pt-14`; update snapshot.
- [x] 5.4 Update `apps/web/__tests__/app/[category]/page.test.tsx`: update `pt-20` assertion → `pt-14`; update snapshots.
- [x] 5.5 Run `npx nx test web -- --updateSnapshot` and verify 0 failures, 0 warnings.

## 6. Typewriter Animation + [↵] Affordance

- [x] 6.1 Add `'use client'` directive to `MobileHeader.tsx`.
- [x] 6.2 Add `useState<string>` for `displayedText` (initial: `''`) and `useState<boolean>` for `isTypingDone` (initial: `false`).
- [x] 6.3 Add `useEffect` that checks `prefers-reduced-motion`: if reduce, set `displayedText` to full string and `isTypingDone` to true immediately. Otherwise start an interval at 60ms that appends one character at a time; clear interval and set `isTypingDone` when complete. Return cleanup function.
- [x] 6.4 Replace the static brand text span content with `{displayedText}`.
- [x] 6.5 Add `<span aria-hidden="true">` for `[↵]` after the brand text span, with classes `font-mono text-sm font-medium text-emerald-400/60 transition-opacity duration-500` and conditional `opacity-0` / `opacity-100` based on `isTypingDone`.
- [x] 6.6 Update `MobileHeader.test.tsx`: mock `window.matchMedia` for reduced-motion tests; add test that with reduced-motion the full text is shown immediately; add test that `[↵]` is present in DOM; add test that `[↵]` span is `aria-hidden`; update snapshot.
- [x] 6.7 Run `npx nx test web -- --updateSnapshot` and verify 0 failures, 0 warnings.
