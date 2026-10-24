## ADDED Requirements

### Requirement: Site footer in the root layout

The root layout SHALL render a `Footer` component (`apps/web/src/components/Footer.tsx`) as a semantic `<footer>` element (landmark `contentinfo`) inside the existing content wrapper (`pb-20 lg:pb-0 lg:pl-76`), immediately after `{children}`. The footer SHALL be in normal document flow (not `fixed`, not `sticky`), so it appears at the end of the scroll: on mobile above the fixed bottom nav (the wrapper's `pb-20` clears it) and on desktop below the content and to the right of the sidebar (the wrapper's `lg:pl-76` offsets it). It SHALL NOT be a descendant of `<main>`.

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

### Requirement: Footer content and styling

The footer SHALL follow the terminal style of the site brand and contain: the site logo (decorative) with the brand text `~ eco-metrics.earth`; the tagline "Environmental data, made readable."; a single link to `/data-sources/` whose visible text is `data-sources/` after a decorative, `aria-hidden` `$ cd` prompt, with accessible name "Data sources"; and the line "© 2026 eco-metrics earth · by maf248". It SHALL contain no other content. It SHALL use only design-system color tokens (e.g. `border-line`, `text-fg-secondary`, `text-accent`, `hover:text-accent-hover`), render correctly in light and dark themes, show an underline on the link (not color alone), and use the project focus-visible ring pattern (`focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset`). The text/link contrast SHALL pass axe color-contrast in both themes.

#### Scenario: Link to the data sources page

- **WHEN** the footer is rendered
- **THEN** it contains a link named "Data sources" whose `href` ends with `/data-sources/`

#### Scenario: Brand, tagline and signature

- **WHEN** the footer is rendered
- **THEN** it shows `~ eco-metrics.earth`, "Environmental data, made readable." and "© 2026 eco-metrics earth · by maf248"
- **AND** the `$ cd` prompt is `aria-hidden`

#### Scenario: Only one interactive element

- **WHEN** the footer is rendered
- **THEN** it contains exactly one link and no other interactive elements

#### Scenario: Keyboard focus is visible

- **WHEN** the link receives keyboard focus
- **THEN** it shows the focus ring classes of the project pattern

#### Scenario: Only tokens

- **WHEN** `designTokens.test.ts` runs
- **THEN** it passes with `Footer.tsx` included (no palette or arbitrary colors)

### Requirement: Footer does not break existing layout contracts

Adding the footer SHALL NOT change the `pb-20 lg:pb-0 lg:pl-76` offsets, the `NAV_ITEMS` navigation, the skip link target (`#main-content`), or the `<main>` landmark of any page.

#### Scenario: Layout offsets intact

- **WHEN** the root layout is rendered
- **THEN** the content wrapper still has `pb-20`, `lg:pb-0` and `lg:pl-76`, and contains both the page children and the footer

#### Scenario: Axe audit with footer

- **WHEN** the E2E accessibility spec audits the home page, a category page and `/data-sources/`
- **THEN** there are zero critical and serious violations
