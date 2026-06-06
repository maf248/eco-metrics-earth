## Why

After a hard reload (no cache), the first client-side navigation to a category page feels noticeably slower (~1 second) than subsequent navigations. Performance profiling confirms dropped frames during route transitions, and the app lacks any loading-state feedback — the UI appears frozen until the new route renders. This degrades perceived performance, especially on slower devices.

## What Changes

- **Add `loading.tsx`** skeleton for the `[category]` route segment — provides instant visual feedback during route transitions instead of a frozen UI
- **Memoize `NavLink` with `React.memo`** — avoids re-rendering all 13 navigation links on every route change when `usePathname()` fires
- **Wrap navigation in `startTransition`** — marks route-change state updates as low-priority, keeping the UI responsive during the transition and preventing the compositor from dropping frames

## Non-Goals

- No data prefetching changes (Next.js default `<Link>` prefetch covers the desktop sidebar case)
- No Suspense boundaries for data fetching (deferred until real data fetching is implemented — see ROADMAP.md I09)
- No dynamic imports / code splitting (premature optimization at current bundle sizes — see ROADMAP.md Recordatorios)

## Capabilities

### New Capabilities

- `route-loading-states`: Category pages get a `loading.tsx` skeleton that renders during client-side navigation transitions, providing immediate visual feedback
- `navlink-memoization`: `NavLink` component wrapped in `React.memo` with a custom comparison function that only re-renders when its `isActive` state actually changes
- `navigation-transition`: The page content area is wrapped with `useTransition` / `startTransition` so route changes are marked as non-urgent updates

### Modified Capabilities

<!-- None — all existing spec-level behaviors remain unchanged -->

## Impact

- **New file:** `apps/web/src/app/[category]/loading.tsx`
- **Modified:** `apps/web/src/components/NavLink.tsx` — add `React.memo` wrapper
- **Modified:** `apps/web/src/app/layout.tsx` — wrap children content area with transition-aware rendering
- **Tests:** New unit test for `loading.tsx`, update `NavLink` tests for memo behavior, verify layout renders without regressions
