## ADDED Requirements

### Requirement: Layout adapts to theme
The root layout SHALL remove the static `className="dark"` attribute and instead rely on the `ThemeProvider` to manage the `dark` class dynamically. The `<body>` SHALL respond to both themes with appropriate background and text colors.

#### Scenario: Light mode layout styling
- **WHEN** theme is light
- **THEN** `<body>` has a light background (e.g., `bg-white`) and dark text (e.g., `text-gray-900`)

#### Scenario: Dark mode layout styling
- **WHEN** theme is dark
- **THEN** `<body>` has a dark background (e.g., `bg-black`) and light text (e.g., `text-white`)

### Requirement: Navbar adapts to theme
The navigation bar component SHALL render with appropriate background, border, and text colors in both light and dark modes, maintaining visual hierarchy.

#### Scenario: Navbar in light mode
- **WHEN** theme is light
- **THEN** Navbar background is opaque light (e.g., `bg-white border-gray-200`)
- **AND** inactive link text is `text-gray-600`
- **AND** active link indicator uses appropriate light-mode contrast

#### Scenario: Navbar in dark mode
- **WHEN** theme is dark
- **THEN** Navbar background is semi-transparent (current behavior: `bg-white/10 border-gray-800`)
- **AND** inactive link text is `text-gray-400`
- **AND** active link indicator uses `bg-white/15`

### Requirement: Pages adapt to theme
All page components (home, category, not-found) SHALL render with appropriate background, heading, and description colors in both modes.

#### Scenario: Home page in light mode
- **WHEN** theme is light and user visits `/`
- **THEN** heading text is dark (`text-gray-900`)
- **AND** description text is medium gray (`text-gray-600`)
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

### Requirement: Eco-category icons retain original colors
Eco-category icon components in `components/icons/` SHALL retain their original hardcoded colors (greens, blues, reds, grays) as they are part of the visual identity for each environmental category. Only new UI control icons (`SettingsIcon`, `LightBulbIcon`) SHALL use `currentColor` for monochrome theming.

#### Scenario: Eco icons preserve brand colors
- **WHEN** an eco-category icon (e.g., `WasteRecyclingIcon`, `GlobalTemperatureIcon`) renders
- **THEN** it displays its original multi-colored design using hardcoded fill values
- **AND** the colors are visible and distinguishable on both light and dark backgrounds

#### Scenario: UI control icons use currentColor
- **WHEN** `SettingsIcon` or `LightBulbIcon` renders inside a parent with `text-emerald-400`
- **THEN** the icon renders in emerald-400 color via `currentColor` inheritance

### Requirement: Scroll gradient overlays adapt to theme
The `NavScrollContainer` component SHALL use scroll gradient overlays that match the background color in each theme.

#### Scenario: Scroll gradient in light mode
- **WHEN** theme is light and the nav content is scrollable
- **THEN** the top and bottom gradient overlays fade from white to transparent

#### Scenario: Scroll gradient in dark mode
- **WHEN** theme is dark and the nav content is scrollable
- **THEN** the top and bottom gradient overlays fade from black to transparent

### Requirement: No hardcoded dark-only classes remain
After implementation, a search for hardcoded dark-only patterns (`bg-black`, `bg-black/95`, `text-white`, `bg-white/10`, `bg-white/5`, `ring-offset-black`) in component and page files SHALL yield zero results — all such classes SHALL be paired with `dark:` variants or replaced with theme-agnostic equivalents.

#### Scenario: No dark-only classes in components
- **WHEN** searching `apps/web/src/components/` for `bg-black`, `text-white`, `bg-white/10`, `bg-white/5`
- **THEN** no matches are found (icon files with hardcoded fill colors are expected and correct)
