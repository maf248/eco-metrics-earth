## Why

The application is currently hardcoded to dark mode only — every component uses fixed color classes (`bg-black`, `text-white`, `bg-white/10`) with no mechanism to support light mode. This limits accessibility for users who prefer or require light interfaces, and ignores `prefers-color-scheme` system preferences. Adding light mode support is a foundational UX improvement that should be implemented early before more pages and components are built on top of dark-only assumptions.

## What Changes

- **Add a theme system** with `ThemeProvider` context, `localStorage` persistence, and `prefers-color-scheme` detection for default theme.
- **Add a Settings menu button** positioned in the top-right corner containing a light/dark mode toggle with a lamp icon. The menu is designed to be extensible for future settings additions.
- **Adapt all existing components and pages** to use Tailwind `dark:` variants so every part of the UI renders correctly in both light and dark modes.
- **Update tests** to cover both theme modes and the new Settings menu component.
- **Update documentation** (README) to reflect theme support.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- **theme-system**: Core theme infrastructure — React context provider, theme state management, `localStorage` persistence, `prefers-color-scheme` detection, and the `dark` class toggling on `<html>`. Exposes `useTheme()` hook returning the current theme and a toggle function.
- **settings-menu**: A reusable Settings button/menu component positioned fixed top-right. Contains the theme toggle (lamp icon) and supports future settings additions via a dropdown panel. Uses a gear/cog icon as the trigger. Closes on outside click and Escape key.
- **light-mode-styling**: Visual adaptation of all existing components (`Navbar`, `NavLink`, `MobileHeader`, `NavScrollContainer`, `BrandText`), pages (`/`, `/[category]`, `not-found`), and layout to use themed color classes that respond to both light and dark modes correctly.

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
_None — this is the first spec-driven change to the web app._

## Impact

- **Affected code**: All components in `apps/web/src/components/`, all pages in `apps/web/src/app/`, `layout.tsx`, `globals.css`.
- **New dependencies**: None — uses React built-ins (`useState`, `useContext`, `useEffect`) and `localStorage` / `matchMedia` APIs natively available in the browser.
- **Package dependencies changed**: None.
- **API changes**: None — backend (`apps/api`) and shared package (`@eco-metrics/shared`) are not affected.
- **Breaking changes**: None — the default behavior (dark mode) remains when no preference is detected or stored.
- **Tests affected**: Layout snapshot test, component tests that assert dark-specific classes.

## Non-Goals

- Animating the theme transition (flash-free toggle is sufficient).
- Adding multiple theme variants beyond light/dark (e.g., no high-contrast, sepia, or custom color themes).
- Changing the emerald accent color or brand identity.
- Server-side theme detection (acceptable to have a brief client-side flash before the correct theme applies — `next-themes` or similar packages add complexity not justified yet).
