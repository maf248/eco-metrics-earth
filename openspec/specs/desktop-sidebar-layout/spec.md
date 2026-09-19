# desktop-sidebar-layout Specification

## Purpose

Defines how the desktop sidebar fits its content: single-line brand, width matched by the content offset, and a bounded, scrollable nav list that keeps every item reachable.

## Requirements

### Requirement: Desktop sidebar brand text renders on a single line

The brand text rendered by `BrandText` (`~ eco-metrics.earth`) SHALL NOT line-wrap under any of its usage contexts (the desktop `Navbar` sidebar brand link and the `MobileHeader` brand link). The desktop sidebar SHALL be wide enough (`lg:w-76`, 304px) to display the logo icon, the full brand text, the cursor, and the `[↵]` affordance on one line without clipping or overflow.

#### Scenario: Brand text does not wrap on the desktop sidebar

- **GIVEN** the viewport is at or above the `lg` breakpoint (1024px)
- **WHEN** the `Navbar` desktop sidebar brand link renders `BrandText`
- **THEN** the brand text span has a non-wrapping style (`whitespace-nowrap`)
- **AND** the text `~ eco-metrics.earth` occupies a single line, not two

#### Scenario: Brand text does not wrap on the mobile header

- **GIVEN** the viewport is below the `lg` breakpoint
- **WHEN** `MobileHeader` renders `BrandText`
- **THEN** the brand text is unaffected by the non-wrapping style change (already renders on one line) and the header's accessible name, animation, and layout are unchanged

#### Scenario: Sidebar width matches the content offset

- **GIVEN** the desktop sidebar is rendered with width `lg:w-76`
- **WHEN** the root layout renders the page content wrapper
- **THEN** the content wrapper uses `lg:pl-76` so page content is not obscured by the sidebar

### Requirement: Desktop sidebar reaches all nav items via a bounded, scrollable list

The desktop sidebar SHALL keep the brand link pinned at a fixed height at the top and allocate the remaining vertical space to the nav item list. The list container SHALL be bounded by the sidebar's `h-screen` height (via `flex-1 lg:min-h-0` on its wrapper and `lg:min-h-0` on the `<ul>`) so that when the items' total height exceeds the available space, the `<ul>`'s existing `lg:overflow-y-auto` scrolls the list within the sidebar instead of the content overflowing the fixed nav off-screen. Desktop nav item rows SHALL use `lg:py-2` (reduced from `lg:py-3`) so that, on typical desktop viewport heights (approximately 700px or more), all items are visible without needing to scroll; shorter viewports or increased browser zoom SHALL still be able to reach every item via scrolling.

#### Scenario: Last nav item is reachable via scroll on a short viewport

- **GIVEN** the desktop sidebar is rendered with all `NAV_ITEMS` and the viewport height is short enough that the list's content height exceeds the space remaining below the brand link
- **WHEN** a user scrolls the nav item list
- **THEN** the last nav item (Water Footprint) becomes visible within the sidebar
- **AND** the brand link remains pinned at the top of the sidebar throughout the scroll

#### Scenario: All items fit without scrolling on a typical desktop viewport

- **GIVEN** the desktop sidebar is rendered with all `NAV_ITEMS` at `lg:py-2` row density and a viewport height of approximately 700px or more
- **WHEN** the sidebar renders
- **THEN** every nav item, including the last one, is visible without requiring the list to scroll

#### Scenario: Nav list wrapper no longer grows past the sidebar height

- **GIVEN** the desktop sidebar wrapper around the nav list
- **WHEN** the nav list's content is taller than the space available below the brand link
- **THEN** the wrapper does not grow past the sidebar's `h-screen` height (it is bounded via `flex-1 lg:min-h-0`, not `lg:flex-none lg:overflow-visible`)
