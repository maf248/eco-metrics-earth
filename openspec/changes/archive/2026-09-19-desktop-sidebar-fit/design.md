# Design: Desktop Sidebar Fit

## Technical Approach

Three independent, small CSS/markup fixes to the existing desktop sidebar in `Navbar.tsx` and its children. No new components, no new dependencies, no data/state architecture changes.

### 1. Brand wraps to two lines

Root cause: the sidebar is `lg:w-68` (272px); the brand row (`px-5` padding + `w-7` icon + `gap-2.5` + text) needs roughly 290px, and the brand text span in `BrandText.tsx` has no `white-space` override, so the browser wraps it at the hyphen in `eco-metrics.earth`.

Fix:
- `BrandText.tsx`: add `whitespace-nowrap` to the typewriter text `<span>` (the one holding `displayedText`). This is the actual fix for the wrap — it is a one-line, shared-component change, so it also applies to `MobileHeader`, where it is a no-op change in practice (the header already has room) but keeps both call sites consistent instead of forking the component or duplicating the class only in the desktop context.
- `Navbar.tsx`: widen the desktop sidebar `lg:w-68` → `lg:w-76` (304px) so the now-non-wrapping content has room, per the direction agreed with the user.
- `layout.tsx`: update the content offset `lg:pl-68` → `lg:pl-76` in the same commit/PR as the width change (they must move in lockstep), and correct the adjacent comment, which already incorrectly says `w-72` today.

### 2. Last nav item unreachable

