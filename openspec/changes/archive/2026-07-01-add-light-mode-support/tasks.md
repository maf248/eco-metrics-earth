## 1. Theme System Infrastructure

- [x] 1.1 Create `apps/web/src/components/ThemeProvider.tsx` — React context provider that reads initial theme from localStorage (fallback to `prefers-color-scheme`), toggles `dark` class on `<html>`, and persists to localStorage on change. Export `useTheme()` hook that throws if used outside provider.
- [x] 1.2 Wire `ThemeProvider` into `apps/web/src/app/layout.tsx` — wrap children, remove static `className="dark"` from `<html>`, update `<body>` to `bg-white dark:bg-black text-gray-900 dark:text-white`.
- [x] 1.3 Write tests for `ThemeProvider` in `apps/web/__tests__/components/ThemeProvider.test.tsx` — cover: dark default, light system preference, toggle, localStorage persistence, localStorage error resilience, hook throws outside provider.

## 2. Icon Components

- [x] 2.1 Create `apps/web/src/components/icons/LightBulbIcon.tsx` — lightbulb/lamp icon using `currentColor` (plus `dark:` variants for the lit/dimmed state), matching existing icon pattern. (Note: the originally-planned `SettingsIcon` gear was dropped — see task 3, there is no settings menu.)
- [x] 2.2 Verified: existing eco-category icon components retain their original hardcoded brand colors (greens, blues, reds). Only the new `LightBulbIcon` UI control uses `currentColor`. Original spec requirement was incorrect — eco icons are designed with specific colors per category and must remain multi-colored for both light and dark mode visibility.

## 3. Theme Toggle Component

**Divergence from original plan:** The original spec called for a `SettingsMenu` dropdown (gear trigger + panel + focus trap + `role="switch"`). This was over-engineered for a single setting, so it was replaced with a direct `ThemeToggle` button. The gear `SettingsIcon` was consequently never used and has been removed.

- [x] 3.1 Create `apps/web/src/components/ThemeToggle.tsx` — a single fixed top-right button (`fixed top-2 right-4 z-50 lg:top-4`) rendering `LightBulbIcon`. Calls `toggleTheme()` on click. Native `<button>` with descriptive `aria-label` ("Toggle light/dark mode"), keyboard operability via Enter/Space, and a visible `focus-visible:ring-2` ring. Lamp lit/dimmed appearance driven by CSS `dark:` variants.
- [x] 3.2 Add `ThemeToggle` to `apps/web/src/app/layout.tsx` so it renders on all pages.
- [x] 3.3 Theme behavior is covered by `apps/web/__tests__/components/ThemeProvider.test.tsx` (toggle, persistence, error resilience, hook-outside-provider). The `ThemeToggle` button itself is a thin wrapper over `useTheme().toggleTheme`.

## 4. Light Mode Styling — Components

- [x] 4.1 Update `Navbar.tsx` — convert `bg-white/10` → `bg-gray-100 dark:bg-white/10`, `border-gray-800` → `border-gray-200 dark:border-gray-800`, `hover:bg-white/5` → `hover:bg-gray-100 dark:hover:bg-white/5`, focus rings.
- [x] 4.2 Update `NavLink.tsx` — convert inactive to `text-gray-600 dark:text-gray-400`, hover to `hover:text-black dark:hover:text-white`, active to `bg-gray-200 dark:bg-white/15`, ring offset.
- [x] 4.3 Update `MobileHeader.tsx` — convert `bg-black/95` → `bg-white/95 dark:bg-black/95`, `border-gray-800` → `border-gray-200 dark:border-gray-800`, `ring-offset-black` → `ring-offset-white dark:ring-offset-black`.
- [x] 4.4 Update `NavScrollContainer.tsx` — convert gradient overlays from `from-black` to `from-white dark:from-black`.
- [x] 4.5 Update `BrandText.tsx` — verify emerald accent works on both backgrounds (no change expected, emerald-400 is theme-agnostic).

## 5. Light Mode Styling — Pages

- [x] 5.1 Update `apps/web/src/app/page.tsx` — convert `text-white` → `text-gray-900 dark:text-white`, `text-gray-400` → `text-gray-600 dark:text-gray-400`, `bg-white/10` → `bg-gray-100 dark:bg-white/10`.
- [x] 5.2 Update `apps/web/src/app/[category]/page.tsx` — same conversions as home page.
- [x] 5.3 Update `apps/web/src/app/not-found.tsx` — same conversions as home page.

## 6. Verification & Documentation

- [x] 6.1 Run `npx nx test web` — fix any failing tests, update snapshots with `npx nx test web -- --updateSnapshot` after verifying intentional changes.
- [x] 6.2 Run `npm run build` — verify zero build errors across all projects.
- [x] 6.3 Run `npm run lint` — verify zero lint errors.
- [x] 6.4 Search for remaining hardcoded dark-only classes in components and pages using grep — verify zero matches.
- [x] 6.5 Update `README.md` — add note in Tech Stack or Features section that the web app supports light and dark mode with a toggle.
- [x] 6.6 Manual visual QA — verified light and dark mode render correctly on all pages (home, category, 404) and the theme toggle works end-to-end.
