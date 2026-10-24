# Spec Delta

## MODIFIED Requirements

### Requirement: Layout adapts to theme

The root layout SHALL server-render `<html>` with the `dark` class as the default and rely on the blocking theme script and `ThemeProvider` to remove or re-add it (see the `theme-system` capability, "No flash of incorrect theme on initial load"). The `<body>` SHALL respond to both themes with appropriate background and text colors, expressed through the page surface and primary foreground tokens (see the `design-tokens` capability).

#### Scenario: Light mode layout styling

- **WHEN** theme is light
- **THEN** `<body>` uses the page surface token (white) for its background and the primary foreground token (gray-900) for its text

#### Scenario: Dark mode layout styling

- **WHEN** theme is dark
- **THEN** `<body>` uses the same page surface token, resolving to black, and the same primary foreground token, resolving to white

### Requirement: Navbar adapts to theme

The navigation bar component SHALL render with appropriate background, border, and text colors in both light and dark modes, maintaining visual hierarchy. Each of these colors SHALL come from a semantic token, so a single class per role covers both themes.

#### Scenario: Navbar in light mode

- **WHEN** theme is light
- **THEN** Navbar background is the opaque nav surface token (light value) with the default border token (gray-200)
- **AND** inactive link text uses the secondary foreground token (gray-600)
- **AND** active link indicator uses appropriate light-mode contrast

#### Scenario: Navbar in dark mode

- **WHEN** theme is dark
- **THEN** Navbar background is the same nav surface token (dark value) with the default border token resolving to gray-800
- **AND** inactive link text uses the secondary foreground token, resolving to gray-400
- **AND** active link indicator uses the active well token, resolving to white at 15% opacity

### Requirement: Pages adapt to theme

All page components (home, category, not-found) SHALL render with appropriate background, heading, and description colors in both modes, using the primary foreground token for headings, the secondary foreground token for descriptions, and the well token for icon containers.

#### Scenario: Home page in light mode

- **WHEN** theme is light and user visits `/`
- **THEN** heading text is dark (primary foreground token, gray-900)
- **AND** description text is medium gray (secondary foreground token, gray-600)
- **AND** icon containers use light surface colors

#### Scenario: Category page in light mode

- **WHEN** theme is light and user visits `/[category]/`
- **THEN** heading text is dark
- **AND** description text is medium gray
- **AND** icon container uses light surface colors

#### Scenario: 404 page in light mode

- **WHEN** theme is light and user visits a non-existent route
- **THEN** heading text is dark
- **AND** description text is medium gray
- **AND** icon container uses light surface colors

### Requirement: Scroll gradient overlays adapt to theme

The `NavScrollContainer` component SHALL use scroll gradient overlays that start from the nav surface token, so they match the nav background in each theme.

#### Scenario: Scroll gradient in light mode

- **WHEN** theme is light and the nav content is scrollable
- **THEN** the top and bottom gradient overlays fade from the nav surface's light value to transparent

#### Scenario: Scroll gradient in dark mode

- **WHEN** theme is dark and the nav content is scrollable
- **THEN** the top and bottom gradient overlays fade from the nav surface's dark value to transparent

### Requirement: No hardcoded dark-only classes remain

Component and page files SHALL NOT contain colors that only suit one theme. All colors SHALL come from semantic tokens (see the `design-tokens` capability), so the patterns `bg-black`, `bg-black/95`, `text-white`, `bg-white/10`, `bg-white/5`, `ring-offset-black` SHALL NOT appear at all — neither alone nor as `dark:` pairs.

#### Scenario: No dark-only classes in components

- **WHEN** searching `apps/web/src/components/` for `bg-black`, `text-white`, `bg-white/10`, `bg-white/5`
- **THEN** no matches are found (icon files with hardcoded fill colors are expected and correct)
