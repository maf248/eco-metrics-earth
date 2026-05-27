## ADDED Requirements

### Requirement: Settings button is fixed at top-right corner
The system SHALL render a settings trigger button (gear/cog icon) fixed at the top-right of the viewport, visible on all pages, above all content (`z-50`).

#### Scenario: Button renders on every page
- **WHEN** any page loads
- **THEN** a settings button with a gear icon is visible in the top-right corner

#### Scenario: Button is above other content
- **WHEN** the page is scrolled or content overlaps the top-right area
- **THEN** the settings button remains fixed and visually above all other elements

### Requirement: Settings dropdown toggles on button click
The system SHALL display a dropdown panel below the settings button when the button is clicked. Clicking the button again, clicking outside the dropdown, or pressing the Escape key SHALL close the dropdown.

#### Scenario: Dropdown opens on click
- **WHEN** user clicks the settings button
- **THEN** a dropdown panel appears below the button

#### Scenario: Dropdown closes on second click
- **WHEN** user clicks the settings button while the dropdown is open
- **THEN** the dropdown panel closes

#### Scenario: Dropdown closes on outside click
- **WHEN** user clicks anywhere outside the dropdown panel
- **THEN** the dropdown panel closes

#### Scenario: Dropdown closes on Escape key
- **WHEN** user presses the Escape key while the dropdown is open
- **THEN** the dropdown panel closes

### Requirement: Dropdown contains a theme toggle with lamp icon
The dropdown panel SHALL contain a theme toggle row displaying a lamp icon and a label indicating the current mode (e.g., "Light mode" / "Dark mode"). Clicking the row SHALL call `toggleTheme()` from the theme system.

#### Scenario: Toggle shows light mode option when in dark mode
- **WHEN** current theme is dark and the dropdown is open
- **THEN** the toggle row displays a lamp icon and "Light mode" label

#### Scenario: Toggle shows dark mode option when in light mode
- **WHEN** current theme is light and the dropdown is open
- **THEN** the toggle row displays a lamp icon and "Dark mode" label

#### Scenario: Clicking toggle switches theme
- **WHEN** user clicks the theme toggle row
- **THEN** `toggleTheme()` is called
- **AND** the theme switches

### Requirement: Settings menu is extensible for future items
The settings dropdown SHALL be structured so that additional setting items can be added below the theme toggle without modifying the trigger button or dropdown container logic.

#### Scenario: Adding a new setting item
- **WHEN** a developer adds a new row to the dropdown children
- **THEN** it renders in the dropdown without changes to open/close logic or positioning

### Requirement: Settings menu is accessible via keyboard
The settings button SHALL be focusable and operable via keyboard. The dropdown SHALL trap focus when open and restore focus to the trigger when closed.

#### Scenario: Button is keyboard-focusable
- **WHEN** user navigates with Tab key
- **THEN** the settings button receives focus

#### Scenario: Button can be activated with Enter/Space
- **WHEN** the settings button is focused and user presses Enter or Space
- **THEN** the dropdown opens

#### Scenario: Escape closes dropdown and returns focus to button
- **WHEN** the dropdown is open and user presses Escape
- **THEN** the dropdown closes and focus returns to the settings button

### Requirement: Settings menu has intuitive, non-flashy appearance
The settings button and dropdown SHALL use subtle styling: semi-transparent background, muted colors, and modest sizing. The design SHALL NOT draw unnecessary attention while remaining discoverable.

#### Scenario: Button has subtle appearance
- **WHEN** the settings button renders
- **THEN** it uses small sizing (e.g., `w-9 h-9`) and semi-transparent background matching the nav style
- **AND** it does not pulse, glow, or animate to attract attention


### Requirement: Theme toggle has perfect accessibility
The theme toggle row inside the settings dropdown SHALL be a semantic, keyboard-operable control with proper ARIA attributes and screen reader support. It SHALL use `role="switch"` to communicate a binary on/off state, with `aria-checked="true"` in dark mode and `aria-checked="false"` in light mode. It SHALL have a descriptive `aria-label` (e.g., "Switch to light mode" / "Switch to dark mode").

#### Scenario: Toggle is announced as a switch to screen readers
- **WHEN** a screen reader encounters the theme toggle
- **THEN** it announces the role as "switch" and the current checked state
- **AND** it reads the accessible label

#### Scenario: Toggle aria-checked reflects dark mode
- **WHEN** the current theme is dark
- **THEN** the toggle element has `aria-checked="true"`
- **AND** its `aria-label` is "Switch to light mode"

#### Scenario: Toggle aria-checked reflects light mode
- **WHEN** the current theme is light
- **THEN** the toggle element has `aria-checked="false"`
- **AND** its `aria-label` is "Switch to dark mode"

#### Scenario: Toggle is keyboard-operable with Enter
- **WHEN** the toggle is focused and user presses Enter
- **THEN** `toggleTheme()` is called and the theme switches

#### Scenario: Toggle is keyboard-operable with Space
- **WHEN** the toggle is focused and user presses Space
- **THEN** `toggleTheme()` is called and the theme switches
- **AND** the default Space scroll behavior is prevented

#### Scenario: Toggle has visible focus indicator
- **WHEN** the toggle receives keyboard focus
- **THEN** a visible focus ring is displayed (e.g., `focus-visible:ring-2`)

#### Scenario: Toggle is focusable within dropdown
- **WHEN** the dropdown is open and user presses Tab
- **THEN** focus moves to the theme toggle element