Root cause: `NavScrollContainer`'s outer wrapper is `lg:flex-none lg:overflow-visible`. `flex-none` means the wrapper does not participate in flex shrinking within the `h-screen` sidebar column — it grows to its content's natural height. Combined with `overflow-visible`, the wrapper (and the `<ul>` inside it, which does carry `lg:overflow-y-auto`) never actually clips, so once 12 items' natural height exceeds the remaining `h-screen` space below the brand, the tail of the list is rendered past the bottom of the fixed-position nav — outside the fixed element's own box, with no scrollbar anywhere to reach it (the page's own scroll does nothing, because the nav is `fixed`).

Fix:
- `NavScrollContainer.tsx` wrapper: `lg:flex-none lg:overflow-visible` → `lg:flex-1 lg:min-h-0`. `flex-1` lets the wrapper take exactly the remaining sidebar height (sidebar is `flex-col`, brand is a fixed-height flex item, wrapper is the second flex item). `min-h-0` is required because flex items default to `min-height: auto`, which — like the current bug — lets them grow past their flex-basis to fit content; `min-h-0` removes that floor so the wrapper is truly bounded by the remaining space.
- `<ul>` gains `lg:min-h-0` for the same reason (it is a `flex-1` flex child of the `lg:flex-col` wrapper, so the same `min-height: auto` trap applies to it independently). With both bounded, the `<ul>`'s existing `lg:overflow-y-auto` can finally do its job.
- `NavLink.tsx`: `lg:py-3` → `lg:py-2` on desktop rows, so that on typical desktop heights (~700px+) all 12 items fit without needing to scroll at all; scroll remains the fallback for short viewports/high browser zoom, which is exactly what item 1's "Last nav item is reachable via scroll" scenario in `specs/desktop-sidebar-layout/spec.md` covers, and item 2's "fit without scrolling" scenario covers the common case.

### 3. Vertical scroll affordance

The mobile bottom bar already has this exact pattern for the horizontal axis: a `useEffect` in `NavScrollContainer` attaches a `scroll` listener and a `ResizeObserver` to the `<ul>`, and an `update()` callback derives `canScrollLeft`/`canScrollRight` from `scrollLeft`/`scrollWidth`/`clientWidth`, rendering absolutely-positioned decorative gradient `<div>`s.

Fix: extend the same `update()` callback (not a second effect, not a second listener) to also derive `canScrollUp`/`canScrollDown` from `scrollTop`/`scrollHeight`/`clientHeight`, and render two more decorative `<div>`s (`hidden lg:block`, the inverse visibility of the existing `lg:hidden` horizontal ones), using the same `from-nav-surface dark:from-nav-surface-dark` gradient tokens, oriented vertically (`bg-gradient-to-b` for the top one, `bg-gradient-to-t` for the bottom one) instead of horizontally.

## Alternatives Considered

- **Shrink the brand font size or hide `[↵]`/cursor to save horizontal space** — rejected. `BrandText`'s animation and layout are an approved, already-specified contract (`mobile-header-brand` capability); trimming it to solve a spacing problem would touch behavior this change has no reason to touch, and would desync the desktop and mobile brand's visual identity.
- **Truncate the brand text with `text-overflow: ellipsis` instead of widening the sidebar** — rejected. The brand is meant to be read in full as a terminal-style animation; truncating it defeats the purpose and looks broken mid-typewriter.
- **Put `overflow-y-auto` on the `<nav>` element itself instead of the inner `<ul>`** — rejected. That would scroll the brand link out of view along with the nav items, which contradicts the "brand stays pinned at the top" requirement and duplicates a mechanism that already exists correctly at the `<ul>` level (it just isn't bounded today).
- **Reduce row padding further (e.g. `lg:py-1`) to guarantee no-scroll on even shorter viewports** — rejected as over-compacting; `lg:py-2` was chosen by the user as the target density, and scrolling remains an explicit, working fallback for short viewports rather than something to design around by shrinking rows indefinitely.
- **Use `IntersectionObserver` sentinel elements for the vertical affordance instead of extending the existing scroll/resize `update()`** — rejected. It would introduce a second, parallel detection mechanism in the same component for what is conceptually the same feature (scroll affordance) on a different axis, adding complexity and a new API surface for no behavioral benefit; extending the existing callback keeps one code path and reuses the `ResizeObserver` already observing the same element.
- **New design-token names for the vertical gradient** — rejected; reusing `--color-nav-surface`/`-dark` (already the source of truth for the nav's own background, per `docs/design-system.md`) keeps the affordance visually consistent with the existing horizontal one and avoids inventing tokens the design-system doc doesn't yet formalize.

## Risk Assessment

- **Missed `pl-68`/`w-68` occurrence elsewhere in the codebase.** Mitigation: task includes a repo-wide grep for `w-68` and `pl-68` before considering the width change complete, not just the two known call sites.
- **`whitespace-nowrap` on the shared `BrandText` span regressing `MobileHeader`.** The mobile header's link spans the full viewport width, so there is no width constraint the nowrap could overflow against; verified by reading `MobileHeader.tsx` during spec drafting. Mitigation: keep the existing `mobile-header-brand` unit tests green and update its snapshot only if the rendered class list changes, diffing it before committing (per `AGENTS.md` snapshot rules).
- **`lg:py-2` reducing the desktop row's click target size.** Desktop is mouse/trackpad-driven, not subject to the 44px touch-target guideline; the icon box (`w-8 h-8`, i.e. 32px) plus `py-2` (8px top + 8px bottom) still yields a ~48px row height, comfortably above typical desktop click-target expectations. No accessibility requirement is affected.
- **Regressing the existing horizontal affordance behavior while extending `update()`.** Mitigation: the change is additive within the same function (new `setCanScrollUp`/`setCanScrollDown` calls alongside the existing two `setState` calls) — the horizontal calculations and their existing test assertions are not touched. The full existing `NavScrollContainer.test.tsx` suite must stay green unmodified in its horizontal-only assertions.
- **jsdom has no real layout engine** — `scrollHeight`/`clientHeight` are always `0` in jsdom unless explicitly mocked. Unit tests must mock them via `Object.defineProperty`, exactly like the existing horizontal tests mock `scrollWidth`/`clientWidth`; they cannot validate real-browser box-model overflow (e.g., whether 12 real rows at `lg:py-2` actually fit in 700px). This is why an E2E check is warranted (see below).
- **Snapshot drift.** `Navbar`, `NavScrollContainer`, `NavLink`, `BrandText`, and possibly `MobileHeader` snapshots will change (new class names, new affordance markup). Per `AGENTS.md`, these must be regenerated and visually diffed, not blindly accepted, to confirm no unintended structural change slipped in.

## E2E Check — Decision

**Warranted, but minimal — extend the existing test, do not add a new file.**

`apps/web/e2e/navigation.spec.ts` already has a `Desktop sidebar navigation` describe block that sets the viewport to `1280x720` and clicks through every `CATEGORY_SLUGS` link via the sidebar — this already exercises reachability of all items in a real browser, which is exactly what jsdom cannot do for this bug (real box-model overflow). Rather than duplicate that setup in a new spec file, add one minimal, explicit assertion to that existing describe block:

- Set the viewport to `1280x700` (the shorter, user-specified height, to exercise the scroll-fallback path rather than only the "fits without scrolling" path already implied by the current `720`-tall test).
- Assert the last nav item's link (Water Footprint) is present and becomes visible in the sidebar (scrolling the nav into view if needed, then asserting `toBeVisible()`), before clicking it as the existing loop already does.

This keeps the addition to a few lines in a file that already covers the same feature area, rather than introducing a parallel, redundant E2E spec.

Gates for this change: lint + build + unit tests + the extended E2E assertion above (`npm run e2e` locally, full suite in CI per the standard workflow).
