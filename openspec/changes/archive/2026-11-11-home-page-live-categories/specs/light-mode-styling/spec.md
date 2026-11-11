# Spec Delta

## MODIFIED Requirements

### Requirement: Pages adapt to theme

All page components (home, category, not-found) SHALL render with appropriate background, heading, and description colors in both modes, using the secondary foreground token for descriptions and the well token for icon containers. The page title (`<h1>`) of the home and of every category page SHALL use the monospace accent style of the brand (the accent token, emerald-700 in light mode and emerald-400 in dark mode); only the home title is animated. Every other heading, including the not-found title, SHALL use the primary foreground token.

#### Scenario: Home page in light mode

- **WHEN** theme is light and user visits `/`
- **THEN** the page title is monospace in the accent token (emerald-700) and section headings are dark (primary foreground token, gray-900)
- **AND** description text is medium gray (secondary foreground token, gray-600)
- **AND** icon containers use light surface colors

#### Scenario: Category page in light mode

- **WHEN** theme is light and user visits `/[category]/`
- **THEN** the page title is monospace in the accent token (emerald-700), with no typing animation and no cursor
- **AND** description text is medium gray
- **AND** icon container uses light surface colors

#### Scenario: Page titles in dark mode

- **WHEN** theme is dark and user visits `/` or `/[category]/`
- **THEN** the page title is monospace in the accent token (emerald-400)

#### Scenario: 404 page in light mode

- **WHEN** theme is light and user visits a non-existent route
- **THEN** heading text is dark
- **AND** description text is medium gray
- **AND** icon container uses light surface colors
