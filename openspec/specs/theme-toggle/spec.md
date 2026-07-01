# theme-toggle Specification

## Purpose
TBD - created by archiving change add-light-mode-support. Update Purpose after archive.
## Requirements
### Requirement: Theme toggle button is fixed at top-right corner
The system SHALL render a single theme toggle button fixed at the top-right of the viewport, visible on all pages, above all content (`z-50`).

#### Scenario: Button renders on every page
- **WHEN** any page loads
- **THEN** a theme toggle button is visible in the top-right corner

#### Scenario: Button is above other content
- **WHEN** the page is scrolled or content overlaps the top-right area
- **THEN** the toggle button remains fixed and visually above all other elements

### Requirement: Clicking the button toggles the theme
The button SHALL call `toggleTheme()` from the theme system on click, switching the application between light and dark mode.

#### Scenario: Clicking toggles from dark to light
- **WHEN** the current theme is dark and the user clicks the button
- **THEN** `toggleTheme()` is called and the theme switches to light

#### Scenario: Clicking toggles from light to dark
- **WHEN** the current theme is light and the user clicks the button
- **THEN** `toggleTheme()` is called and the theme switches to dark

### Requirement: Button uses a lamp icon that reflects the current theme
The button SHALL display a lamp/lightbulb icon whose appearance is driven by CSS `dark:` variants: a lit, warm-toned lamp in light mode and a dimmed, muted lamp in dark mode. The appearance SHALL be correct from the first frame (see zero-flash initialization in the theme-system spec), without waiting for React hydration.

#### Scenario: Lamp appears lit in light mode
- **WHEN** the current theme is light
- **THEN** the lamp icon renders in its warm/lit style

#### Scenario: Lamp appears dimmed in dark mode
- **WHEN** the current theme is dark
- **THEN** the lamp icon renders in its muted/unlit style

### Requirement: Toggle button is accessible via keyboard
The toggle SHALL be a native `<button>` element with a descriptive `aria-label` for the action it performs. It SHALL be keyboard-focusable and operable via Enter and Space, and SHALL show a visible focus indicator when focused.

#### Scenario: Button is keyboard-focusable
- **WHEN** the user navigates with the Tab key
- **THEN** the toggle button receives focus

#### Scenario: Button can be activated with Enter or Space
- **WHEN** the button is focused and the user presses Enter or Space
- **THEN** the theme toggles

#### Scenario: Button exposes a descriptive accessible label
- **WHEN** a screen reader encounters the button
- **THEN** it announces a label describing the toggle action (e.g., "Toggle light/dark mode")

#### Scenario: Button has a visible focus indicator
- **WHEN** the button receives keyboard focus
- **THEN** a visible focus ring is displayed (`focus-visible:ring-2`)

### Requirement: Toggle has a subtle, non-flashy appearance
The button SHALL use subtle styling: a small circular control (`w-10 h-10`) with a semi-transparent background matching the nav style. It SHALL NOT pulse, glow, or animate to attract attention beyond the smooth theme transition.

#### Scenario: Button has subtle appearance
- **WHEN** the toggle button renders
- **THEN** it uses small circular sizing and a semi-transparent background
- **AND** it does not pulse or animate to attract attention

