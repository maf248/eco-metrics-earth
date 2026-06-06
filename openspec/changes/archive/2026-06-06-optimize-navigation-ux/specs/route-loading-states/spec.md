## ADDED Requirements

### Requirement: Category route shows loading skeleton during navigation
The system SHALL display a loading skeleton when navigating between the home page and any category page, or between two different category pages, via client-side `<Link>` navigation.

#### Scenario: Navigate from home to a category page
- **WHEN** user clicks a category link from the home page
- **THEN** a loading skeleton with a pulsing placeholder icon and placeholder text lines SHALL appear immediately
- **AND** the skeleton SHALL be replaced by the full category page content once the route chunk is loaded and rendered

#### Scenario: Navigate between two category pages
- **WHEN** user clicks a different category link while viewing a category page
- **THEN** a loading skeleton SHALL appear during the transition
- **AND** the previously active NavLink SHALL update to inactive
- **AND** the newly active NavLink SHALL update to active

#### Scenario: Fast navigation where page loads within one frame
- **WHEN** user navigates to a category page that loads within ~16ms (already cached/prefetched)
- **THEN** the loading skeleton MAY appear briefly or not at all (React Suspense behavior)
- **AND** the final page content SHALL render correctly regardless

### Requirement: Loading skeleton matches page layout structure
The loading skeleton SHALL mirror the structural layout of the category page to minimize layout shift when the real content replaces it.

#### Scenario: Skeleton renders with same centering and spacing
- **WHEN** the loading skeleton is displayed
- **THEN** it SHALL render a centered column layout matching the category page structure
- **AND** it SHALL include a placeholder icon area (rounded square, pulsing)
- **AND** it SHALL include placeholder text lines (pulsing rectangles) in place of the heading and subtitle

### Requirement: Loading skeleton uses the main-content landmark
The loading skeleton SHALL include `id="main-content"` on its root element so that skip-to-content links work correctly during navigation transitions.

#### Scenario: Skip-to-content focuses the skeleton
- **WHEN** user activates the skip-to-content link during a route transition
- **THEN** focus SHALL move to the loading skeleton's root element
