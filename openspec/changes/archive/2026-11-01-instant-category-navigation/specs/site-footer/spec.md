# Spec Delta

## MODIFIED Requirements

### Requirement: Site footer in the root layout

The root layout SHALL render a `Footer` component (`apps/web/src/components/Footer.tsx`) as a semantic `<footer>` element (landmark `contentinfo`) inside the existing content wrapper (`pb-20 lg:pb-0 lg:pl-76`), immediately after the `<main>` that holds `{children}`. The footer SHALL be in normal document flow (not `fixed`, not `sticky`), so it appears at the end of the scroll: on mobile above the fixed bottom nav (the wrapper's `pb-20` clears it) and on desktop below the content and to the right of the sidebar (the wrapper's `lg:pl-76` offsets it). It SHALL NOT be a descendant of `<main>`.

#### Scenario: Footer is a contentinfo landmark on every page

- **WHEN** any page (home, a category page, `/data-sources/`, the 404 page) is rendered
- **THEN** exactly one element with role `contentinfo` exists
- **AND** it is not inside `<main>`

#### Scenario: Footer is in document flow

- **WHEN** the footer's computed `position` is read
- **THEN** it is neither `fixed` nor `sticky`

#### Scenario: Mobile clearance above the bottom nav

- **GIVEN** a viewport narrower than `lg` scrolled to the bottom
- **WHEN** the page is inspected
- **THEN** the footer is fully visible and not overlapped by the fixed bottom nav

#### Scenario: Desktop offset beside the sidebar

- **GIVEN** a viewport `lg` or wider
- **WHEN** the footer is measured
- **THEN** its left edge is at or beyond the sidebar's right edge (304 px)
