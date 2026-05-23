# E2E Mobile Navigation Tests

## ADDED Requirements

### Requirement: MobileHeader visible on small viewports
On viewport widths less than 768px, the `MobileHeader` component SHALL be visible, displaying the site logo and brand text. On viewport widths >= 768px, the header SHALL be hidden.

#### Scenario: MobileHeader visible on mobile viewport
- **WHEN** the browser is set to a mobile viewport (e.g., Pixel 5 393x851)
- **THEN** the `MobileHeader` component is visible
- **AND** the header contains the site logo
- **AND** the header contains "eco-metrics earth" brand text

#### Scenario: MobileHeader links to home page
- **WHEN** the user taps the logo or brand text in the MobileHeader
- **THEN** the browser navigates to the home page (`/`)

### Requirement: Bottom Navbar on mobile, sidebar on desktop
On viewport widths less than 768px, the Navbar SHALL render as a fixed bottom bar with horizontal scrolling. On viewport widths >= 768px, the Navbar SHALL render as a left sidebar.

#### Scenario: Bottom bar visible on mobile
- **WHEN** the browser is set to a mobile viewport
- **THEN** the navigation is rendered as a bottom bar (not a left sidebar)
- **AND** the bottom bar is fixed to the bottom of the viewport

#### Scenario: Sidebar visible on desktop
- **WHEN** the browser is set to a desktop viewport (>= 768px)
- **THEN** the navigation is rendered as a left sidebar
- **AND** the bottom bar is not visible

### Requirement: NavScrollContainer enables horizontal scroll on mobile
The Navbar on mobile SHALL wrap navigation items in a `NavScrollContainer` that supports horizontal scrolling when items overflow.

#### Scenario: Horizontal scroll container exists on mobile
- **WHEN** the browser is set to a mobile viewport
- **THEN** a horizontally scrollable container wraps the navigation items
- **AND** the container has an accessible name (role or aria-label)

#### Scenario: All 11 category + home NavLinks are reachable via scroll
- **WHEN** the browser is set to a mobile viewport
- **THEN** all 12 navigation items (Home + 11 categories) are present within the scroll container
- **AND** each item can be scrolled into view

### Requirement: Category navigation works from bottom bar on mobile
Clicking a category NavLink in the mobile bottom bar SHALL navigate to the correct category page and update `aria-current="page"`.

#### Scenario: Mobile NavLink click navigates correctly
- **WHEN** the user taps a category NavLink in the mobile bottom bar
- **THEN** the browser navigates to the correct category URL
- **AND** the tapped NavLink receives `aria-current="page"`

#### Scenario: Home NavLink active on home page (mobile)
- **WHEN** the user is on the home page in a mobile viewport
- **THEN** the home NavLink in the bottom bar has `aria-current="page"`

### Requirement: Gradient fade affordances on scroll edges
The `NavScrollContainer` on mobile SHALL display gradient fade affordances at the left and right edges when content overflows and is scrollable.

#### Scenario: Gradient affordances visible on mobile
- **WHEN** the browser is set to a mobile viewport
- **AND** the navigation items overflow horizontally
- **THEN** a gradient fade is visible at one or both edges of the scroll container
