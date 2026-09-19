# Desktop Sidebar Fit

## Goals

- Fix the desktop (`lg+`) sidebar brand so `~ eco-metrics.earth` renders on a single line instead of wrapping at the hyphen into two lines.
- Fix the desktop sidebar so all 12 `NAV_ITEMS` (through the last one, Water Footprint) are reachable — either directly visible or via a working vertical scroll — instead of overflowing the fixed `h-screen` nav off-screen with no way to scroll to them.
- Add a vertical scroll affordance (top/bottom fade gradient) on the desktop sidebar, mirroring the existing horizontal mobile affordance, so users have a visual cue when the nav list has more items above or below the visible area.

## Non-Goals

- No changes to the mobile bottom bar's layout, behavior, or horizontal scroll affordance logic (beyond extending the shared scroll-tracking `useEffect` in `NavScrollContainer` to also compute vertical state — the horizontal behavior and its existing tests/scenarios are unchanged).
- No changes to `MobileHeader.tsx` itself. `BrandText.tsx` is shared between `MobileHeader` and the desktop sidebar brand, so its change must not regress the mobile rendering — verified, not redesigned.
- No redesign of nav icons, colors, active-state styling, or item order.
- No changes to `NAV_ITEMS` content, count, or the `navlink-active-state` / `nav-items` behavior (icon typing, trailing-slash normalisation).
- No design-token system overhaul — `docs/design-system.md` still marks the broader token system as pending; this change only records the new sidebar-width and scroll-affordance facts it establishes, per "Presentation docs for UI-bearing changes" in `AGENTS.md`.
- No sidebar collapse/expand, resize, or reflow feature — the sidebar remains a fixed-width column.
- No new npm dependencies — the vertical affordance reuses the existing scroll/resize listener mechanism already present in `NavScrollContainer`.
- No changes to `NavLink`'s active-state colors, focus ring, or icon box sizing (`w-8 h-8`) — only its vertical padding (`lg:py-3` → `lg:py-2`) changes, to help fit all 12 rows without relying on scroll on typical desktop heights.

## Impact

- `apps/web/src/components/Navbar.tsx` — desktop sidebar width `lg:w-68` → `lg:w-76`.
- `apps/web/src/components/BrandText.tsx` — the typewriter text span gains `whitespace-nowrap` so it cannot line-break at the hyphen in `eco-metrics.earth`, in either the desktop sidebar or `MobileHeader` context.
- `apps/web/src/components/NavScrollContainer.tsx` — wrapper `lg:flex-none lg:overflow-visible` → `lg:flex-1 lg:min-h-0` so it clips to the remaining sidebar height instead of growing past it; `<ul>` gains `lg:min-h-0` so `lg:overflow-y-auto` can actually scroll; the existing scroll/resize tracking is extended to also compute vertical (`scrollTop`/`scrollHeight`/`clientHeight`) state and render top/bottom gradient affordances on desktop.
- `apps/web/src/components/NavLink.tsx` — desktop row padding `lg:py-3` → `lg:py-2`.
- `apps/web/src/app/layout.tsx` — content offset `lg:pl-68` → `lg:pl-76`, and the stale `(w-72)` comment corrected to match the actual sidebar width.
- `docs/design-system.md` — records the new sidebar-width and vertical-scroll-affordance decisions (new "Layout" section), per the project rule that a change establishing a presentation decision updates this doc in the same change.
- Tests: `apps/web/__tests__/components/{Navbar,BrandText,NavScrollContainer,NavLink}.test.tsx` and their snapshots, `apps/web/__tests__/app/layout.test.tsx`, and `apps/web/e2e/navigation.spec.ts`.
